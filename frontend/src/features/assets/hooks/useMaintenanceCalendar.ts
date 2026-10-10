import { useQuery } from "@tanstack/react-query";
import { getMaintenanceCalendar } from "@/api/assetMaintenancePlan.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AssetMaintenancePlan, GetMaintenanceCalendarParams } from "@/types/assetMaintenancePlan.types";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/** Roadmap B2 — lịch bảo trì theo tháng, xuyên suốt mọi asset (`MaintenanceCalendarPage`). */
export function useMaintenanceCalendar(params: GetMaintenanceCalendarParams) {
  const { type } = useAssetModule();
  return useQuery({
    queryKey: ["assets", "maintenance-calendar", type, params] as const,
    queryFn: async () => {
      const response = await getMaintenanceCalendar(type, params);
      return unwrapResponse<AssetMaintenancePlan[]>(response).data;
    },
    placeholderData: (prev) => prev,
  });
}
