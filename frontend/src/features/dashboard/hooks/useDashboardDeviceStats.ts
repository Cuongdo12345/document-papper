import { useQuery } from "@tanstack/react-query";
import { getDashboardDeviceStats } from "@/api/dashboard.api";
import type { GetDeviceStatsParams } from "@/types/dashboard.types";

/**
 * `month`/`year` BẮT BUỘC ở backend (400 nếu thiếu) — `enabled` gate ở
 * component (widget có picker tháng/năm, mặc định tháng/năm hiện tại, luôn
 * có giá trị hợp lệ trước khi query chạy). `data` lồng `{items,pagination}`
 * — xem comment `useProposalConversion.ts`.
 */
export function useDashboardDeviceStats(params: GetDeviceStatsParams, enabled = true) {
  return useQuery({
    queryKey: ["dashboard", "kpi", "device-stats", params] as const,
    queryFn: async () => {
      const response = await getDashboardDeviceStats(params);
      return response.data.data;
    },
    enabled,
    placeholderData: (prev) => prev,
    staleTime: 20_000,
  });
}
