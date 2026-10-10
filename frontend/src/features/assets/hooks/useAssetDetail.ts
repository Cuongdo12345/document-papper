import { useQuery } from "@tanstack/react-query";
import { getAssetDetail } from "@/api/assets.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Asset } from "@/types/asset.types";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/** FE-06 — trang Detail đầy đủ (khác `useAsset.ts` FE-04, chỉ resolve tên asset tối thiểu). */
export function useAssetDetail(id: string | undefined) {
  const { type } = useAssetModule();
  return useQuery({
    queryKey: ["assets", "detail", id] as const,
    queryFn: async () => {
      const response = await getAssetDetail(type, id!);
      return unwrapResponse<Asset>(response).data;
    },
    enabled: !!id,
  });
}
