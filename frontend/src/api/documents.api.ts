import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination, BulkDeleteResult } from "@/types/shared.types";
import type {
  CreateDocumentRequest,
  Document,
  DocumentVersion,
  GetDocumentsParams,
  UpdateDocumentRequest,
} from "@/types/document.types";

/**
 * API layer domain Documents (FE-04). Khác Users/Departments — response
 * envelope Ở ĐÂY nhất quán `{success:true, message?, data}` cho MỌI endpoint
 * (đã xác nhận trực tiếp `document.controller.ts`, không có ngoại lệ).
 */
export function getDocuments(
  params: GetDocumentsParams,
): Promise<AxiosResponse<{ success: true; data: Document[]; pagination: Pagination }>> {
  return axiosInstance.get("/documents", { params });
}

export function getDocumentById(id: string): Promise<AxiosResponse<{ success: true; message: string; data: Document }>> {
  return axiosInstance.get(`/documents/${id}`);
}

export function createDocument(
  body: CreateDocumentRequest,
): Promise<AxiosResponse<{ success: true; message: string; data: Document }>> {
  return axiosInstance.post("/documents/proposal", body);
}

/** CHỈ `title`/`meta` (`DOCUMENT_UPDATE_WHITELIST`) — gửi field khác sẽ bị backend 400. */
export function updateDocument(
  id: string,
  body: UpdateDocumentRequest,
): Promise<AxiosResponse<{ success: true; message: string; data: Document }>> {
  return axiosInstance.put(`/documents/${id}`, body);
}

/** Soft-delete đơn lẻ — backend CHẶN nếu còn REPORT tham chiếu (PROPOSAL) hoặc workflowStatus="pending". ADMIN-only (service tự check, không chỉ permission). */
export function deleteDocument(id: string): Promise<AxiosResponse<{ success: true; message: string; data: string }>> {
  return axiosInstance.delete(`/documents/${id}`);
}

/** Khôi phục document đã soft-delete — CHỈ ADMIN hoặc chính người tạo (`validateRestorePermission`). */
export function restoreDocument(id: string): Promise<AxiosResponse<{ success: true; message: string; data: Document }>> {
  return axiosInstance.patch(`/documents/restore/${id}`);
}

/** [MỚI 2026-09-17, DEV-061] Xoá mềm hàng loạt — Batch Action Bar. Cùng guard ADMIN-only với `deleteDocument`. */
export function bulkDeleteDocuments(ids: string[]): Promise<AxiosResponse<{ success: true; message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/documents/bulk-delete", { ids });
}

/** [MỚI 2026-09-17, DEV-061] Khôi phục hàng loạt — Batch Action Bar. Cùng guard ADMIN-hoặc-người-tạo với `restoreDocument`. */
export function bulkRestoreDocuments(ids: string[]): Promise<AxiosResponse<{ success: true; message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/documents/bulk-restore", { ids });
}

/** Danh sách REPORT tham chiếu tới 1 PROPOSAL — dùng cho Document Detail (category=PROPOSAL). */
export function getReportsByProposal(
  proposalId: string,
): Promise<AxiosResponse<{ success: true; message: string; data: Document[] }>> {
  return axiosInstance.get(`/documents/${proposalId}/reports`);
}

/**
 * Roadmap A4 — lịch sử phiên bản nội dung (title/meta) ĐÃ BỊ thay thế, mới
 * nhất trước. Cùng permission/Policy ABAC với `getDocumentById` (department-
 * scoping giống hệt "xem chi tiết", xem `document.route.ts`).
 */
export function getDocumentVersions(
  id: string,
): Promise<AxiosResponse<{ success: true; message: string; data: DocumentVersion[] }>> {
  return axiosInstance.get(`/documents/${id}/versions`);
}

/** Khớp `DeleteDocumentsByMonthDTO`. Xoá hàng loạt theo tháng — SOFT-DELETE (KHÔNG phải xoá vĩnh viễn). */
export interface DeleteDocumentsByMonthRequest {
  month: number;
  year: number;
  category?: string;
  subType?: string;
  department?: string;
}
export function deleteDocumentsByMonth(
  body: DeleteDocumentsByMonthRequest,
): Promise<AxiosResponse<{ success: true; message: string; data: { deletedCount: number; skippedCount: number } }>> {
  return axiosInstance.delete("/documents/delete-by-month", { data: body });
}

/**
 * [MỚI 2026-09-18, DEV-064 — Roadmap B5] Xuất PDF chính thức — cùng
 * permission/Policy với `getDocumentById` (permission RỘNG hơn: ai xem được
 * chi tiết thì xuất được PDF của chính nó). `responseType:"blob"` — backend
 * trả file nhị phân trực tiếp (`Content-Type: application/pdf`), KHÔNG bọc
 * `{success,data}` như các endpoint khác trong file này.
 */
export function exportDocumentPdf(id: string): Promise<AxiosResponse<Blob>> {
  return axiosInstance.get(`/documents/${id}/export-pdf`, { responseType: "blob" });
}
