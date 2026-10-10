import type { SoftwareLicenseListItem, SoftwareLicenseType } from "@/types/softwareLicense.types";

export const LICENSE_TYPE_LABELS: Record<SoftwareLicenseType, string> = {
  PERPETUAL: "Vĩnh viễn",
  SUBSCRIPTION: "Thuê bao",
};

/** Số ngày trước hạn coi là "sắp hết hạn" — khớp ngưỡng cảnh báo của backend (`softwareLicenseAlerts.service.ts`, 30 ngày). */
export const LICENSE_EXPIRING_SOON_DAYS = 30;

export type LicenseExpiryState = "none" | "ok" | "expiring" | "expired";

/** Trạng thái hạn dùng để chọn màu badge. `isExpired` do backend tính; "sắp hết hạn" tính ở client theo ngưỡng 30 ngày. */
export function getLicenseExpiryState(license: Pick<SoftwareLicenseListItem, "licenseType" | "expiresAt" | "isExpired">, now = new Date()): LicenseExpiryState {
  if (license.licenseType === "PERPETUAL" || !license.expiresAt) return "none";
  if (license.isExpired) return "expired";
  const msLeft = new Date(license.expiresAt).getTime() - now.getTime();
  return msLeft <= LICENSE_EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000 ? "expiring" : "ok";
}
