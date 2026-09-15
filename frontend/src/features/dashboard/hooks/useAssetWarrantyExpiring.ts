import { useQuery } from "@tanstack/react-query";
import { getAssetWarrantyExpiring } from "@/api/dashboard.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Asset } from "@/types/asset.types";
import type { GetAlertListParams } from "@/types/dashboard.types";

/** Shape phẳng `{data:[...],pagination}` — dùng được `unwrapResponse()` (khác 4 hook KPI list). Mặc định `daysAhead=30`, khớp `assetAlerts.service.ts`. */
export function useAssetWarrantyExpiring(daysAhead: number, params: GetAlertListParams) {
  return useQuery({
    queryKey: ["dashboard", "assets", "warranty-expiring", daysAhead, params] as const,
    queryFn: async () => {
      const response = await getAssetWarrantyExpiring(daysAhead, params);
      return unwrapResponse<Asset[]>(response);
    },
    placeholderData: (prev) => prev,
    staleTime: 20_000,
  });
}
