import { useQuery } from "@tanstack/react-query";
import { getAssetDashboardSummary } from "@/api/dashboard.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AssetType } from "@/types/asset.types";
import type { AssetDashboardSummary } from "@/types/dashboard.types";

/** FE-44: `assetType` lọc theo loại (CNTT / y tế); `undefined` = cả hai loại. Khoá cache tách theo loại. */
export function useAssetDashboardSummary(assetType?: AssetType, enabled = true) {
  return useQuery({
    queryKey: ["dashboard", "assets", "summary", assetType ?? "ALL"] as const,
    queryFn: async () => {
      const response = await getAssetDashboardSummary(assetType);
      return unwrapResponse<AssetDashboardSummary>(response).data;
    },
    staleTime: 20_000,
    enabled,
  });
}
