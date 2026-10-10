import { StatusBadge } from "@/components/shared/StatusBadge";
import { getLicenseExpiryState } from "@/features/softwareLicenses/constants/softwareLicense.constants";
import type { SoftwareLicenseListItem } from "@/types/softwareLicense.types";

/** Hạn dùng của bản quyền: vĩnh viễn không hiện badge; thuê bao hiện ngày + màu theo mức (còn hạn / sắp hết / đã hết). */
export function LicenseExpiryBadge({ license }: { license: Pick<SoftwareLicenseListItem, "licenseType" | "expiresAt" | "isExpired"> }) {
  const state = getLicenseExpiryState(license);
  if (state === "none" || !license.expiresAt) return <span className="text-muted-foreground">Vĩnh viễn</span>;

  const date = new Date(license.expiresAt).toLocaleDateString("vi-VN");
  if (state === "expired") return <StatusBadge variant="destructive">Đã hết hạn {date}</StatusBadge>;
  if (state === "expiring") return <StatusBadge variant="warning">Sắp hết hạn {date}</StatusBadge>;
  return <StatusBadge variant="success">Đến {date}</StatusBadge>;
}
