import { useQuery } from "@tanstack/react-query";
import { getDeviceDamageTrend } from "@/api/dashboard.api";
import type { GetDeviceDamageTrendParams } from "@/types/dashboard.types";

/** `data` lồng `{items,pagination}` — xem comment `useProposalConversion.ts`. */
export function useDeviceDamageTrend(params: GetDeviceDamageTrendParams) {
  return useQuery({
    queryKey: ["dashboard", "kpi", "device-damage-trend", params] as const,
    queryFn: async () => {
      const response = await getDeviceDamageTrend(params);
      return response.data.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 20_000,
  });
}
