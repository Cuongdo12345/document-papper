import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination, BulkDeleteResult } from "@/types/shared.types";
import type { Vendor, CreateVendorRequest, UpdateVendorRequest, GetVendorsParams } from "@/types/vendor.types";

/**
 * API layer Roadmap B4 (Quản lý nhà cung cấp) — mount tại `/api/vendors`
 * (`app.ts`, module MỚI). Response envelope `{message, data}` (không
 * `success`) — cùng convention domain Asset/Inventory.
 */
export function createVendor(body: CreateVendorRequest): Promise<AxiosResponse<{ message: string; data: Vendor }>> {
  return axiosInstance.post("/vendors", body);
}

export function getVendors(
  params: GetVendorsParams,
): Promise<AxiosResponse<{ message: string; data: Vendor[]; pagination: Pagination }>> {
  return axiosInstance.get("/vendors", { params });
}

export function getVendorById(id: string): Promise<AxiosResponse<{ message: string; data: Vendor }>> {
  return axiosInstance.get(`/vendors/${id}`);
}

export function updateVendor(
  id: string,
  body: UpdateVendorRequest,
): Promise<AxiosResponse<{ message: string; data: Vendor }>> {
  return axiosInstance.put(`/vendors/${id}`, body);
}

/** [MỚI 2026-09-16, DEV-060] Xoá mềm hàng loạt — chọn nhiều dòng ở danh sách. */
export function bulkDeleteVendors(ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/vendors/bulk-delete", { ids });
}

/** [MỚI 2026-09-17, DEV-062] Khôi phục hàng loạt — cùng permission VENDOR_UPDATE với `updateVendor`. */
export function bulkRestoreVendors(ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/vendors/bulk-restore", { ids });
}
