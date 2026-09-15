import { StatusBadge } from "@/components/shared/StatusBadge";
import type { MedicalDeviceProfile } from "@/types/medicalDevice.types";

/** Ngưỡng cảnh báo — khớp CHÍNH XÁC `CALIBRATION_ALERT_DAYS_BEFORE` (`medicalDeviceAlerts.service.ts`), không tự bịa số khác backend. */
const CALIBRATION_ALERT_DAYS_BEFORE = 30;

export type CalibrationStatus = "NOT_REQUIRED" | "NO_RECORD" | "OK" | "DUE_SOON" | "OVERDUE";

const STATUS_CONFIG: Record<CalibrationStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" }> = {
  NOT_REQUIRED: { label: "Không yêu cầu kiểm định", variant: "default" },
  NO_RECORD: { label: "Chưa từng kiểm định", variant: "warning" },
  OK: { label: "Còn hạn kiểm định", variant: "success" },
  DUE_SOON: { label: "Sắp tới hạn kiểm định", variant: "warning" },
  OVERDUE: { label: "Đã quá hạn kiểm định", variant: "destructive" },
};

/**
 * Tính status THUẦN CLIENT (không gọi API riêng) — mirror đúng điều kiện
 * cron `checkCalibrationDueService` (`medicalDeviceAlerts.service.ts`): chỉ
 * xét profile có `requiresCalibration=true`, ngưỡng "sắp tới hạn" = 30 ngày.
 * Roadmap Mục 13: "không dùng màu làm nguồn thông tin duy nhất" — label chữ
 * luôn đi kèm màu, không chỉ dựa vào `variant`.
 */
export function computeCalibrationStatus(profile: Pick<MedicalDeviceProfile, "requiresCalibration" | "nextCalibrationDueDate">): CalibrationStatus {
  if (!profile.requiresCalibration) return "NOT_REQUIRED";
  if (!profile.nextCalibrationDueDate) return "NO_RECORD";

  const due = new Date(profile.nextCalibrationDueDate);
  const now = new Date();
  const diffDays = (due.getTime() - now.getTime()) / 86_400_000;

  if (diffDays < 0) return "OVERDUE";
  if (diffDays <= CALIBRATION_ALERT_DAYS_BEFORE) return "DUE_SOON";
  return "OK";
}

export function CalibrationStatusBadge({ profile }: { profile: Pick<MedicalDeviceProfile, "requiresCalibration" | "nextCalibrationDueDate"> }) {
  const status = computeCalibrationStatus(profile);
  const config = STATUS_CONFIG[status];
  return <StatusBadge variant={config.variant}>{config.label}</StatusBadge>;
}
