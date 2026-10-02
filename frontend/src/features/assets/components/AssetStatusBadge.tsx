import { StatusBadge } from "@/components/shared/StatusBadge";
import { ASSET_STATUS_MAP } from "@/features/assets/constants/assetStatus.constants";
import type { AssetStatus } from "@/types/asset.types";

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const config = ASSET_STATUS_MAP[status];
  return <StatusBadge variant={config.variant}>{config.label}</StatusBadge>;
}
