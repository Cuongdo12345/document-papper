import { useQuery } from "@tanstack/react-query";
import { getAssetWarrantyExpiring } from "@/api/dashboard.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Asset, AssetType } from "@/types/asset.types";
import type { GetAlertListParams } from "@/types/dashboard.types";

/**
 * Shape phẳng `{data:[...],pagination}` — dùng được `unwrapResponse()` (khác 4 hook KPI list). Mặc định `daysAhead=30`, khớp `assetAlerts.service.ts`.
 * FE-44: `options.assetType` lọc theo loại (xem `useDashboardAssetScope`); `options.enabled=false` khi người dùng không xem được loại nào.
 */
export function useAssetWarrantyExpiring(daysAhead: number, params: GetAlertListParams, options?: { assetType?: AssetType; enabled?: boolean }) {
  return useQuery({
    queryKey: ["dashboard", "assets", "warranty-expiring", options?.assetType ?? "ALL", daysAhead, params] as const,
    queryFn: async () => {
      const response = await getAssetWarrantyExpiring(daysAhead, params, options?.assetType);
      return unwrapResponse<Asset[]>(response);
    },
    placeholderData: (prev) => prev,
    staleTime: 20_000,
    enabled: options?.enabled ?? true,
  });
}
