import { z } from "zod";
import {
  NotificationPriority,
  NotificationType,
} from "../../models/notifications/notification.model";
import { objectId } from "../common.dto";

/**
 * QueryNotificationDTO — dùng cho GET /api/notifications (list của chính
 * user đang đăng nhập). `recipient` KHÔNG nằm trong query — service luôn lấy
 * từ `req.user._id`, không cho client tự truyền để tránh IDOR (đọc
 * notification của người khác bằng cách đổi query param).
 */
export const QueryNotificationDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  isRead: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),

  type: z.enum(Object.values(NotificationType) as [string, ...string[]]).optional(),
});

/**
 * CreateNotificationDTO — KHÔNG mount lên route public. Dùng làm type hợp
 * đồng nội bộ cho `notification.service.ts` khi các service khác
 * (workflow.service.ts, document.service.ts...) gọi `createNotification`,
 * để có validate/autocomplete nhất quán thay vì truyền `any`.
 */
export const CreateNotificationDTO = z.object({
  recipient: z.string(), // ObjectId string, validate ở tầng service qua toOptionalObjectId
  createdBy: z.string().optional(),
  type: z.enum(Object.values(NotificationType) as [string, ...string[]]),
  title: z.string().min(1),
  message: z.string().min(1),
  resourceType: z.enum(["Document", "WorkflowInstance", "ImportHistory"]).optional(),
  resourceId: z.string().optional(),
  priority: z
    .enum(Object.values(NotificationPriority) as [string, ...string[]])
    .optional(),
  sendEmail: z.boolean().optional(), // true => cố gắng gửi thêm qua kênh email
});

export type CreateNotificationInput = z.infer<typeof CreateNotificationDTO>;

/* =====================================================================
   ADMIN — quản trị Notification (MỚI, 2026-09-10)
   Đề xuất khi user hỏi "admin có cần quản trị notification không?" — 2 nhu
   cầu tách biệt: (1) GỬI thủ công tới nhiều người, (2) XEM thông báo của
   người khác để giám sát/debug. Cả 2 đều KHÔNG dùng route/DTO tự-scope ở
   trên (những route đó CỐ TÌNH khoá cứng theo `req.user._id`, không có cửa
   nào cho phép truyền `recipient` tuỳ ý — đúng thiết kế chống IDOR ban đầu).
===================================================================== */

/**
 * BroadcastNotificationDTO — `POST /api/notifications/broadcast`
 * (permission `NOTIFICATION_BROADCAST`, mặc định CHỈ ADMIN có qua spread
 * `Object.values(PERMISSIONS)` ở `rolePermission.map.ts`, không tự gán thêm
 * role nào khác — cùng nguyên tắc `ROLE_VIEW`/`PERMISSION_VIEW`).
 *
 * `scope` quyết định field nào bắt buộc — validate chéo bằng `superRefine`
 * thay vì 4 DTO riêng (tránh trùng lặp field chung `title`/`message`/...).
 */
const BroadcastScopeEnum = z.enum(["ALL", "ROLE", "DEPARTMENT", "USERS"]);

export const BroadcastNotificationDTO = z
  .object({
    title: z.string().trim().min(1, "Tiêu đề không được để trống").max(200),
    message: z.string().trim().min(1, "Nội dung không được để trống").max(2000),
    priority: z
      .enum(Object.values(NotificationPriority) as [string, ...string[]])
      .optional(),
    // true => cố gắng gửi thêm qua email cho từng người nhận (best-effort,
    // tái dùng đúng cơ chế `sendEmailForNotification` đã có, không viết lại).
    sendEmail: z.boolean().optional(),
    scope: BroadcastScopeEnum,
    roleName: z.string().trim().optional(),
    departmentId: objectId("departmentId không hợp lệ").optional(),
    userIds: z
      .array(objectId("userId không hợp lệ"))
      .min(1)
      .max(200) // chặn payload quá lớn — cùng tinh thần giới hạn `actionSchema` ở userAudit.dto.ts
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "ROLE" && !data.roleName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["roleName"], message: "roleName bắt buộc khi scope=ROLE" });
    }
    if (data.scope === "DEPARTMENT" && !data.departmentId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["departmentId"], message: "departmentId bắt buộc khi scope=DEPARTMENT" });
    }
    if (data.scope === "USERS" && (!data.userIds || data.userIds.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["userIds"], message: "userIds bắt buộc khi scope=USERS" });
    }
  });

export type BroadcastNotificationInput = z.infer<typeof BroadcastNotificationDTO>;

/**
 * QueryAllNotificationsDTO — `GET /api/notifications/admin` (permission
 * `NOTIFICATION_VIEW_ALL`). Khác `QueryNotificationDTO`: có thêm `recipient`
 * (lọc theo 1 user cụ thể — mục đích giám sát/debug, KHÔNG có ở DTO tự-scope
 * vì ở đó `recipient` luôn ngầm định là chính người gọi).
 */
export const QueryAllNotificationsDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  recipient: objectId("recipient không hợp lệ").optional(),
  isRead: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  type: z.enum(Object.values(NotificationType) as [string, ...string[]]).optional(),
});
