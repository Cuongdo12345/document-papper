import { useQuery } from "@tanstack/react-query";
import { getMaintenancePlansForAsset } from "@/api/assetMaintenancePlan.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AssetMaintenancePlan, GetMaintenancePlanHistoryParams } from "@/types/assetMaintenancePlan.types";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/** Roadmap B2 — lịch sử kế hoạch bảo trì theo 1 asset (`AssetDetailPage`). */
export function useMaintenancePlansForAsset(assetId: string | undefined, params: GetMaintenancePlanHistoryParams) {
  const { type } = useAssetModule();
  return useQuery({
    queryKey: ["assets", "maintenance-plans", assetId, params] as const,
    queryFn: async () => {
      const response = await getMaintenancePlansForAsset(type, assetId!, params);
      return unwrapResponse<AssetMaintenancePlan[]>(response);
    },
    enabled: !!assetId,
    placeholderData: (prev) => prev,
  });
}
