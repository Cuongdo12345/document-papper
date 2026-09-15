import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination } from "@/types/shared.types";
import type {
  GetPendingApprovalsParams,
  GetWorkflowHistoryParams,
  SubmitWorkflowRequest,
  WorkflowActionRequest,
  WorkflowHistoryItem,
  WorkflowInstance,
  WorkflowPendingItem,
  WorkflowTemplate,
} from "@/types/workflow.types";

/**
 * API layer domain Workflow. FE-04 chỉ làm phần đọc (hiển thị trạng thái +
 * submit); FE-05 bổ sung phần hành động (Duyệt/Từ chối/Huỷ/Hoàn tất) + hộp
 * thư chờ duyệt — roadmap Mục 11, CHỦ ĐÍCH tách riêng khỏi FE-04.
 */

/** `GET /workflows/templates` — endpoint MỚI bổ sung ở FE-04 (đọc-only), xem `docs/development/tasks/DEV-028.md`. */
export function getWorkflowTemplates(): Promise<AxiosResponse<{ success: true; message: string; data: WorkflowTemplate[] }>> {
  return axiosInstance.get("/workflows/templates");
}

/** 404 nếu document CHƯA từng được submit vào workflow nào (`getWorkflowByDocument` throw `notFound`, không trả `null`). */
export function getWorkflowByDocument(
  documentId: string,
): Promise<AxiosResponse<{ success: true; message: string; data: WorkflowInstance }>> {
  return axiosInstance.get(`/workflows/document/${documentId}`);
}

export function submitWorkflow(
  body: SubmitWorkflowRequest,
): Promise<AxiosResponse<{ success: true; message: string; data: WorkflowInstance }>> {
  return axiosInstance.post("/workflows/submit", body);
}

/** `GET /workflows/pending` — "hộp thư chờ duyệt", backend tự lọc theo `req.user.role.name`, FE không cần (và không thể) tự truyền role. */
export function getPendingApprovals(
  params: GetPendingApprovalsParams,
): Promise<AxiosResponse<{ success: true; data: WorkflowPendingItem[]; pagination: Pagination }>> {
  return axiosInstance.get("/workflows/pending", { params });
}

/**
 * `GET /workflows/history` (MỚI, 2026-09-10) — "Lịch sử duyệt", khác
 * `/pending`: trả CẢ workflow đã kết thúc, filter `status` tuỳ chọn, sort
 * mới nhất trước. Xem giải thích đầy đủ ở `getWorkflowHistoryForUser`
 * (backend).
 */
export function getWorkflowHistory(
  params: GetWorkflowHistoryParams,
): Promise<AxiosResponse<{ success: true; data: WorkflowHistoryItem[]; pagination: Pagination }>> {
  return axiosInstance.get("/workflows/history", { params });
}

export function approveWorkflow(
  id: string,
  body: WorkflowActionRequest,
): Promise<AxiosResponse<{ success: true; message: string; data: WorkflowInstance }>> {
  return axiosInstance.post(`/workflows/${id}/approve`, body);
}

export function rejectWorkflow(
  id: string,
  body: WorkflowActionRequest,
): Promise<AxiosResponse<{ success: true; message: string; data: WorkflowInstance }>> {
  return axiosInstance.post(`/workflows/${id}/reject`, body);
}

export function cancelWorkflow(
  id: string,
  body: WorkflowActionRequest,
): Promise<AxiosResponse<{ success: true; message: string; data: WorkflowInstance }>> {
  return axiosInstance.post(`/workflows/${id}/cancel`, body);
}

export function completeWorkflow(
  id: string,
  body: WorkflowActionRequest,
): Promise<AxiosResponse<{ success: true; message: string; data: WorkflowInstance }>> {
  return axiosInstance.post(`/workflows/${id}/complete`, body);
}
