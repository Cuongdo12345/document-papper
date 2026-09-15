import { useQuery } from "@tanstack/react-query";
import { getAssetDashboardSummary } from "@/api/dashboard.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AssetDashboardSummary } from "@/types/dashboard.types";

export function useAssetDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "assets", "summary"] as const,
    queryFn: async () => {
      const response = await getAssetDashboardSummary();
      return unwrapResponse<AssetDashboardSummary>(response).data;
    },
    staleTime: 20_000,
  });
}
