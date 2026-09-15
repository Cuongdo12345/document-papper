import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination } from "@/types/shared.types";
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
  params: GetAssetCategoriesParams,
): Promise<AxiosResponse<{ message: string; data: AssetCategory[]; pagination: Pagination }>> {
  return axiosInstance.get("/assets/asset-categories", { params });
}

export function getAssetCategoryById(id: string): Promise<AxiosResponse<{ message: string; data: AssetCategory }>> {
  return axiosInstance.get(`/assets/asset-categories/${id}`);
}

export function createAssetCategory(
  body: CreateAssetCategoryRequest,
): Promise<AxiosResponse<{ message: string; data: AssetCategory }>> {
  return axiosInstance.post("/assets/asset-categories", body);
}

export function updateAssetCategory(
  id: string,
  body: UpdateAssetCategoryRequest,
): Promise<AxiosResponse<{ message: string; data: AssetCategory }>> {
  return axiosInstance.put(`/assets/asset-categories/${id}`, body);
}

/** Soft-delete — backend tự chặn (400) nếu còn tài sản hoặc danh mục con đang tham chiếu. */
export function deleteAssetCategory(id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`/assets/asset-categories/${id}`);
}

export function restoreAssetCategory(id: string): Promise<AxiosResponse<{ message: string; data: AssetCategory }>> {
  return axiosInstance.patch(`/assets/asset-categories/${id}/restore`);
}
