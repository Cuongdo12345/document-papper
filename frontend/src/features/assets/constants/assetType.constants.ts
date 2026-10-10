import type { AssetType } from "@/types/asset.types";

/** DEV-112 (tách module Tài sản): nhãn loại tài sản, khớp `ASSET_TYPE_LABELS` ở backend. */
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  IT: "Thiết bị CNTT",
  MEDICAL: "Thiết bị y tế",
};

export const ASSET_TYPE_OPTIONS = (Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((value) => ({
  value,
  label: ASSET_TYPE_LABELS[value],
}));
