import type { AssetStatus } from "@/types/asset.types";

/**
 * Mapping RIÊNG cho `AssetStatus` (6 giá trị) — KHÔNG dùng chung bảng màu với
 * `workflowStatus` (FE_UI_DEVELOPMENT_ROADMAP.md Mục 3: "Status color phải có
 * mapping riêng cho workflowStatus/AssetStatus").
 *
 * [MỚI DEV-083] Tách ra file riêng (trước đây định nghĩa cục bộ ở
 * `AssetStatusBadge.tsx`) — để file đó CHỈ export component (oxlint
 * `react/only-export-components`, giữ nguyên baseline warning, cùng cách đã
 * xử lý `getInitials.ts` ở DEV-079). Dùng CHUNG 1 nguồn nhãn duy nhất thay vì
 * để `AssetsListPage.tsx` tự định nghĩa `STATUS_LABEL` trùng lặp.
 */
export const ASSET_STATUS_MAP: Record<
  AssetStatus,
  { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "primary" }
> = {
  IN_STOCK: { label: "Trong kho", variant: "info" },
  IN_USE: { label: "Đang sử dụng", variant: "success" },
  UNDER_MAINTENANCE: { label: "Đang bảo trì", variant: "warning" },
  RESERVED: { label: "Đã giữ chỗ", variant: "primary" },
  DISPOSED: { label: "Đã thanh lý", variant: "default" },
  LOST: { label: "Thất lạc/mất", variant: "destructive" },
};
