import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import { assetApiBase } from "@/api/assetPaths";
import type { AssetType } from "@/types/asset.types";
import type { Pagination, BulkDeleteResult } from "@/types/shared.types";
import type {
  AssetCategory,
  GetAssetCategoriesParams,
  CreateAssetCategoryRequest,
  UpdateAssetCategoryRequest,
} from "@/types/asset.types";

/**
 * API layer domain AssetCategory. CRUD đầy đủ (Asset Categories UI, roadmap
 * Mục 14) — trước đó CHỈ có `getAssetCategories` (dropdown chọn danh mục khi
 * tạo/sửa Asset ở FE-06, xem comment lịch sử ở `useAssetCategories.ts`).
 * Response envelope: `{message, data}` hoặc `{message, data, pagination}` —
 * KHÔNG có `success` (cùng quy ước domain Assets, xem `assets.api.ts`).
 */
export function getAssetCategories(
  type: AssetType,
  params: GetAssetCategoriesParams,
): Promise<AxiosResponse<{ message: string; data: AssetCategory[]; pagination: Pagination }>> {
  return axiosInstance.get(`${assetApiBase(type)}/categories`, { params });
}

export function getAssetCategoryById(type: AssetType, id: string): Promise<AxiosResponse<{ message: string; data: AssetCategory }>> {
  return axiosInstance.get(`${assetApiBase(type)}/categories/${id}`);
}

export function createAssetCategory(
  type: AssetType,
  body: CreateAssetCategoryRequest,
): Promise<AxiosResponse<{ message: string; data: AssetCategory }>> {
  return axiosInstance.post(`${assetApiBase(type)}/categories`, body);
}

export function updateAssetCategory(
  type: AssetType,
  id: string,
  body: UpdateAssetCategoryRequest,
): Promise<AxiosResponse<{ message: string; data: AssetCategory }>> {
  return axiosInstance.put(`${assetApiBase(type)}/categories/${id}`, body);
}

/** Soft-delete — backend tự chặn (400) nếu còn tài sản hoặc danh mục con đang tham chiếu. */
export function deleteAssetCategory(type: AssetType, id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`${assetApiBase(type)}/categories/${id}`);
}

export function restoreAssetCategory(type: AssetType, id: string): Promise<AxiosResponse<{ message: string; data: AssetCategory }>> {
  return axiosInstance.patch(`${assetApiBase(type)}/categories/${id}/restore`);
}

/** [MỚI 2026-09-16, DEV-060] Xoá mềm hàng loạt — chọn nhiều dòng ở danh sách. */
export function bulkDeleteAssetCategories(type: AssetType, ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post(`${assetApiBase(type)}/categories/bulk-delete`, { ids });
}

/** [MỚI 2026-09-17, DEV-062] Khôi phục hàng loạt — cùng quyền `*_ASSET_CATEGORY_UPDATE` của module với `restoreAssetCategory`. */
export function bulkRestoreAssetCategories(type: AssetType, ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post(`${assetApiBase(type)}/categories/bulk-restore`, { ids });
}
