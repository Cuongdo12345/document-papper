import type { AssetType } from "@/types/asset.types";

/** Đường dẫn API gốc (sau `/api`) của từng module tài sản — nguồn duy nhất cho mọi file `*.api.ts` của domain Asset. */
export const IT_ASSETS_API = "/it-assets";
export const MEDICAL_ASSETS_API = "/medical-assets";

export function assetApiBase(type: AssetType): string {
  return type === "IT" ? IT_ASSETS_API : MEDICAL_ASSETS_API;
}
