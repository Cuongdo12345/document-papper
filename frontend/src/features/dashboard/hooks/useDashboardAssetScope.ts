import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import type { AssetType } from "@/types/asset.types";

/**
 * FE-44 — phạm vi loại tài sản mà các widget Dashboard (cảnh báo bảo hành/bảo trì, số lượng) được hiển thị cho người dùng:
 *   - xem được cả hai loại → `assetType` = `undefined` (backend trả tổng hợp cả hai, như trước);
 *   - chỉ xem được một loại → ép `assetType` loại đó (backend lọc; không lộ số liệu loại kia);
 *   - không xem được loại nào → `canViewAny = false` (widget không gọi API).
 */
export function useDashboardAssetScope(): { canViewIt: boolean; canViewMedical: boolean; canViewAny: boolean; assetType: AssetType | undefined } {
  const { hasPermission } = usePermission();
  const canViewIt = hasPermission(PERMISSIONS.IT_ASSET_VIEW);
  const canViewMedical = hasPermission(PERMISSIONS.MEDICAL_ASSET_VIEW);
  const assetType: AssetType | undefined = canViewIt && canViewMedical ? undefined : canViewIt ? "IT" : canViewMedical ? "MEDICAL" : undefined;
  return { canViewIt, canViewMedical, canViewAny: canViewIt || canViewMedical, assetType };
}
