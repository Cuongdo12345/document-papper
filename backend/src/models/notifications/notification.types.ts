// models/notifications/notification.types.ts
import { Types } from "mongoose";

/* ===== ENUM =====
 * NOTE: mỗi giá trị type khớp với 1 điểm trigger cụ thể trong service khác
 * (xem comment tại nơi gọi `createNotification` trong workflow.service.ts,
 * document.service.ts, excel.service.ts, rbac.service.ts) — không thêm type
 * "chung chung" (vd "INFO") vì sẽ mất khả năng deep-link đúng resource ở FE.
 */
export enum NotificationType {
  WORKFLOW_STEP_ASSIGNED = "WORKFLOW_STEP_ASSIGNED",
  WORKFLOW_APPROVED = "WORKFLOW_APPROVED",
  WORKFLOW_REJECTED = "WORKFLOW_REJECTED",
  DOCUMENT_SUBMITTED = "DOCUMENT_SUBMITTED",
  IMPORT_COMPLETED = "IMPORT_COMPLETED",
  IMPORT_FAILED = "IMPORT_FAILED",
  RBAC_CHANGED = "RBAC_CHANGED",
  SYSTEM = "SYSTEM",
  // 🔗 Giai đoạn 4 (module Asset) — bổ sung thêm, không đổi giá trị cũ.
  // Xem trigger tại `assetAlerts.service.ts` (cron job hằng ngày).
  ASSET_WARRANTY_EXPIRING = "ASSET_WARRANTY_EXPIRING",
  ASSET_MAINTENANCE_OVERDUE = "ASSET_MAINTENANCE_OVERDUE",
  // 🔗 Giai đoạn 3 (module Quản lý Thiết bị Y tế) — bổ sung thêm, không đổi
  // giá trị cũ. Xem trigger tại `medicalDeviceAlerts.service.ts` (cron job
  // hằng ngày). Dùng CHUNG 1 type cho cả 2 trường hợp "sắp tới hạn" và "đã
  // quá hạn" kiểm định — phân biệt qua `title`/`message` khi gửi, đúng
  // pattern đã áp dụng ở `ASSET_WARRANTY_EXPIRING` (xem
  // `checkWarrantyExpiringService`), KHÔNG tách 2 type riêng vì
  // module-quan-ly-thiet-bi-y-te.md §3 chỉ định rõ đây là "gửi 1 lần,
  // giống cảnh báo bảo hành" — không phải kiểu nhắc lặp lại như
  // `ASSET_MAINTENANCE_OVERDUE`.
  MEDICAL_DEVICE_CALIBRATION_DUE = "MEDICAL_DEVICE_CALIBRATION_DUE",
  // Roadmap B1 (SLA & nhắc việc Workflow, 2026-09-15) — bổ sung thêm, không
  // đổi giá trị cũ. Xem trigger tại `workflowSlaAlerts.service.ts` (cron job
  // hằng ngày). 2 type RIÊNG BIỆT (không dùng chung 1 type như
  // `MEDICAL_DEVICE_CALIBRATION_DUE`) vì đây là 2 mức độ nghiêm trọng khác
  // hẳn nhau về người nhận: REMINDER gửi cho ĐÚNG người duyệt bước đó,
  // ESCALATED gửi cho ADMIN (người không liên quan tới bước gốc) — tách type
  // giúp FE lọc/hiển thị icon khác nhau dễ hơn là chỉ dựa vào title/message.
  WORKFLOW_SLA_REMINDER = "WORKFLOW_SLA_REMINDER",
  WORKFLOW_SLA_ESCALATED = "WORKFLOW_SLA_ESCALATED",
  // Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15) — bổ sung thêm, không
  // đổi giá trị cũ. Xem trigger tại `consumableAlerts.service.ts` (cron job
  // hằng ngày). Gửi 1 LẦN khi tồn kho xuống ≤ ngưỡng, reset lại khi nhập
  // hàng vượt ngưỡng — cùng pattern `ASSET_WARRANTY_EXPIRING`.
  CONSUMABLE_LOW_STOCK = "CONSUMABLE_LOW_STOCK",
  // Roadmap B4 (Quản lý nhà cung cấp & hợp đồng bảo trì, 2026-09-16) — bổ
  // sung thêm, không đổi giá trị cũ. Xem trigger tại
  // `contractAlerts.service.ts` (cron job hằng ngày). Gửi 1 lần khi hợp đồng
  // còn ≤30 ngày tới hạn, reset lại khi sửa `endDate` — cùng pattern
  // `ASSET_WARRANTY_EXPIRING`.
  CONTRACT_EXPIRING = "CONTRACT_EXPIRING",
}

/**
 * Polymorphic resource reference — cho phép 1 Notification trỏ tới nhiều loại
 * model khác nhau (Document/WorkflowInstance/ImportHistory...) mà không cần
 * 1 field ref riêng cho từng loại. `resourceType` PHẢI khớp đúng 1 trong các
 * giá trị enum bên dưới — dùng để FE biết build link nào (vd
 * `/documents/:id` vs `/workflows/:id`) và để service biết populate model nào.
 */
export enum NotificationResourceType {
  DOCUMENT = "Document",
  WORKFLOW_INSTANCE = "WorkflowInstance",
  IMPORT_HISTORY = "ImportHistory",
  // 🔗 Giai đoạn 4 (module Asset)
  ASSET = "Asset",
  // 🔗 Roadmap B3 (module Quản lý vật tư tiêu hao)
  CONSUMABLE_ITEM = "ConsumableItem",
  // 🔗 Roadmap B4 (module Quản lý nhà cung cấp & hợp đồng bảo trì)
  CONTRACT = "Contract",
}

export enum NotificationChannel {
  IN_APP = "in_app",
  EMAIL = "email",
}

export enum NotificationPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
}

/* ===== INTERFACE ===== */

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
