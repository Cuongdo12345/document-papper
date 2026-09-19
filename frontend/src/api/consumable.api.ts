import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination, BulkDeleteResult } from "@/types/shared.types";
import type {
  ConsumableItem,
  ConsumableTransaction,
  CreateConsumableItemRequest,
  UpdateConsumableItemRequest,
  CreateConsumableTransactionRequest,
  GetConsumableItemsParams,
  GetConsumableTransactionsParams,
  ConsumableRequest,
  CreateConsumableRequestRequest,
  UpdateConsumableRequestRequest,
  GetConsumableRequestsParams,
} from "@/types/consumable.types";

/**
 * API layer Roadmap B3 (Quản lý vật tư tiêu hao) — mount tại `/api/inventory`
 * (`app.ts`, module MỚI). Response envelope `{message, data}` (không
 * `success`) — cùng convention domain Asset/MaintenancePlan.
 */
export function createConsumableItem(
  body: CreateConsumableItemRequest,
): Promise<AxiosResponse<{ message: string; data: ConsumableItem }>> {
  return axiosInstance.post("/inventory/items", body);
}

export function getConsumableItems(
  params: GetConsumableItemsParams,
): Promise<AxiosResponse<{ message: string; data: ConsumableItem[]; pagination: Pagination }>> {
  return axiosInstance.get("/inventory/items", { params });
}

export function getConsumableItemById(
  id: string,
): Promise<AxiosResponse<{ message: string; data: ConsumableItem }>> {
  return axiosInstance.get(`/inventory/items/${id}`);
}

export function updateConsumableItem(
  id: string,
  body: UpdateConsumableItemRequest,
): Promise<AxiosResponse<{ message: string; data: ConsumableItem }>> {
  return axiosInstance.put(`/inventory/items/${id}`, body);
}

/** [MỚI 2026-09-16, DEV-060] Xoá mềm hàng loạt — chọn nhiều dòng ở danh sách. */
export function bulkDeleteConsumableItems(ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/inventory/items/bulk-delete", { ids });
}

/** [MỚI 2026-09-17, DEV-062] Khôi phục hàng loạt — cùng permission CONSUMABLE_UPDATE với `updateConsumableItem`. */
export function bulkRestoreConsumableItems(ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/inventory/items/bulk-restore", { ids });
}

export function createConsumableTransaction(
  itemId: string,
  body: CreateConsumableTransactionRequest,
): Promise<AxiosResponse<{ message: string; data: ConsumableTransaction }>> {
  return axiosInstance.post(`/inventory/items/${itemId}/transactions`, body);
}

export function getConsumableTransactions(
  itemId: string,
  params: GetConsumableTransactionsParams,
): Promise<AxiosResponse<{ message: string; data: ConsumableTransaction[]; pagination: Pagination }>> {
  return axiosInstance.get(`/inventory/items/${itemId}/transactions`, { params });
}

/* =====================================================================
   ĐỀ XUẤT/DỰ TRÙ VẬT TƯ (ConsumableRequest, Roadmap B8, DEV-067, 2026-09-18)
===================================================================== */

export function createConsumableRequest(
  body: CreateConsumableRequestRequest,
): Promise<AxiosResponse<{ message: string; data: ConsumableRequest }>> {
  return axiosInstance.post("/inventory/requests", body);
}

export function getConsumableRequests(
  params: GetConsumableRequestsParams,
): Promise<AxiosResponse<{ message: string; data: ConsumableRequest[]; pagination: Pagination }>> {
  return axiosInstance.get("/inventory/requests", { params });
}

export function getConsumableRequestById(
  id: string,
): Promise<AxiosResponse<{ message: string; data: ConsumableRequest }>> {
  return axiosInstance.get(`/inventory/requests/${id}`);
}

export function updateConsumableRequest(
  id: string,
  body: UpdateConsumableRequestRequest,
): Promise<AxiosResponse<{ message: string; data: ConsumableRequest }>> {
  return axiosInstance.put(`/inventory/requests/${id}`, body);
}

export function fulfillConsumableRequest(
  id: string,
): Promise<AxiosResponse<{ message: string; data: ConsumableRequest }>> {
  return axiosInstance.patch(`/inventory/requests/${id}/fulfill`);
}

export function cancelConsumableRequest(
  id: string,
): Promise<AxiosResponse<{ message: string; data: ConsumableRequest }>> {
  return axiosInstance.patch(`/inventory/requests/${id}/cancel`);
}
