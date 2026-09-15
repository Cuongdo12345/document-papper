import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination } from "@/types/shared.types";
import type { ExportDocumentsExcelParams, DocumentImportPreviewRow } from "@/types/document.types";
import type { ExcelImportResult } from "@/components/shared/ExcelImportWizard";
import type { ImportHistoryItem, GetImportHistoryParams } from "@/types/importHistory.types";

/**
 * API layer domain Excel — Document (mount `/api/export`, `excel.route.ts`,
 * FE-15/roadmap Mục 20). `subType` nối chuỗi bằng dấu phẩy (khớp
 * `String(subType).split(",")` ở `exportDocumentsExcelPRO`).
 */
export function exportDocumentsExcel(params: ExportDocumentsExcelParams): Promise<AxiosResponse<Blob>> {
  const { subType, ...rest } = params;
  return axiosInstance.get("/export/export-documents-excel", {
    params: { ...rest, subType: subType?.length ? subType.join(",") : undefined },
    responseType: "blob",
  });
}

export function downloadDocumentImportTemplate(): Promise<AxiosResponse<Blob>> {
  return axiosInstance.get("/export/template", { responseType: "blob" });
}

/**
 * `POST /export/import-proposal?dryRun=...` — CÙNG 1 route cho preview lẫn
 * import thật (khớp `ExcelImportWizard.runImport`). `success:true`
 * (`excel.controller.ts`), `data` khớp thẳng `ExcelImportResult`, không qua
 * `unwrapResponse()` (chỉ 1 field `data`, không có `pagination`).
 */
export function importDocumentsExcel(
  file: File,
  dryRun: boolean,
): Promise<AxiosResponse<{ success: boolean; message: string; data: ExcelImportResult<DocumentImportPreviewRow> }>> {
  const formData = new FormData();
  formData.append("file", file);
  return axiosInstance.post("/export/import-proposal", formData, {
    params: { dryRun },
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60_000,
  });
}

/**
 * `GET /export/import-history` — response `{success, data:{items, pagination}}`
 * (LỒNG cả 2 field trong `data`, KHÔNG phải `{data:items[], pagination}`
 * phẳng như `unwrapResponse()` giả định) — đọc thẳng `response.data.data`,
 * cùng pattern đã gặp ở Audit Logs/Notifications (FE-11/FE-12).
 */
export function getImportHistory(
  params: GetImportHistoryParams,
): Promise<AxiosResponse<{ success: boolean; data: { items: ImportHistoryItem[]; pagination: Pagination } }>> {
  return axiosInstance.get("/export/import-history", { params });
}

/**
 * `POST /export/departments/sync-from-excel` (permission `EXCEL_DEPARTMENT_SYNC`)
 * — mount CHUNG router Excel Document (`/export`) dù nghiệp vụ thuộc
 * Department, đặt ở đây để khớp đúng file route backend, `features/departments`
 * import thẳng hàm này. KHÔNG hỗ trợ `dryRun` (khác import Document/Asset —
 * xác nhận `syncDepartmentFromExcel()` không nhận tham số này).
 */
export function syncDepartmentsFromExcel(
  file: File,
): Promise<AxiosResponse<{ success: boolean; message: string; data: { totalInFile: number; created: number; existed: number } }>> {
  const formData = new FormData();
  formData.append("file", file);
  return axiosInstance.post("/export/departments/sync-from-excel", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60_000,
  });
}
