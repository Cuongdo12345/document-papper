import type { NotificationType } from "@/types/notification.types";

/** Nhãn tiếng Việt — chỉ text thuần (KHÔNG dùng `StatusBadge` màu, 11 giá trị không mang ý nghĩa trạng thái/mức độ nghiêm trọng như `AuditAction`, chỉ là phân loại). */
const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  WORKFLOW_STEP_ASSIGNED: "Cần duyệt",
  WORKFLOW_APPROVED: "Đã duyệt",
  WORKFLOW_REJECTED: "Bị từ chối",
  DOCUMENT_SUBMITTED: "Tài liệu mới",
  IMPORT_COMPLETED: "Import hoàn tất",
  IMPORT_FAILED: "Import lỗi",
  RBAC_CHANGED: "Thay đổi phân quyền",
  SYSTEM: "Hệ thống",
  ASSET_WARRANTY_EXPIRING: "Sắp hết bảo hành",
  ASSET_MAINTENANCE_OVERDUE: "Bảo trì quá hạn",
  MEDICAL_DEVICE_CALIBRATION_DUE: "Đến hạn kiểm định",
  MEDICAL_DEVICE_LICENSE_EXPIRING: "Sắp hết hạn giấy phép lưu hành",
  OPERATOR_CERTIFICATE_EXPIRING: "Sắp hết hạn chứng chỉ vận hành",
  SOFTWARE_LICENSE_EXPIRING: "Sắp hết hạn bản quyền phần mềm",
  WORKFLOW_SLA_REMINDER: "Nhắc duyệt trễ hạn",
  WORKFLOW_SLA_ESCALATED: "Duyệt quá hạn — cần can thiệp",
};

export function getNotificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_TYPE_LABEL[type] ?? type;
}

export function NotificationTypeLabel({ type }: { type: NotificationType }) {
  return <span className="text-xs text-muted-foreground">{getNotificationTypeLabel(type)}</span>;
}
