// services/inventory/consumableCategory.service.ts
//
// Nhóm vật tư tiêu hao — CRUD + soft delete/restore, mirror ĐÚNG
// `assetCategory.service.ts` (xem giải thích ở `consumableCategory.interface.ts`).
//
// ⚠️ KHÁC AssetCategory: KHÔNG có `hardDeleteConsumableCategoryService`.
// `hardDeleteAssetCategoryService` tồn tại nhưng KHÔNG permission nào được
// gán (`rolePermission.map.ts` — "xoá vĩnh viễn rủi ro cao"), tức 0 UI/API
// consumer thật. Không lặp lại 1 nhánh code không ai gọi tới được cho module
// mới — nếu sau này cần, thêm có chủ đích (CLAUDE.md Mục 12, không
// over-engineer).

import mongoose from "mongoose";
import { ConsumableCategory } from "../../models/inventory/consumableCategory.model";
import { ConsumableItem } from "../../models/inventory/consumableItem.model";
import ApiError from "../../shared/errors/ApiError";
import { escapeRegex } from "../../shared/utils/regex.util";
import { runBulkDelete } from "../../shared/utils/bulkDelete.util";

/** 📌 CREATE */
export const createConsumableCategoryService = async (payload: {
  code: string;
  name: string;
  parentCategory?: string;
}) => {
  const { code, parentCategory } = payload;

  // code unique TOÀN CỤC kể cả với danh mục đã soft-delete — cùng lý do
  // `assetCategory.service.ts` (không dùng lại code cũ, tránh nhầm lẫn).
  const existed = await ConsumableCategory.findOne({ code: code.toUpperCase() });
  if (existed) {
    throw ApiError.badRequest("Mã nhóm vật tư đã tồn tại");
  }

  if (parentCategory) {
    const parentExists = await ConsumableCategory.findOne({ _id: parentCategory, isActive: true });
    if (!parentExists) {
      throw ApiError.badRequest("Nhóm cha không tồn tại");
    }
  }

  return ConsumableCategory.create(payload);
};

/** 📌 LIST */
export const getAllConsumableCategoriesService = async (query: any) => {
  const { keyword, page = 1, limit = 10, isActive } = query;

  const filter: any = { isActive: isActive === undefined ? true : isActive };

  if (keyword) {
    const safeKeyword = escapeRegex(keyword);
    filter.$or = [
      { code: { $regex: safeKeyword, $options: "i" } },
      { name: { $regex: safeKeyword, $options: "i" } },
    ];
  }

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 10, 1);
  const skip = (pageNumber - 1) * pageSize;

  const [categories, total] = await Promise.all([
    ConsumableCategory.find(filter)
      .populate("parentCategory", "code name")
      .sort({ code: 1 })
      .skip(skip)
      .limit(pageSize),
    ConsumableCategory.countDocuments(filter),
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

/** 📌 GET BY ID */
export const getConsumableCategoryByIdService = async (id: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID nhóm vật tư không hợp lệ");
  }

  const category = await ConsumableCategory.findOne({ _id: id, isActive: true }).populate(
    "parentCategory",
    "code name",
  );
  if (!category) {
    throw ApiError.notFound("Không tìm thấy nhóm vật tư");
  }

  return category;
};

/** 📌 UPDATE — CHỦ Ý KHÔNG cho sửa `code` (bất biến sau khi tạo, cùng AssetCategory). */
export const updateConsumableCategoryService = async (id: any, payload: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID nhóm vật tư không hợp lệ");
  }

  const safePayload: Record<string, unknown> = {};
  if (payload.name !== undefined) safePayload.name = payload.name;
  if (payload.parentCategory !== undefined) safePayload.parentCategory = payload.parentCategory;

  if (safePayload.parentCategory) {
    if (safePayload.parentCategory === id) {
      throw ApiError.badRequest("Nhóm không thể là cha của chính nó");
    }
    const parentExists = await ConsumableCategory.findOne({ _id: safePayload.parentCategory, isActive: true });
    if (!parentExists) {
      throw ApiError.badRequest("Nhóm cha không tồn tại");
    }
  }

  const category = await ConsumableCategory.findOneAndUpdate({ _id: id, isActive: true }, safePayload, {
    new: true,
  });
  if (!category) {
    throw ApiError.notFound("Không tìm thấy nhóm vật tư");
  }

  return category;
};

/** 📌 DELETE (soft) — chặn nếu còn vật tư hoặc nhóm con đang tham chiếu, cùng AssetCategory. */
export const deleteConsumableCategoryService = async (id: any, userId?: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID nhóm vật tư không hợp lệ");
  }

  const category = await ConsumableCategory.findOne({ _id: id, isActive: true });
  if (!category) {
    throw ApiError.notFound("Không tìm thấy nhóm vật tư");
  }

  const itemExists = await ConsumableItem.exists({ category: id, isActive: true });
  if (itemExists) {
    throw ApiError.badRequest("Không thể xoá nhóm vì vẫn còn vật tư thuộc nhóm này");
  }

  const childExists = await ConsumableCategory.exists({ parentCategory: id, isActive: true });
  if (childExists) {
    throw ApiError.badRequest("Không thể xoá nhóm vì vẫn còn nhóm con thuộc nhóm này");
  }

  category.isActive = false;
  category.deletedAt = new Date();
  category.deletedBy = userId;
  await category.save();

  return true;
};

/** 📌 BULK DELETE (xoá mềm hàng loạt — DEV-060, 2026-09-16) */
export const bulkDeleteConsumableCategoryService = async (ids: string[], userId?: any) => {
  return runBulkDelete(ids, (id) => deleteConsumableCategoryService(id, userId));
};

/** 📌 RESTORE */
export const restoreConsumableCategoryService = async (id: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID nhóm vật tư không hợp lệ");
  }

  const category = await ConsumableCategory.findById(id);
  if (!category) {
    throw ApiError.notFound("Không tìm thấy nhóm vật tư");
  }
  if (category.isActive) {
    throw ApiError.badRequest("Nhóm này chưa bị xoá");
  }

  category.isActive = true;
  category.deletedAt = undefined;
  category.deletedBy = undefined;
  await category.save();

  return category;
};

/** 📌 BULK RESTORE (khôi phục hàng loạt — DEV-062, 2026-09-17) */
export const bulkRestoreConsumableCategoryService = async (ids: string[]) => {
  return runBulkDelete(ids, (id) => restoreConsumableCategoryService(id), "Khôi phục thất bại");
};
