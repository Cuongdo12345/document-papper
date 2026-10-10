import { useQuery } from "@tanstack/react-query";
import { getAssetMaintenanceOverdue } from "@/api/dashboard.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AssetType } from "@/types/asset.types";
import type { MaintenanceOverdueItem, GetAlertListParams } from "@/types/dashboard.types";

/** Mặc định `daysThreshold=7`, khớp `assetAlerts.service.ts`. FE-44: `options.assetType`/`enabled` — xem `useAssetWarrantyExpiring`. */
export function useAssetMaintenanceOverdue(daysThreshold: number, params: GetAlertListParams, options?: { assetType?: AssetType; enabled?: boolean }) {
  return useQuery({
    queryKey: ["dashboard", "assets", "maintenance-overdue", options?.assetType ?? "ALL", daysThreshold, params] as const,
    queryFn: async () => {
      const response = await getAssetMaintenanceOverdue(daysThreshold, params, options?.assetType);
      return unwrapResponse<MaintenanceOverdueItem[]>(response);
    },
    placeholderData: (prev) => prev,
    staleTime: 20_000,
    enabled: options?.enabled ?? true,
  });
}
