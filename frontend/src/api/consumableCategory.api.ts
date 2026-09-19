import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination, BulkDeleteResult } from "@/types/shared.types";
import type {
  ConsumableCategory,
  GetConsumableCategoriesParams,
  CreateConsumableCategoryRequest,
  UpdateConsumableCategoryRequest,
} from "@/types/consumableCategory.types";

/**
 * API layer domain ConsumableCategory (2026-09-16) — mount tại
 * `/api/inventory/categories`. Mirror ĐÚNG `assetCategories.api.ts`. Response
 * envelope `{message, data}`/`{message, data, pagination}` — không `success`.
 */
export function getConsumableCategories(
  params: GetConsumableCategoriesParams,
): Promise<AxiosResponse<{ message: string; data: ConsumableCategory[]; pagination: Pagination }>> {
  return axiosInstance.get("/inventory/categories", { params });
}

export function getConsumableCategoryById(
  id: string,
): Promise<AxiosResponse<{ message: string; data: ConsumableCategory }>> {
  return axiosInstance.get(`/inventory/categories/${id}`);
}

export function createConsumableCategory(
  body: CreateConsumableCategoryRequest,
): Promise<AxiosResponse<{ message: string; data: ConsumableCategory }>> {
  return axiosInstance.post("/inventory/categories", body);
}

export function updateConsumableCategory(
  id: string,
  body: UpdateConsumableCategoryRequest,
): Promise<AxiosResponse<{ message: string; data: ConsumableCategory }>> {
  return axiosInstance.put(`/inventory/categories/${id}`, body);
}

/** Soft-delete — backend tự chặn (400) nếu còn vật tư hoặc nhóm con đang tham chiếu. */
export function deleteConsumableCategory(id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`/inventory/categories/${id}`);
}

export function restoreConsumableCategory(
  id: string,
): Promise<AxiosResponse<{ message: string; data: ConsumableCategory }>> {
  return axiosInstance.patch(`/inventory/categories/${id}/restore`);
}

/** [MỚI 2026-09-16, DEV-060] Xoá mềm hàng loạt — chọn nhiều dòng ở danh sách. */
export function bulkDeleteConsumableCategories(ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/inventory/categories/bulk-delete", { ids });
}

/** [MỚI 2026-09-17, DEV-062] Khôi phục hàng loạt — cùng permission CONSUMABLE_CATEGORY_UPDATE với `restoreConsumableCategory`. */
export function bulkRestoreConsumableCategories(ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/inventory/categories/bulk-restore", { ids });
}
