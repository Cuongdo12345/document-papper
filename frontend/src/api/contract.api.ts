import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination, BulkDeleteResult } from "@/types/shared.types";
import type {
  Contract,
  CreateContractRequest,
  UpdateContractRequest,
  CancelContractRequest,
  GetContractsParams,
} from "@/types/contract.types";

/**
 * API layer Roadmap B4 (Hợp đồng bảo trì) — mount tại `/api/contracts`
 * (`app.ts`, module MỚI). Response envelope `{message, data}`.
 */
export function createContract(
  body: CreateContractRequest,
): Promise<AxiosResponse<{ message: string; data: Contract }>> {
  return axiosInstance.post("/contracts", body);
}

export function getContracts(
  params: GetContractsParams,
): Promise<AxiosResponse<{ message: string; data: Contract[]; pagination: Pagination }>> {
  return axiosInstance.get("/contracts", { params });
}

/** `assets` LUÔN populate đầy đủ ở endpoint này. */
export function getContractsForAsset(
  assetId: string,
): Promise<AxiosResponse<{ message: string; data: Contract[] }>> {
  return axiosInstance.get(`/contracts/asset/${assetId}`);
}

export function getContractById(id: string): Promise<AxiosResponse<{ message: string; data: Contract }>> {
  return axiosInstance.get(`/contracts/${id}`);
}

export function updateContract(
  id: string,
  body: UpdateContractRequest,
): Promise<AxiosResponse<{ message: string; data: Contract }>> {
  return axiosInstance.put(`/contracts/${id}`, body);
}

export function cancelContract(
  id: string,
  body: CancelContractRequest,
): Promise<AxiosResponse<{ message: string; data: Contract }>> {
  return axiosInstance.patch(`/contracts/${id}/cancel`, body);
}

/** [MỚI 2026-09-16, DEV-058] Khôi phục hợp đồng đã huỷ — permission CONTRACT_RESTORE riêng. */
export function restoreContract(id: string): Promise<AxiosResponse<{ message: string; data: Contract }>> {
  return axiosInstance.patch(`/contracts/${id}/restore`);
}

/** [DEV-087] Huỷ hàng loạt — cùng permission CONTRACT_UPDATE với huỷ từng dòng; `cancelReason` áp chung. */
export function bulkCancelContracts(
  ids: string[],
  cancelReason?: string,
): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/contracts/bulk-cancel", { ids, cancelReason });
}

/** [DEV-087] Khôi phục hàng loạt — permission CONTRACT_RESTORE. */
export function bulkRestoreContracts(ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/contracts/bulk-restore", { ids });
}
