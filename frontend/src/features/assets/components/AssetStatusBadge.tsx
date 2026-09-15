import { StatusBadge } from "@/components/shared/StatusBadge";
import type { AssetStatus } from "@/types/asset.types";

/** Mapping RIÊNG cho `AssetStatus` (6 giá trị) — KHÔNG dùng chung bảng màu với `workflowStatus` (FE_UI_DEVELOPMENT_ROADMAP.md Mục 3: "Status color phải có mapping riêng cho workflowStatus/AssetStatus"). */
const ASSET_STATUS_MAP: Record<AssetStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "primary" }> = {
  IN_STOCK: { label: "Trong kho", variant: "info" },
  IN_USE: { label: "Đang sử dụng", variant: "success" },
  UNDER_MAINTENANCE: { label: "Đang bảo trì", variant: "warning" },
  RESERVED: { label: "Đã giữ chỗ", variant: "primary" },
  DISPOSED: { label: "Đã thanh lý", variant: "default" },
  LOST: { label: "Thất lạc/mất", variant: "destructive" },
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const config = ASSET_STATUS_MAP[status];
  return <StatusBadge variant={config.variant}>{config.label}</StatusBadge>;
}
