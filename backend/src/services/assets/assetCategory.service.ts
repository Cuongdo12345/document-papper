import mongoose from "mongoose";
import { AssetCategory } from "../../models/assets/assetCategory.model";
import { Asset } from "../../models/assets/asset.model";
import ApiError from "../../shared/errors/ApiError";
import {
  ASSET_CATEGORY_UPDATE_WHITELIST,
  pickWhitelisted,
} from "./assets.constants";

/**
 * 📌 CREATE ASSET CATEGORY
 */
export const createAssetCategoryService = async (payload: {
  code: string;
  name: string;
  parentCategory?: string;
  defaultWarrantyMonths?: number;
}) => {
  const { code, parentCategory } = payload;

  // Không check thêm isActive: giữ `code` unique TOÀN CỤC kể cả với danh
  // mục đã soft-delete — cùng cách Document đang làm với `documentCode`
  // (không dùng lại code cũ để tránh nhầm lẫn báo cáo/lịch sử).
  const existed = await AssetCategory.findOne({ code: code.toUpperCase() });
  if (existed) {
    throw ApiError.badRequest("Mã danh mục tài sản đã tồn tại");
  }

  if (parentCategory) {
    const parentExists = await AssetCategory.findOne({
      _id: parentCategory,
      isActive: true,
    });
    if (!parentExists) {
      throw ApiError.badRequest("Danh mục cha không tồn tại");
    }
  }

  const category = await AssetCategory.create(payload);
  return category;
};

/**
 * 📌 GET ALL ASSET CATEGORIES
 */
export const getAllAssetCategoriesService = async (query: any) => {
  const { keyword, page = 1, limit = 10 } = query;

  const filter: any = { isActive: true };

  if (keyword) {
    filter.$or = [
      { code: { $regex: keyword, $options: "i" } },
      { name: { $regex: keyword, $options: "i" } },
    ];
  }

  const pageNumber = Math.max(parseInt(page, 10), 1);
  const pageSize = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNumber - 1) * pageSize;

  const [categories, total] = await Promise.all([
    AssetCategory.find(filter)
      .populate("parentCategory", "code name")
      .sort({ code: 1 })
      .skip(skip)
      .limit(pageSize),
    AssetCategory.countDocuments(filter),
  ]);

  return {
    data: categories,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 📌 GET ASSET CATEGORY BY ID
 */
export const getAssetCategoryByIdService = async (id: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID danh mục không hợp lệ");
  }

  const category = await AssetCategory.findOne({
    _id: id,
    isActive: true,
  }).populate("parentCategory", "code name");

  if (!category) {
    throw ApiError.notFound("Không tìm thấy danh mục tài sản");
  }

  return category;
};

/**
 * 📌 UPDATE ASSET CATEGORY
 */
export const updateAssetCategoryService = async (id: any, payload: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID danh mục không hợp lệ");
  }

  const safePayload = pickWhitelisted(
    payload,
    ASSET_CATEGORY_UPDATE_WHITELIST,
  );

  if (safePayload.parentCategory) {
    if (safePayload.parentCategory === id) {
      throw ApiError.badRequest("Danh mục không thể là cha của chính nó");
    }
    const parentExists = await AssetCategory.findOne({
      _id: safePayload.parentCategory,
      isActive: true,
    });
    if (!parentExists) {
      throw ApiError.badRequest("Danh mục cha không tồn tại");
    }
  }

  const category = await AssetCategory.findOneAndUpdate(
    { _id: id, isActive: true },
    safePayload,
    { new: true },
  );

  if (!category) {
    throw ApiError.notFound("Không tìm thấy danh mục tài sản");
  }

  return category;
};

/**
 * 📌 DELETE ASSET CATEGORY (soft delete)
 *
 * Đổi từ hard-delete (`deleteOne`) sang soft-delete để ĐỒNG BỘ với
 * `deleteAssetService` — và quan trọng hơn: để có cái để REVERT lại nếu
 * xoá nhầm, thay vì mất vĩnh viễn ngay. Muốn xoá hẳn, dùng
 * `hardDeleteAssetCategoryService` (yêu cầu đã soft-delete trước).
 */
export const deleteAssetCategoryService = async (id: any, userId?: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID danh mục không hợp lệ");
  }

  const category = await AssetCategory.findOne({ _id: id, isActive: true });
  if (!category) {
    throw ApiError.notFound("Không tìm thấy danh mục tài sản");
  }

  // ✅ Chặn xoá danh mục đang có tài sản tham chiếu
  const assetExists = await Asset.exists({ category: id, isActive: true });
  if (assetExists) {
    throw ApiError.badRequest(
      "Không thể xoá danh mục vì vẫn còn tài sản thuộc danh mục này",
    );
  }

  // ✅ Chặn xoá danh mục đang là cha của danh mục con khác (còn active)
  const childExists = await AssetCategory.exists({
    parentCategory: id,
    isActive: true,
  });
  if (childExists) {
    throw ApiError.badRequest(
      "Không thể xoá danh mục vì vẫn còn danh mục con thuộc danh mục này",
    );
  }

  category.isActive = false;
  category.deletedAt = new Date();
  category.deletedBy = userId;
  await category.save();

  return true;
};

/**
 * 📌 HARD DELETE ASSET CATEGORY (xoá vĩnh viễn)
 *
 * Cùng nguyên tắc 2 bước như `hardDeleteAssetService`: chỉ hard-delete
 * được danh mục ĐÃ soft-delete trước đó (`isActive: false`).
 */
export const hardDeleteAssetCategoryService = async (id: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID danh mục không hợp lệ");
  }

  const category = await AssetCategory.findById(id);
  if (!category) {
    throw ApiError.notFound("Không tìm thấy danh mục tài sản");
  }

  if (category.isActive) {
    throw ApiError.badRequest(
      "Chỉ có thể xoá vĩnh viễn danh mục đã được xoá mềm trước đó — vui lòng gọi xoá thường (soft delete) trước",
    );
  }

  await AssetCategory.deleteOne({ _id: id });
  return true;
};

/**
 * 📌 RESTORE ASSET CATEGORY — khôi phục danh mục đã soft-delete
 */
export const restoreAssetCategoryService = async (id: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID danh mục không hợp lệ");
  }

  const category = await AssetCategory.findById(id);
  if (!category) {
    throw ApiError.notFound("Không tìm thấy danh mục tài sản");
  }

  if (category.isActive) {
    throw ApiError.badRequest("Danh mục này chưa bị xoá");
  }

  category.isActive = true;
  category.deletedAt = undefined;
  category.deletedBy = undefined;
  await category.save();

  return category;
};
