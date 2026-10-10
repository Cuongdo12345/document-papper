// services/itDevices/softwareLicense.service.ts
//
// DEV-116 (tách module Tài sản, Giai đoạn 5) — danh mục bản quyền phần mềm + gán cho máy CNTT.
//
// QUY TẮC SỐ SLOT (R6): `assets.length <= totalSeats` luôn đúng, kể cả khi nhiều request gán đồng thời vào slot cuối.
// Gán = MỘT lệnh cập nhật có điều kiện (`$addToSet` kèm điều kiện `$size(assets) < totalSeats` trong CÙNG filter), không
// đọc-rồi-ghi (cùng bài học BR-14). Hạ `totalSeats` cũng kiểm bằng điều kiện trong filter. Khi lệnh không khớp mới đọc lại
// để báo đúng lý do.
//
// KHÔNG lưu khoá bản quyền (Q-A2).

import fs from "fs";
import mongoose, { Types } from "mongoose";
import { SoftwareLicense } from "../../models/itDevices/softwareLicense.model";
import { Asset, AssetStatus } from "../../models/assets/asset.model";
import { Vendor } from "../../models/vendors/vendor.model";
import { Upload } from "../../models/uploadFiles/upload.model";
import { AssetType } from "../../interfaces/assets/asset.interface";
import { ISoftwareLicense, SoftwareLicenseType } from "../../interfaces/itDevices/softwareLicense.interface";
import ApiError from "../../shared/errors/ApiError";
import { escapeRegex } from "../../shared/utils/regex.util";
import { withTransaction } from "../../shared/utils/withTransaction";
import { resolveUploadedFilePath } from "../../shared/utils/uploadStorage.util";
import { resolveAssetType } from "../assets/assetType.helper";

const LICENSE_POPULATE = [
  { path: "vendor", select: "name" },
  { path: "assets", select: "assetCode name status department isActive" },
];

const NOT_FOUND = "Không tìm thấy bản quyền phần mềm";

/** Thông tin số slot / hết hạn tính từ dữ liệu, không lưu. */
const decorate = (doc: any) => {
  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const usedSeats = (plain.assets ?? []).length;
  return {
    ...plain,
    usedSeats,
    freeSeats: Math.max(plain.totalSeats - usedSeats, 0),
    isExpired: !!plain.expiresAt && new Date(plain.expiresAt) < new Date(),
  };
};

const assertValidId = (id: any, label = "ID bản quyền") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest(`${label} không hợp lệ`);
  }
};

const assertVendorExists = async (vendorId: any) => {
  if (!(await Vendor.exists({ _id: vendorId }))) {
    throw ApiError.badRequest("Nhà cung cấp không tồn tại");
  }
};

/** Quy tắc loại bản quyền ↔ ngày hết hạn, kiểm trên trạng thái SAU khi gộp (dùng cho cả tạo và sửa). */
const assertLicenseTypeRules = (state: { licenseType: SoftwareLicenseType; expiresAt?: Date | null; purchaseDate?: Date | null }) => {
  if (state.licenseType === SoftwareLicenseType.SUBSCRIPTION && !state.expiresAt) {
    throw ApiError.badRequest("Bản quyền thuê bao phải có ngày hết hạn");
  }
  if (state.licenseType === SoftwareLicenseType.PERPETUAL && state.expiresAt) {
    throw ApiError.badRequest("Bản quyền vĩnh viễn không có ngày hết hạn");
  }
  if (state.purchaseDate && state.expiresAt && state.expiresAt <= state.purchaseDate) {
    throw ApiError.badRequest("Ngày hết hạn phải sau ngày mua");
  }
};

export const createSoftwareLicenseService = async (payload: any, userId?: any) => {
  if (payload.vendor) await assertVendorExists(payload.vendor);
  assertLicenseTypeRules(payload);

  const license = await SoftwareLicense.create({
    ...payload,
    // Không cho client đặt: danh sách máy chỉ đổi qua gán/gỡ; cảnh báo do cron quản lý.
    assets: [],
    expiryAlertSentAt: null,
    isActive: true,
    createdBy: userId,
    updatedBy: userId,
  });
  return decorate(await license.populate(LICENSE_POPULATE));
};

export const getAllSoftwareLicensesService = async (query: any) => {
  const { keyword, licenseType, isActive, asset, expiringWithinDays, page = 1, limit = 10, sortBy = "softwareName", order = "asc" } = query;

  const filter: any = { isActive: isActive === undefined ? true : isActive };
  if (keyword) {
    const safe = escapeRegex(keyword);
    filter.$or = [{ softwareName: { $regex: safe, $options: "i" } }, { contractOrOrderNumber: { $regex: safe, $options: "i" } }];
  }
  if (licenseType) filter.licenseType = licenseType;
  if (asset) filter.assets = new Types.ObjectId(asset);
  if (expiringWithinDays) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + Number(expiringWithinDays));
    filter.expiresAt = { $lte: threshold };
  }

  const pageNumber = Math.max(parseInt(page, 10), 1);
  const pageSize = Math.max(parseInt(limit, 10), 1);
  const [rows, total] = await Promise.all([
    SoftwareLicense.find(filter)
      .populate("vendor", "name")
      .sort({ [sortBy]: order === "desc" ? -1 : 1, _id: 1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    SoftwareLicense.countDocuments(filter),
  ]);

  return {
    // Danh sách chỉ trả số máy, không trả mảng id máy (có thể rất dài); xem chi tiết để lấy danh sách máy.
    data: rows.map((r: any) => {
      const { assets: _assets, ...rest } = decorate(r);
      return rest;
    }),
    pagination: { page: pageNumber, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

export const getSoftwareLicenseByIdService = async (id: any) => {
  assertValidId(id);
  const license = await SoftwareLicense.findById(id).populate(LICENSE_POPULATE);
  if (!license) throw ApiError.notFound(NOT_FOUND);
  return decorate(license);
};

export const updateSoftwareLicenseService = async (id: any, payload: any, userId?: any) => {
  assertValidId(id);
  const current = await SoftwareLicense.findOne({ _id: id, isActive: true });
  if (!current) throw ApiError.notFound(NOT_FOUND);

  const merged = {
    licenseType: payload.licenseType ?? current.licenseType,
    expiresAt: "expiresAt" in payload ? payload.expiresAt : current.expiresAt,
    purchaseDate: "purchaseDate" in payload ? payload.purchaseDate : current.purchaseDate,
  };
  assertLicenseTypeRules(merged);
  if (payload.vendor) await assertVendorExists(payload.vendor);

  const $set: Record<string, unknown> = { updatedBy: userId };
  const $unset: Record<string, ""> = {};
  for (const key of ["softwareName", "edition", "version", "licenseType", "totalSeats", "purchaseDate", "expiresAt", "vendor", "contractOrOrderNumber"]) {
    if (!(key in payload) || payload[key] === undefined) continue;
    if (payload[key] === null) $unset[key] = "";
    else $set[key] = payload[key];
  }
  // Đổi hạn thì cho cron cảnh báo lại từ đầu cho hạn mới (cùng pattern bảo hành/hợp đồng).
  if ("expiresAt" in payload) $set.expiryAlertSentAt = null;

  const filter: any = { _id: id, isActive: true };
  // Hạ số máy tối đa không được thấp hơn số máy đang dùng — kiểm nguyên tử trong chính lệnh cập nhật.
  if (payload.totalSeats !== undefined) filter.$expr = { $lte: [{ $size: "$assets" }, payload.totalSeats] };

  const update: any = { $set };
  if (Object.keys($unset).length) update.$unset = $unset;

  const updated = await SoftwareLicense.findOneAndUpdate(filter, update, { returnDocument: "after", runValidators: true }).populate(LICENSE_POPULATE);
  if (!updated) {
    const exists = await SoftwareLicense.findOne({ _id: id, isActive: true }).select("assets").lean();
    if (!exists) throw ApiError.notFound(NOT_FOUND);
    throw ApiError.badRequest(`Số máy tối đa (${payload.totalSeats}) không được nhỏ hơn số máy đang dùng (${exists.assets.length})`);
  }
  return decorate(updated);
};

export const deleteSoftwareLicenseService = async (id: any, userId?: any) => {
  assertValidId(id);
  const result = await SoftwareLicense.updateOne(
    { _id: id, isActive: true },
    { isActive: false, deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
  );
  if (result.matchedCount === 0) throw ApiError.notFound(NOT_FOUND);
  return true;
};

export const restoreSoftwareLicenseService = async (id: any, userId?: any) => {
  assertValidId(id);
  const restored = await SoftwareLicense.findOneAndUpdate(
    { _id: id, isActive: false },
    { isActive: true, $unset: { deletedAt: "", deletedBy: "" }, updatedBy: userId },
    { returnDocument: "after" },
  ).populate(LICENSE_POPULATE);
  if (!restored) throw ApiError.notFound(NOT_FOUND);
  return decorate(restored);
};

/**
 * Gán máy vào bản quyền. Điều kiện nguyên tử `slot còn trống` + `máy chưa được gán` nằm trong filter của MỘT lệnh
 * `findOneAndUpdate`; hai request đồng thời vào slot cuối: đúng một bên thành công.
 */
export const assignAssetToLicenseService = async (licenseId: any, assetId: any, userId?: any) => {
  assertValidId(licenseId);
  assertValidId(assetId, "ID tài sản");

  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) throw ApiError.notFound("Không tìm thấy tài sản");
  if ((await resolveAssetType(asset)) !== AssetType.IT) {
    throw ApiError.badRequest("Chỉ gán được bản quyền phần mềm cho thiết bị CNTT");
  }
  if (asset.status === AssetStatus.DISPOSED || asset.status === AssetStatus.LOST) {
    throw ApiError.badRequest("Không gán bản quyền cho tài sản đã thanh lý hoặc đã mất");
  }

  const updated = await SoftwareLicense.findOneAndUpdate(
    {
      _id: licenseId,
      isActive: true,
      assets: { $ne: asset._id },
      $expr: { $lt: [{ $size: "$assets" }, "$totalSeats"] },
    },
    { $addToSet: { assets: asset._id }, $set: { updatedBy: userId } },
    { returnDocument: "after" },
  ).populate(LICENSE_POPULATE);
  if (updated) return decorate(updated);

  // Không khớp: đọc lại để báo đúng lý do.
  const license = await SoftwareLicense.findById(licenseId).select("isActive assets totalSeats").lean();
  if (!license || !license.isActive) throw ApiError.notFound(NOT_FOUND);
  if (license.assets.some((a) => String(a) === String(asset._id))) {
    throw ApiError.badRequest("Máy này đã được gán bản quyền này");
  }
  throw ApiError.badRequest(`Bản quyền đã hết số máy được cài (${license.assets.length}/${license.totalSeats})`);
};

export const unassignAssetFromLicenseService = async (licenseId: any, assetId: any, userId?: any) => {
  assertValidId(licenseId);
  assertValidId(assetId, "ID tài sản");

  const updated = await SoftwareLicense.findOneAndUpdate(
    { _id: licenseId, isActive: true, assets: assetId },
    { $pull: { assets: assetId }, $set: { updatedBy: userId } },
    { returnDocument: "after" },
  ).populate(LICENSE_POPULATE);
  if (updated) return decorate(updated);

  const license = await SoftwareLicense.findOne({ _id: licenseId, isActive: true }).select("_id").lean();
  if (!license) throw ApiError.notFound(NOT_FOUND);
  throw ApiError.badRequest("Máy này chưa được gán bản quyền này");
};

/* =========================================================================
   CHỨNG TỪ (proof file) — mirror giấy chứng nhận hiệu chuẩn: file nằm ở Upload, tải qua endpoint có quyền.
========================================================================= */

export const setLicenseProofFileService = async (licenseId: any, file: Express.Multer.File | undefined, userId?: any) => {
  if (!file) throw ApiError.badRequest("Vui lòng chọn file chứng từ (trường proofFile)");

  let committed = false;
  try {
    assertValidId(licenseId);
    const license = await SoftwareLicense.findOne({ _id: licenseId, isActive: true });
    if (!license) throw ApiError.notFound(NOT_FOUND);
    const oldProofFileId = license.proofFileId;

    const updated = await withTransaction(async (session) => {
      const [uploadDoc] = await Upload.create(
        [
          {
            fileName: file.originalname,
            fileUrl: `/uploads/${file.filename}`,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedBy: userId,
            isUsed: true,
          },
        ],
        { session },
      );
      license.proofFileId = uploadDoc._id as Types.ObjectId;
      license.updatedBy = userId;
      await license.save({ session });
      // Soft-delete file cũ (cùng semantics deleteFile: không xoá file vật lý).
      if (oldProofFileId) await Upload.updateOne({ _id: oldProofFileId }, { isDeleted: true }, { session });
      return license;
    });
    committed = true;
    return decorate(await updated.populate(LICENSE_POPULATE));
  } catch (error) {
    if (!committed) {
      fs.unlink(file.path, (err) => {
        if (err) console.error(`[softwareLicense] Không xoá được file mồ côi "${file.path}":`, err);
      });
    }
    throw error;
  }
};

export const getLicenseProofFileService = async (licenseId: any) => {
  assertValidId(licenseId);
  const license = await SoftwareLicense.findById(licenseId).select("proofFileId").lean();
  if (!license) throw ApiError.notFound(NOT_FOUND);
  if (!license.proofFileId) throw ApiError.notFound("Bản quyền này chưa đính kèm chứng từ");

  const upload = await Upload.findById(license.proofFileId);
  if (!upload || upload.isDeleted) throw ApiError.notFound("File chứng từ không còn tồn tại");
  if (!upload.fileUrl || !upload.fileName) throw ApiError.notFound("File thiếu dữ liệu, không thể tải");

  const filePath = resolveUploadedFilePath(upload.fileUrl);
  if (!fs.existsSync(filePath)) throw ApiError.notFound("File không còn tồn tại trên server");
  return { filePath, fileName: upload.fileName as string };
};

export type SoftwareLicenseView = ReturnType<typeof decorate>;
export type { ISoftwareLicense };
