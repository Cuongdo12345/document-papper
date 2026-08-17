import mongoose from "mongoose";
import { Asset, AssetStatus } from "../../../models/assets/asset.model";
import { AssetCategory } from "../../../models/assets/assetCategory.model";
import Department from "../../../models/departments/department.model";
import ApiError from "../../../shared/errors/ApiError";
import { generateAssetCode } from "../../../shared/helpers/generateAssetCode";
import { ASSET_UPDATE_WHITELIST, pickWhitelisted } from "../assets.constants";

const ASSET_POPULATE = [
  { path: "category", select: "code name" },
  { path: "department", select: "code name" },
  { path: "assignedTo", select: "username fullName email" },
];
 
/**
 * 📌 CREATE ASSET
 * Tài sản mới luôn khởi tạo ở trạng thái IN_STOCK (trong kho) — việc cấp
 * phát (chuyển sang IN_USE, gắn assignedTo) là nghiệp vụ riêng của Giai
 * đoạn 2 (AssetAssignmentHistory), không set trực tiếp lúc tạo.
 */
export const createAssetService = async (payload: any, userId?: any) => {
  const { category, department } = payload;
 
  const [categoryExists, departmentExists] = await Promise.all([
    AssetCategory.findOne({ _id: category, isActive: true }),
    Department.findById(department),
  ]);
 
  if (!categoryExists) {
    throw ApiError.badRequest("Danh mục tài sản không tồn tại");
  }
  if (!departmentExists) {
    throw ApiError.badRequest("Khoa/phòng không tồn tại");
  }
 
  const assetCode = await generateAssetCode(department);
 
  const asset = await Asset.create({
    ...payload,
    assetCode,
    status: AssetStatus.IN_STOCK,
    createdBy: userId,
    updatedBy: userId,
  });
 
  return asset;
};
 
/**
 * 📌 GET ALL ASSETS — filter + search + pagination
 */
export const getAllAssetsService = async (query: any) => {
  const {
    keyword,
    department,
    category,
    status,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    order = "desc",
  } = query;
 
  const filter: any = { isActive: true };
 
  if (keyword) {
    filter.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { assetCode: { $regex: keyword, $options: "i" } },
      { serialNumber: { $regex: keyword, $options: "i" } },
    ];
  }
 
  if (department) filter.department = department;
  if (category) filter.category = category;
  if (status) filter.status = status;
 
  const pageNumber = Math.max(parseInt(page, 10), 1);
  const pageSize = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNumber - 1) * pageSize;
 
  const sortOption: any = { [sortBy]: order === "asc" ? 1 : -1 };
 
  const [assets, total] = await Promise.all([
    Asset.find(filter)
      .populate(ASSET_POPULATE)
      .sort(sortOption)
      .skip(skip)
      .limit(pageSize),
    Asset.countDocuments(filter),
  ]);
 
  return {
    data: assets,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};
 
/**
 * 📌 GET ASSET BY ID
 */
export const getAssetByIdService = async (id: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }
 
  const asset = await Asset.findOne({ _id: id, isActive: true }).populate(
    ASSET_POPULATE,
  );
 
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }
 
  return asset;
};
 
/**
 * 📌 UPDATE ASSET
 * CHỈ cho phép sửa các field thông tin mô tả (whitelist) — KHÔNG cho sửa
 * status/assignedTo/department qua đây, xem giải thích ở `assets.constants.ts`.
 */
export const updateAssetService = async (
  id: any,
  payload: any,
  userId?: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }
 
  const safePayload = pickWhitelisted(payload, ASSET_UPDATE_WHITELIST);
 
  if (safePayload.category) {
    const categoryExists = await AssetCategory.findOne({
      _id: safePayload.category,
      isActive: true,
    });
    if (!categoryExists) {
      throw ApiError.badRequest("Danh mục tài sản không tồn tại");
    }
  }

   // 🔗 Giai đoạn 4 — đổi hạn bảo hành thì phải cho phép cron cảnh báo lại
  // từ đầu cho ngày hạn MỚI, không được giữ "đã gửi cảnh báo" từ ngày hạn
  // CŨ. Dùng `null` (không phải `undefined`) vì driver MongoDB bỏ qua
  // key có giá trị `undefined` khi update — chỉ `null` mới thực sự ghi đè
  // field về rỗng.
  if ("warrantyExpiredAt" in safePayload) {
    safePayload.warrantyAlertSentAt = null;
  }
 
  const asset = await Asset.findOneAndUpdate(
    { _id: id, isActive: true },
    { ...safePayload, updatedBy: userId },
    { new: true },
  ).populate(ASSET_POPULATE);
 
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }
 
  return asset;
};
 
/**
 * 📌 DELETE ASSET (soft delete)
 * Không cho xoá tài sản đang IN_USE/UNDER_MAINTENANCE — phải thu hồi/hoàn
 * tất sửa chữa trước, tránh mất dấu vết 1 tài sản đang có người dùng/đang
 * chạy quy trình duyệt lại "biến mất" khỏi hệ thống.
 */
export const deleteAssetService = async (id: any, userId?: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }
 
  const asset = await Asset.findOne({ _id: id, isActive: true });
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }
 
  if (
    asset.status === AssetStatus.IN_USE ||
    asset.status === AssetStatus.UNDER_MAINTENANCE
  ) {
    throw ApiError.badRequest(
      "Không thể xoá tài sản đang sử dụng hoặc đang sửa chữa — vui lòng thu hồi/hoàn tất trước",
    );
  }
 
  asset.isActive = false;
  asset.deletedAt = new Date();
  asset.deletedBy = userId;
  await asset.save();
 
  return true;
};
 
/**
 * 📌 HARD DELETE ASSET (xoá vĩnh viễn — KHÁC với DELETE ở trên)
 *
 * Đây là thao tác RỦI RO CAO nên bắt buộc 2 bước:
 *   1. Asset phải đã được soft-delete trước (`isActive: false`, gọi qua
 *      `deleteAssetService`/API DELETE thường) — không cho hard-delete
 *      thẳng 1 tài sản đang active, tránh xoá nhầm do gọi sai endpoint.
 *   2. Endpoint hard-delete dùng permission RIÊNG (`ASSET_DELETE_PERMANENT`,
 *      không gán cho role USER) — theo đúng tinh thần tách permission
 *      thanh lý/xoá vĩnh viễn ra khỏi permission xoá thường đã đề cập ở
 *      phần phân tích thiết kế ban đầu (ASSET_DISPOSE).
 *
 * Ghi chú cho Giai đoạn 3: khi đã có field liên kết Document↔Asset
 * (`relatedAsset`), cần bổ sung thêm điều kiện chặn hard-delete nếu vẫn
 * còn Document (đề xuất sửa chữa/thanh lý...) tham chiếu tới asset này —
 * hiện tại (Giai đoạn 1) chưa có field đó nên chưa check được.
 */
export const hardDeleteAssetService = async (id: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }
 
  const asset = await Asset.findById(id);
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }
 
  if (asset.isActive) {
    throw ApiError.badRequest(
      "Chỉ có thể xoá vĩnh viễn tài sản đã được xoá mềm trước đó — vui lòng gọi xoá thường (soft delete) trước",
    );
  }
 
  await Asset.deleteOne({ _id: id });
 
  return true;
};
 
/**
 * 📌 RESTORE ASSET — khôi phục tài sản đã soft-delete (tiện dùng kèm hard
 * delete: cho phép sửa sai trước khi xoá vĩnh viễn thật sự).
 */
export const restoreAssetService = async (id: any, userId?: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }
 
  const asset = await Asset.findById(id);
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }
 
  if (asset.isActive) {
    throw ApiError.badRequest("Tài sản này chưa bị xoá");
  }
 
  asset.isActive = true;
  asset.deletedAt = undefined;
  asset.deletedBy = undefined;
  asset.updatedBy = userId;
  await asset.save();
 
  return asset;
};