import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination } from "@/types/shared.types";
import type {
  ConsumableItem,
  ConsumableTransaction,
  CreateConsumableItemRequest,
  UpdateConsumableItemRequest,
  CreateConsumableTransactionRequest,
  GetConsumableItemsParams,
  GetConsumableTransactionsParams,
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
