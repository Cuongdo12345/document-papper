import { useQuery } from "@tanstack/react-query";
import { getAssets } from "@/api/assets.api";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AssetListItem, GetAssetsParams } from "@/types/asset.types";

/** Danh sách tài sản của module hiện tại (CNTT hoặc y tế). Ô chọn tài sản ngoài module dùng `useAssetLookup`. */
export function useAssets(params: GetAssetsParams, enabled = true) {
  const { type } = useAssetModule();
  return useQuery({
    queryKey: ["assets", "list", type, params] as const,
    queryFn: async () => {
      const response = await getAssets(type, params);
      return unwrapResponse<AssetListItem[]>(response);
    },
    enabled,
  });
}
