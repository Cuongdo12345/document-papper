/**
 * Notifications UI (roadmap Mục 18). Copy TRỰC TIẾP enum từ
 * `notification.types.ts` (backend, nguồn định nghĩa thật — `notification.model.ts`
 * chỉ re-export) — CLAUDE.md Mục 11.
 */
export const NOTIFICATION_TYPES = [
  "WORKFLOW_STEP_ASSIGNED",
  "WORKFLOW_APPROVED",
  "WORKFLOW_REJECTED",
  "DOCUMENT_SUBMITTED",
  "IMPORT_COMPLETED",
  "IMPORT_FAILED",
  "RBAC_CHANGED",
  "SYSTEM",
  "ASSET_WARRANTY_EXPIRING",
  "ASSET_MAINTENANCE_OVERDUE",
  "MEDICAL_DEVICE_CALIBRATION_DUE",
  // Roadmap B1 (SLA & nhắc việc Workflow) — xem trigger `workflowSlaAlerts.service.ts` (backend).
  "WORKFLOW_SLA_REMINDER",
  "WORKFLOW_SLA_ESCALATED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * `resourceType` dùng để build deep-link — CHỈ `Document`/`Asset` có route
 * chi tiết thật ở FE hiện tại (`/app/documents/:id`, `/app/assets/:id`).
 * `WorkflowInstance` (dùng cho `WORKFLOW_STEP_ASSIGNED`/`WORKFLOW_APPROVED`/
 * `WORKFLOW_REJECTED` — xem `workflow.service.ts`) trỏ tới ID của
 * WorkflowInstance, KHÔNG PHẢI Document — FE chưa có trang chi tiết theo ID
 * này (chỉ có `/app/workflows/pending`, một danh sách, không phải detail
 * theo ID). `ImportHistory` cũng chưa có trang nào (Upload/Excel UI chưa
 * làm). 2 loại này KHÔNG build được link — xem `resolveNotificationLink.ts`.
 */
export type NotificationResourceType = "Document" | "WorkflowInstance" | "ImportHistory" | "Asset";

export type NotificationPriority = "low" | "normal" | "high";

/** Khớp `INotification` (backend) — response list KHÔNG populate `createdBy`/`resourceId` (chỉ ObjectId thô, xem `notification.service.ts#getNotificationsForUser`). */
export interface NotificationItem {
  _id: string;
  recipient: string;
  createdBy?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: NotificationResourceType;
  resourceId?: string;
  isRead: boolean;
  readAt?: string;
  channelsSent: string[];
  priority: NotificationPriority;
  createdAt: string;
  updatedAt?: string;
}

/** Khớp `QueryNotificationDTO`. `recipient` KHÔNG có ở đây — backend LUÔN tự lấy từ `req.user._id`, không cho client truyền (chặn IDOR). */
export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
}

/**
 * Khớp response THẬT `getNotificationsForUser` — pagination field PHẲNG
 * ngay trong `data` (`page`/`limit`/`totalPages`), KHÔNG lồng `data.pagination`
 * như mọi domain khác — xem `notifications.api.ts`.
 */
export interface GetNotificationsResult {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* =====================================================================
   ADMIN — quản trị Notification (FE-13, 2026-09-10). Xem
   `docs/frontend/tasks/FE-13.md` cho bối cảnh đầy đủ.
===================================================================== */

/** Người dùng lite — populate ở `GET /notifications/admin` (KHÁC `GET /notifications` tự-scope, không populate). */
export interface NotificationUserRef {
  _id: string;
  username: string;
  fullName: string;
  email?: string;
}

/** Khớp response `GET /notifications/admin` — `recipient`/`createdBy` đã populate object, KHÁC `NotificationItem` (ObjectId thô). */
export interface AdminNotificationItem extends Omit<NotificationItem, "recipient" | "createdBy"> {
  recipient: NotificationUserRef | null;
  createdBy?: NotificationUserRef | null;
}

/** Khớp `QueryAllNotificationsDTO`. */
export interface GetAllNotificationsParams {
  page?: number;
  limit?: number;
  /** Lọc theo 1 user cụ thể (giám sát/debug) — KHÔNG có ở `GetNotificationsParams` tự-scope. */
  recipient?: string;
  isRead?: boolean;
  type?: NotificationType;
}

export interface GetAllNotificationsResult {
  items: AdminNotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type NotificationBroadcastScope = "ALL" | "ROLE" | "DEPARTMENT" | "USERS";

/** Khớp `BroadcastNotificationDTO`. */
export interface BroadcastNotificationRequest {
  title: string;
  message: string;
  priority?: NotificationPriority;
  sendEmail?: boolean;
  scope: NotificationBroadcastScope;
  roleName?: string;
  departmentId?: string;
  userIds?: string[];
}

export interface BroadcastNotificationResult {
  recipientCount: number;
}
