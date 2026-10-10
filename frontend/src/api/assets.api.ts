import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import { assetApiBase } from "@/api/assetPaths";
import type { AssetType } from "@/types/asset.types";
import type { Pagination, BulkDeleteResult } from "@/types/shared.types";
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
  AssetLookupItem,
  AssetLookupParams,
} from "@/types/asset.types";
import type { ExcelImportResult } from "@/components/shared/ExcelImportWizard";

/**
 * API layer domain Assets. Response envelope: CHỈ `{message, data}` hoặc
 * `{message, data, pagination}` — KHÔNG có `success` (đã xác nhận trực tiếp
 * `asset.controller.ts`/`assetAssignment.controller.ts`, mọi action).
 */
export function getAssets(
  type: AssetType,
  params: GetAssetsParams,
): Promise<AxiosResponse<{ message: string; data: AssetListItem[]; pagination: Pagination }>> {
  return axiosInstance.get(assetApiBase(type), { params });
}

/**
 * Chi tiết đầy đủ (type Asset) — đã populate `category`/`department`/`assignedTo`. Tài sản thuộc loại khác module
 * → 404 (backend cô lập theo loại).
 */
export function getAssetDetail(type: AssetType, id: string): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.get(`${assetApiBase(type)}/${id}`);
}

/** FE-06 — Assets Core UI, dùng type `Asset` đầy đủ (khác `getAssets` ở trên, dùng `AssetListItem` tối thiểu cho danh sách). */
export function createAsset(type: AssetType, body: CreateAssetRequest): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.post(assetApiBase(type), body);
}

export function updateAsset(
  type: AssetType,
  id: string,
  body: UpdateAssetRequest,
): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.put(`${assetApiBase(type)}/${id}`, body);
}

export function deleteAsset(type: AssetType, id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`${assetApiBase(type)}/${id}`);
}

export function restoreAsset(type: AssetType, id: string): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.patch(`${assetApiBase(type)}/${id}/restore`);
}

/** [MỚI 2026-09-16, DEV-060] Xoá mềm hàng loạt — chọn nhiều dòng ở danh sách. */
export function bulkDeleteAssets(type: AssetType, ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post(`${assetApiBase(type)}/bulk-delete`, { ids });
}

/** [MỚI 2026-09-17, DEV-062] Khôi phục hàng loạt — cùng quyền `*_ASSET_UPDATE` của module với `restoreAsset`. */
export function bulkRestoreAssets(type: AssetType, ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post(`${assetApiBase(type)}/bulk-restore`, { ids });
}

export function assignAsset(
  type: AssetType,
  id: string,
  body: AssignAssetRequest,
): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.post(`${assetApiBase(type)}/${id}/assign`, body);
}

export function transferAsset(
  type: AssetType,
  id: string,
  body: TransferAssetRequest,
): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.post(`${assetApiBase(type)}/${id}/transfer`, body);
}

export function returnAsset(
  type: AssetType,
  id: string,
  body: ReturnAssetRequest,
): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.post(`${assetApiBase(type)}/${id}/return`, body);
}

export function getAssetAssignmentHistory(
  type: AssetType,
  id: string,
  params: GetAssetAssignmentHistoryParams,
): Promise<AxiosResponse<{ message: string; data: AssetAssignmentHistoryItem[]; pagination: Pagination }>> {
  return axiosInstance.get(`${assetApiBase(type)}/${id}/assignment-history`, { params });
}

/* =========================================================================
   GIAI ĐOẠN 5 — QR code kiểm kê (roadmap A1, `assetQRCode.service.ts`).
========================================================================= */

/**
 * Ảnh QR (PNG) — encode `assetCode` (KHÔNG phải URL/`assetId`, xem comment
 * gốc `assetQRCode.service.ts`). Response ảnh thô (KHÔNG bọc JSON) — dùng
 * `responseType:"blob"`, cùng pattern `downloadFile`/`exportAssetsExcel`.
 */
export function getAssetQRCode(type: AssetType, id: string): Promise<AxiosResponse<Blob>> {
  return axiosInstance.get(`${assetApiBase(type)}/${id}/qrcode`, { responseType: "blob" });
}

/**
 * Tra cứu asset theo `assetCode` (đọc từ QR/đầu đọc mã vạch/gõ tay) — bước 1
 * luồng kiểm kê, để FE hiển thị xác nhận trước khi gọi `checkInAsset`.
 */
export function lookupAssetByCode(type: AssetType, assetCode: string): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.get(`${assetApiBase(type)}/lookup/${encodeURIComponent(assetCode)}`);
}

/** Ghi nhận kiểm kê — bước 2, sau khi nhân viên xác nhận đúng tài sản ở bước 1. */
export function checkInAsset(type: AssetType, id: string): Promise<AxiosResponse<{ message: string; data: Asset }>> {
  return axiosInstance.post(`${assetApiBase(type)}/${id}/check-in`);
}

/* =========================================================================
   EXCEL (FE-15, roadmap Mục 20) — khớp `asset.routes.ts`/`assetExcel.service.ts`.
   "/export" và "/import/template" đăng ký TRƯỚC "GET /:id" ở backend (tránh
   Express nuốt nhầm thành `id="export"`) — không ảnh hưởng FE, chỉ ghi chú
   lại cho đủ ngữ cảnh.
========================================================================= */

export function exportAssetsExcel(type: AssetType, params: ExportAssetsExcelParams): Promise<AxiosResponse<Blob>> {
  return axiosInstance.get(`${assetApiBase(type)}/export`, { params, responseType: "blob" });
}

export function downloadAssetImportTemplate(type: AssetType): Promise<AxiosResponse<Blob>> {
  return axiosInstance.get(`${assetApiBase(type)}/import/template`, { responseType: "blob" });
}

/** `POST /assets/import?dryRun=...` — CÙNG route cho preview lẫn import thật, giống Document. */
export function importAssetsExcel(
  type: AssetType,
  file: File,
  dryRun: boolean,
): Promise<AxiosResponse<{ message: string; data: ExcelImportResult<AssetImportPreviewRow> }>> {
  const formData = new FormData();
  formData.append("file", file);
  return axiosInstance.post(`${assetApiBase(type)}/import`, formData, {
    params: { dryRun },
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60_000,
  });
}

/* =========================================================================
   TRA CỨU CHUNG CHO HAI LOẠI (FE-44, backend DEV-118/DEV-119) — ô chọn tài sản ở Tài liệu/Hợp đồng, link từ
   Thông báo. Không thuộc module nào: cần MỘT TRONG HAI quyền xem; backend chỉ trả loại người gọi xem được.
========================================================================= */

export function lookupAssetOptions(
  params: AssetLookupParams,
): Promise<AxiosResponse<{ message: string; data: AssetLookupItem[]; pagination: Pagination }>> {
  return axiosInstance.get("/assets/lookup-options", { params });
}

/** 1 tài sản theo id kèm loại (kể cả đã xoá mềm, trả isActive=false); loại không xem được → 404. */
export function lookupAssetOptionById(id: string): Promise<AxiosResponse<{ message: string; data: AssetLookupItem }>> {
  return axiosInstance.get(`/assets/lookup-options/${id}`);
}
