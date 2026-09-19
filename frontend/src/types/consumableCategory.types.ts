/**
 * Nhóm vật tư tiêu hao (2026-09-16) — khớp `consumableCategory.interface.ts`/
 * `.model.ts`/`consumable.dto.ts` (backend), không suy đoán field. Mirror
 * ĐÚNG `AssetCategory` type (`asset.types.ts`) — CÓ phân cấp cha/con.
 */
export interface ConsumableCategory {
  _id: string;
  code: string;
  name: string;
  parentCategory?: { _id: string; code: string; name: string } | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Khớp `QueryConsumableCategoryDTO`. */
export interface GetConsumableCategoriesParams {
  page?: number;
  limit?: number;
  keyword?: string;
  isActive?: boolean;
}

/** Khớp `CreateConsumableCategoryDTO`. */
export interface CreateConsumableCategoryRequest {
  code: string;
  name: string;
  parentCategory?: string;
}

/** Khớp `UpdateConsumableCategoryDTO` — CHỦ Ý KHÔNG có `code`/`isActive` (cùng lý do `UpdateAssetCategoryRequest`). */
export interface UpdateConsumableCategoryRequest {
  name?: string;
  parentCategory?: string;
}
