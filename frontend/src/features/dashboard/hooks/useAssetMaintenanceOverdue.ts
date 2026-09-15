import { useQuery } from "@tanstack/react-query";
import { getAssetMaintenanceOverdue } from "@/api/dashboard.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { MaintenanceOverdueItem, GetAlertListParams } from "@/types/dashboard.types";

/** Mặc định `daysThreshold=7`, khớp `assetAlerts.service.ts`. */
export function useAssetMaintenanceOverdue(daysThreshold: number, params: GetAlertListParams) {
  return useQuery({
    queryKey: ["dashboard", "assets", "maintenance-overdue", daysThreshold, params] as const,
    queryFn: async () => {
      const response = await getAssetMaintenanceOverdue(daysThreshold, params);
      return unwrapResponse<MaintenanceOverdueItem[]>(response);
    },
    placeholderData: (prev) => prev,
    staleTime: 20_000,
  });
}
