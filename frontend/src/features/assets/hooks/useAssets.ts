import { useQuery } from "@tanstack/react-query";
import { getAssets } from "@/api/assets.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AssetListItem, GetAssetsParams } from "@/types/asset.types";

/** TỐI THIỂU cho `AssetPicker` (chọn `relatedAsset`) — KHÔNG phải hook đầy đủ cho 1 trang Assets UI riêng. */
export function useAssets(params: GetAssetsParams, enabled = true) {
  return useQuery({
    queryKey: ["assets", "list", params] as const,
    queryFn: async () => {
      const response = await getAssets(params);
      return unwrapResponse<AssetListItem[]>(response);
    },
    enabled,
  });
}
