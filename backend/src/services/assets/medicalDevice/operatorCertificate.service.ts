// services/assets/medicalDevice/operatorCertificate.service.ts
//
// MODULE MỚI (DEV-077) — xem `interfaces/assets/operatorCertificate.interface.ts`.

import mongoose from "mongoose";
import { OperatorCertificate } from "../../../models/assets/operatorCertificate.model";
import { MedicalDeviceProfile } from "../../../models/assets/medicalDeviceProfile.model";
import { AssetCategory } from "../../../models/assets/assetCategory.model";
import { User } from "../../../models/users/user.model";
import ApiError from "../../../shared/errors/ApiError";

const CERTIFICATE_POPULATE = [
  { path: "user", select: "username fullName email" },
  { path: "deviceCategory", select: "code name" },
  { path: "recordedBy", select: "username fullName" },
];

/**
 * 📌 CREATE — cấp chứng chỉ vận hành mới cho 1 user + 1 danh mục thiết bị.
 * APPEND-ONLY: gia hạn/cấp lại = gọi lại hàm này, KHÔNG sửa bản ghi cũ.
 */
export const createOperatorCertificateService = async (
  payload: {
    user: string;
    deviceCategory: string;
    certificateNumber?: string;
    issuedAt: Date;
    expiresAt: Date;
  },
  recordedBy?: any,
) => {
  const user = await User.findOne({ _id: payload.user, isActive: true });
  if (!user) {
    throw ApiError.badRequest("Người dùng không tồn tại hoặc đã bị khoá");
  }

  const category = await AssetCategory.findOne({
    _id: payload.deviceCategory,
    isActive: true,
  });
  if (!category) {
    throw ApiError.badRequest("Danh mục thiết bị không tồn tại");
  }

  const certificate = await OperatorCertificate.create({
    user: payload.user,
    deviceCategory: payload.deviceCategory,
    certificateNumber: payload.certificateNumber,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    recordedBy,
  });

  return certificate.populate(CERTIFICATE_POPULATE);
};

/** 📌 LIST — lịch sử chứng chỉ, filter theo user/deviceCategory/còn hạn hay không, phân trang. */
export const getOperatorCertificatesService = async (query: any) => {
  const { page = 1, limit = 20, user, deviceCategory, validOnly } = query;

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNumber - 1) * pageSize;

  const filter: Record<string, unknown> = {};
  if (user) filter.user = user;
  if (deviceCategory) filter.deviceCategory = deviceCategory;
  // [SỬA DEV-078] "Còn hạn" nay phải VỪA chưa hết hạn VỪA chưa bị thu hồi/xoá
  // — trước đây chỉ check `expiresAt`, giờ thêm `isActive` (mặc định
  // `true` cho bản ghi cũ chưa từng bị đụng tới).
  if (validOnly) {
    filter.expiresAt = { $gt: new Date() };
    filter.isActive = true;
  }

  const [certificates, total] = await Promise.all([
    OperatorCertificate.find(filter)
      .populate(CERTIFICATE_POPULATE)
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(pageSize),
    OperatorCertificate.countDocuments(filter),
  ]);

  return {
    data: certificates,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 📌 Danh sách user hiện ĐANG có chứng chỉ hợp lệ (chưa hết hạn) cho 1 danh
 * mục thiết bị — dùng cho FE picker khi cấp phát/chuyển giao thiết bị yêu
 * cầu chứng chỉ. Dedupe theo user (1 user có thể có nhiều bản ghi lịch sử
 * còn hạn nếu được cấp lại sớm — chỉ cần liệt kê 1 lần, giữ bản ghi mới
 * nhất/hạn xa nhất).
 */
export const getCertifiedUsersForCategoryService = async (
  deviceCategoryId: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(deviceCategoryId)) {
    throw ApiError.badRequest("ID danh mục thiết bị không hợp lệ");
  }

  const certificates = await OperatorCertificate.find({
    deviceCategory: deviceCategoryId,
    expiresAt: { $gt: new Date() },
    isActive: true, // [MỚI DEV-078] loại bản ghi đã bị thu hồi/xoá dù chưa hết hạn tự nhiên
  })
    .populate({ path: "user", select: "username fullName email isActive" })
    .sort({ expiresAt: -1 });

  const seen = new Set<string>();
  const result: (typeof certificates)[number][] = [];
  for (const cert of certificates) {
    const u = cert.user as any;
    if (!u || u.isActive === false) continue;
    const key = String(u._id);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cert);
  }

  return result;
};

/**
 * 📌 Helper THUẦN (không throw) — user có chứng chỉ hợp lệ cho danh mục hay
 * không. Dùng bởi `assertOperatorCertifiedIfRequired` bên dưới.
 */
export const hasValidOperatorCertificateService = async (
  userId: any,
  deviceCategoryId: any,
): Promise<boolean> => {
  const exists = await OperatorCertificate.exists({
    user: userId,
    deviceCategory: deviceCategoryId,
    expiresAt: { $gt: new Date() },
    isActive: true, // [MỚI DEV-078]
  });
  return !!exists;
};

/**
 * 📌 [MỚI DEV-078] "Sửa" — CHỈ cho phép sửa `certificateNumber` (lỗi chính
 * tả). KHÔNG cho sửa `issuedAt`/`expiresAt`/`user`/`deviceCategory` — muốn
 * đổi ngày/người/danh mục phải thu hồi bản ghi này rồi cấp bản ghi MỚI, giữ
 * đúng lịch sử thời gian thật (tinh thần append-only gốc). Cho phép sửa kể
 * cả bản ghi đã bị thu hồi/xoá (chỉ là chỉnh lại dữ liệu định danh, không
 * ảnh hưởng tính "hợp lệ").
 */
export const updateOperatorCertificateService = async (
  id: any,
  certificateNumber: string,
) => {
  const certificate = await OperatorCertificate.findById(id);
  if (!certificate) {
    throw ApiError.notFound("Không tìm thấy chứng chỉ vận hành");
  }

  certificate.certificateNumber = certificateNumber || undefined;
  await certificate.save();

  return certificate.populate(CERTIFICATE_POPULATE);
};

/**
 * 📌 [MỚI DEV-078] "Thu hồi" — chứng chỉ TỪNG hợp lệ nhưng bị rút giữa
 * chừng (cơ quan cấp rút, vi phạm...). BẮT BUỘC lý do — khác `delete` bên
 * dưới. Không cho thu hồi 2 lần / thu hồi bản ghi đã bị xoá.
 */
export const revokeOperatorCertificateService = async (
  id: any,
  reason: string,
  revokedBy?: any,
) => {
  const certificate = await OperatorCertificate.findById(id);
  if (!certificate) {
    throw ApiError.notFound("Không tìm thấy chứng chỉ vận hành");
  }
  if (!certificate.isActive) {
    throw ApiError.badRequest("Chứng chỉ này đã bị thu hồi hoặc xoá trước đó");
  }

  certificate.isActive = false;
  certificate.revokedAt = new Date();
  certificate.revokedBy = revokedBy;
  certificate.revokedReason = reason;
  await certificate.save();

  return certificate.populate(CERTIFICATE_POPULATE);
};

/**
 * 📌 [MỚI DEV-078] "Xoá" (mềm) — CHỈ dùng cho lỗi nhập liệu hoàn toàn, KHÔNG
 * bắt buộc lý do (khác `revoke` ở trên). Giữ lại bản ghi trong DB để tra
 * soát/thanh tra sau này — KHÔNG xoá cứng khỏi collection.
 */
export const deleteOperatorCertificateService = async (
  id: any,
  deletedBy?: any,
) => {
  const certificate = await OperatorCertificate.findById(id);
  if (!certificate) {
    throw ApiError.notFound("Không tìm thấy chứng chỉ vận hành");
  }
  if (!certificate.isActive) {
    throw ApiError.badRequest("Chứng chỉ này đã bị thu hồi hoặc xoá trước đó");
  }

  certificate.isActive = false;
  certificate.deletedAt = new Date();
  certificate.deletedBy = deletedBy;
  await certificate.save();

  return certificate;
};

/**
 * 📌 GUARD — gọi từ `assetAssignment.service.ts` (`assignAssetService`/
 * `transferAssetService`) TRƯỚC khi gán/chuyển giao thiết bị cho 1 user cụ
 * thể. Chỉ chặn khi CẢ 2 điều kiện đúng: (1) thiết bị có
 * `MedicalDeviceProfile.operatorCertificateRequired = true`; (2) user được
 * chọn KHÔNG có chứng chỉ hợp lệ cho `asset.category`. Không có
 * `toUserId` (gán cho khoa/phòng, chưa gắn cá nhân) → bỏ qua hoàn toàn,
 * không có "người vận hành" nào để kiểm tra.
 */
export const assertOperatorCertifiedIfRequired = async (
  asset: { _id: any; category: any },
  toUserId: any,
): Promise<void> => {
  if (!toUserId) return;

  const profile = await MedicalDeviceProfile.findOne({
    asset: asset._id,
  }).select("operatorCertificateRequired");
  if (!profile?.operatorCertificateRequired) return;

  const isCertified = await hasValidOperatorCertificateService(
    toUserId,
    asset.category,
  );
  if (isCertified) return;

  const category = await AssetCategory.findById(asset.category).select("name");
  throw ApiError.badRequest(
    `Thiết bị này yêu cầu người vận hành có chứng chỉ hợp lệ cho danh mục "${category?.name ?? "thiết bị"}" — người dùng được chọn chưa có chứng chỉ còn hạn. Cấp chứng chỉ vận hành trước khi gán/chuyển giao.`,
  );
};
