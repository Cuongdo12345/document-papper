/**
 * Khớp `workflowInstance.model.ts`/`workflowTemplate.model.ts` thật (FE-04).
 * `GET /workflows/templates` là endpoint MỚI (bổ sung ở FE-04, xem
 * `docs/development/tasks/DEV-028.md`) — trước đây chỉ có POST tạo, không
 * có cách liệt kê lại.
 */
export interface WorkflowTemplateStep {
  stepOrder: number;
  name: string;
  role: string;
}

export interface WorkflowTemplate {
  _id: string;
  name: string;
  steps: WorkflowTemplateStep[];
  isActive: boolean;
  createdAt?: string;
}

export type WorkflowInstanceStatus = "pending" | "approved" | "rejected" | "cancelled" | "completed";
export type WorkflowStepStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface WorkflowInstanceStep {
  stepOrder: number;
  name: string;
  role: string;
  approvedBy?: { _id: string; username: string; fullName: string } | string | null;
  status: WorkflowStepStatus;
  comment?: string;
  approvedAt?: string;
}

export interface WorkflowInstance {
  _id: string;
  documentId: string;
  templateId: { _id: string; name: string } | string;
  currentStep: number;
  status: WorkflowInstanceStatus;
  steps: WorkflowInstanceStep[];
  createdAt: string;
  updatedAt: string;
}

/** Khớp `SubmitWorkflowDTO`. */
export interface SubmitWorkflowRequest {
  documentId: string;
  templateId: string;
}

/**
 * FE-05 — Workflow UI (Duyệt/Từ chối/Huỷ/Hoàn tất), roadmap Mục 11.
 * Khớp `ApproveRejectBodyDTO`/`CancelWorkflowBodyDTO`/`CompleteWorkflowBodyDTO`
 * (backend) — cả 4 endpoint đều nhận body `{comment?}`, `comment` LUÔN optional
 * ở tầng backend (kể cả reject) — FE tự quyết định UX bắt buộc nhập hay không,
 * không đổi hợp đồng API.
 */
export interface WorkflowActionRequest {
  comment?: string;
}

/**
 * `GET /workflows/pending` populate `documentId` thành object (khác
 * `WorkflowInstance.documentId` raw string dùng ở nơi khác, vd
 * `getWorkflowByDocument`) — xem `getPendingApprovalsForRole()`
 * (`workflow.service.ts`, `.populate("documentId", "documentCode title subType")`).
 */
export interface WorkflowPendingItem extends Omit<WorkflowInstance, "documentId"> {
  documentId: { _id: string; documentCode: string; title: string; subType: string };
}

export interface GetPendingApprovalsParams {
  page?: number;
  limit?: number;
}

/**
 * MỚI (2026-09-10, user yêu cầu trực tiếp) — "Lịch sử duyệt", khớp
 * `GET /workflows/history`. Response populate `documentId` GIỐNG HỆT
 * `/pending` (cùng `.populate("documentId", "documentCode title subType")`
 * ở `getWorkflowHistoryForUser`) — tái dùng `WorkflowPendingItem`, không
 * tạo type trùng lặp dù tên "Pending" hơi lệch ngữ nghĩa (item ở đây có thể
 * KHÔNG còn pending — chấp nhận vì shape THẬT giống hệt, đổi tên sẽ phải
 * sửa cả `usePendingApprovals.ts`/`PendingApprovalsPage.tsx` không cần thiết).
 */
export type WorkflowHistoryItem = WorkflowPendingItem;

export interface GetWorkflowHistoryParams {
  page?: number;
  limit?: number;
  status?: WorkflowInstanceStatus;
}
