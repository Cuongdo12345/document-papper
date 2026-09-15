import { useQuery } from "@tanstack/react-query";
import { getAssetById } from "@/api/assets.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AssetListItem } from "@/types/asset.types";

/** TỐI THIỂU — chỉ để resolve tên asset hiển thị ở Document Detail (`relatedAsset` không được populate ở Document API). */
export function useAsset(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["assets", "detail", id] as const,
    queryFn: async () => {
      const response = await getAssetById(id!);
      return unwrapResponse<AssetListItem>(response).data;
    },
    enabled: !!id && enabled,
  });
}
