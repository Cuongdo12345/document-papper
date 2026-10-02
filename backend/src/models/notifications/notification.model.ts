// models/notifications/notification.model.ts
import { Schema, model } from "mongoose";
import {
  INotification,
  NotificationChannel,
  NotificationPriority,
  NotificationResourceType,
  NotificationType,
} from "./notification.types";

// Re-export để các file đang import enum/interface trực tiếp từ
// `notification.model.ts` (vd `workflow.service.ts`, `notification.dto.ts`)
// không phải sửa lại đường dẫn import — giữ nguyên API bề mặt của module,
// chỉ tách nơi ĐỊNH NGHĨA thực sự sang `notification.types.ts`.
export {
  INotification,
  NotificationChannel,
  NotificationPriority,
  NotificationResourceType,
  NotificationType,
};

/* ===== SCHEMA ===== */

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // BR-19 (DEV-109): KHÔNG khai `index: true` ở đây — index đơn `{recipient}`
      // là tiền tố của `{recipient, createdAt}`/`{recipient, isRead, createdAt}`
      // bên dưới, giữ thêm chỉ làm chậm ghi và tốn RAM.
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },

    title: { type: String, required: true },
    message: { type: String, required: true },

    resourceType: {
      type: String,
      enum: Object.values(NotificationResourceType),
    },

    resourceId: {
      type: Schema.Types.ObjectId,
      // Không dùng `ref` tĩnh ở đây vì resourceId có thể trỏ tới nhiều model
      // khác nhau tuỳ `resourceType` (dynamic ref) — populate được xử lý thủ
      // công ở tầng service (`populateNotificationResource`), không dùng
      // Mongoose `refPath` để giữ tường minh và dễ audit.
    },

    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },

    channelsSent: {
      type: [String],
      enum: Object.values(NotificationChannel),
      default: [],
    },

    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.NORMAL,
    },
  },
  { timestamps: true },
);

/* ===== INDEX =====
 * Query chính (99% traffic của module này): "danh sách của 1 user, ưu tiên
 * chưa đọc, mới nhất trước". Compound index dưới đây cho phép Mongo dùng
 * thẳng index cho cả filter (recipient [+ isRead]) lẫn sort (createdAt),
 * không phải sort trong bộ nhớ — cùng pattern đã áp dụng ở
 * UserAuditSchema.index({ user: 1, createdAt: -1 }).
 */
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

/**
 * Lookup theo resource — dùng khi cần "tất cả notification đã tạo cho
 * document/workflow X" (ví dụ để debug hoặc hiển thị timeline trên FE).
 */
NotificationSchema.index({ resourceType: 1, resourceId: 1 });

/**
 * BR-13 (DEV-110, 2026-09-30) — TTL: tự xoá thông báo cũ hơn 90 ngày (user chốt).
 * Trước đây không có chính sách lưu giữ nên collection chỉ tăng. Thông báo là dữ
 * liệu tạm (chuông thông báo/email), không phải log kiểm toán — khác `UserAudit`
 * (chưa đặt TTL, chờ chốt yêu cầu lưu trữ tuân thủ).
 *
 * ⚠️ Tạo index này trên collection ĐÃ CÓ DỮ LIỆU sẽ xoá NGAY các bản ghi cũ hơn
 * mốc ở lần quét TTL đầu tiên (cùng cảnh báo ở `apiPerformance.model.ts`).
 */
export const NOTIFICATION_RETENTION_DAYS = 90;
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * NOTIFICATION_RETENTION_DAYS },
);

export const Notification = model<INotification>(
  "Notification",
  NotificationSchema,
);
