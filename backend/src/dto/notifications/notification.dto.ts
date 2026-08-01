import { z } from "zod";
import {
  NotificationPriority,
  NotificationType,
} from "../../models/notifications/notification.model";

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
