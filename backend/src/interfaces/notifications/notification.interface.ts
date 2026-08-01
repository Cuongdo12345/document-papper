import type { Types } from "mongoose";
import type {
  NotificationChannel,
  NotificationPriority,
  NotificationResourceType,
  NotificationType,
} from "../../models/notifications/notification.types";

export interface INotification {
  // Người nhận — bắt buộc, đây là chủ sở hữu bản ghi (dùng để chặn user A
  // đọc/đánh dấu-đã-đọc notification của user B, xem notification.service.ts).
  recipient: Types.ObjectId;

  // Ai/hệ thống tạo ra thông báo. Optional vì có thể do cron/system job tạo
  // (không có user thực hiện, ví dụ nhắc hạn workflow).
  createdBy?: Types.ObjectId;

  type: NotificationType;

  title: string;
  message: string;

  // Resource liên quan — optional vì loại SYSTEM có thể không trỏ tới đâu cả.
  resourceType?: NotificationResourceType;
  resourceId?: Types.ObjectId;

  isRead: boolean;
  readAt?: Date;

  // Kênh ĐÃ gửi thành công (không phải kênh dự định gửi) — dùng để tránh gửi
  // trùng email nếu retry, và để debug khi user báo "không nhận được email".
  channelsSent: NotificationChannel[];

  priority: NotificationPriority;

  createdAt?: Date;
  updatedAt?: Date;
}
