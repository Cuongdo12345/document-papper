import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination } from "@/types/shared.types";
import type {
  AssetListItem,
  GetAssetsParams,
  Asset,
  CreateAssetRequest,
  UpdateAssetRequest,
  AssignAssetRequest,
  TransferAssetRequest,
  ReturnAssetRequest,
  AssetAssignmentHistoryItem,
  GetAssetAssignmentHistoryParams,
  ExportAssetsExcelParams,
  AssetImportPreviewRow,
} from "@/types/asset.types";
import type { ExcelImportResult } from "@/components/shared/ExcelImportWizard";

/**
 * API layer domain Assets. Response envelope: CHỈ `{message, data}` hoặc
 * `{message, data, pagination}` — KHÔNG có `success` (đã xác nhận trực tiếp
 * `asset.controller.ts`/`assetAssignment.controller.ts`, mọi action).
 */
export function getAssets(
  params: GetAssetsParams,
): Promise<AxiosResponse<{ message: string; data: AssetListItem[]; pagination: Pagination }>> {
  return axiosInstance.get("/assets", { params });
}

export function getAssetById(id: string): Promise<AxiosResponse<{ message: string; data: AssetListItem }>> {
  return axiosInstance.get(`/assets/${id}`);
}

/**
 * FE-06 — CÙNG endpoint `GET /assets/:id` với `getAssetById` ở trên (backend
 * luôn trả object đầy đủ, đã populate `category`/`department`/`assignedTo`
 * — `getAssetById`/`AssetListItem` chỉ là 1 VIEW tối thiểu của response thật,
 * không phải 1 API path khác). Hàm riêng để trang Detail (FE-06) nhận đúng
 * type `Asset` đầy đủ mà không phải sửa `getAssetById`/`AssetListItem` (đang
 * được `AssetPicker`/`useAsset` FE-04 dùng, giữ nguyên không đổi).
 */
export function getAssetDetail(id: string): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.get(`/assets/${id}`);
}

/** FE-06 — Assets Core UI, dùng type `Asset` đầy đủ (khác `getAssets`/`getAssetById` ở trên, dùng `AssetListItem` tối thiểu cho `AssetPicker`). */
export function createAsset(body: CreateAssetRequest): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.post("/assets", body);
}

export function updateAsset(
  id: string,
  body: UpdateAssetRequest,
): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.put(`/assets/${id}`, body);
}

export function deleteAsset(id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`/assets/${id}`);
}

export function restoreAsset(id: string): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.patch(`/assets/${id}/restore`);
}

export function assignAsset(
  id: string,
  body: AssignAssetRequest,
): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.post(`/assets/${id}/assign`, body);
}

export function transferAsset(
  id: string,
  body: TransferAssetRequest,
): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.post(`/assets/${id}/transfer`, body);
}

export function returnAsset(
  id: string,
  body: ReturnAssetRequest,
): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.post(`/assets/${id}/return`, body);
}

export function getAssetAssignmentHistory(
  id: string,
  params: GetAssetAssignmentHistoryParams,
): Promise<AxiosResponse<{ message: string; data: AssetAssignmentHistoryItem[]; pagination: Pagination }>> {
  return axiosInstance.get(`/assets/${id}/assignment-history`, { params });
}

/* =========================================================================
   GIAI ĐOẠN 5 — QR code kiểm kê (roadmap A1, `assetQRCode.service.ts`).
========================================================================= */

/**
 * Ảnh QR (PNG) — encode `assetCode` (KHÔNG phải URL/`assetId`, xem comment
 * gốc `assetQRCode.service.ts`). Response ảnh thô (KHÔNG bọc JSON) — dùng
 * `responseType:"blob"`, cùng pattern `downloadFile`/`exportAssetsExcel`.
 */
export function getAssetQRCode(id: string): Promise<AxiosResponse<Blob>> {
  return axiosInstance.get(`/assets/${id}/qrcode`, { responseType: "blob" });
}

/**
 * Tra cứu asset theo `assetCode` (đọc từ QR/đầu đọc mã vạch/gõ tay) — bước 1
 * luồng kiểm kê, để FE hiển thị xác nhận trước khi gọi `checkInAsset`.
 */
export function lookupAssetByCode(assetCode: string): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.get(`/assets/lookup/${encodeURIComponent(assetCode)}`);
}

/** Ghi nhận kiểm kê — bước 2, sau khi nhân viên xác nhận đúng tài sản ở bước 1. */
export function checkInAsset(id: string): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.post(`/assets/${id}/check-in`);
}

/* =========================================================================
   EXCEL (FE-15, roadmap Mục 20) — khớp `asset.routes.ts`/`assetExcel.service.ts`.
   "/export" và "/import/template" đăng ký TRƯỚC "GET /:id" ở backend (tránh
   Express nuốt nhầm thành `id="export"`) — không ảnh hưởng FE, chỉ ghi chú
   lại cho đủ ngữ cảnh.
========================================================================= */

export function exportAssetsExcel(params: ExportAssetsExcelParams): Promise<AxiosResponse<Blob>> {
  return axiosInstance.get("/assets/export", { params, responseType: "blob" });
}

export function downloadAssetImportTemplate(): Promise<AxiosResponse<Blob>> {
  return axiosInstance.get("/assets/import/template", { responseType: "blob" });
}

/** `POST /assets/import?dryRun=...` — CÙNG route cho preview lẫn import thật, giống Document. */
export function importAssetsExcel(
  file: File,
  dryRun: boolean,
): Promise<AxiosResponse<{ message: string; data: ExcelImportResult<AssetImportPreviewRow> }>> {
  const formData = new FormData();
  formData.append("file", file);
  return axiosInstance.post("/assets/import", formData, {
    params: { dryRun },
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60_000,
  });
}
