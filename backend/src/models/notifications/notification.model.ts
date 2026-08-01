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
      index: true,
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

export const Notification = model<INotification>(
  "Notification",
  NotificationSchema,
);
