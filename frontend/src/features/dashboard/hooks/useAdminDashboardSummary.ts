import { useQuery } from "@tanstack/react-query";
import { getAdminDashboardSummary } from "@/api/dashboard.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AdminDashboardSummary } from "@/types/dashboard.types";

/**
 * `GET /dashboard/admin-summary` — CHỈ ADMIN được xem (business rule trong
 * `adminDashboardSummary()` controller, KHẮT KHE HƠN route-level
 * `DASHBOARD_READ`) — component gọi hook này PHẢI tự kiểm tra `isSystemRole`
 * (qua `useIsAdmin()`, FE-16) trước khi `enabled`, tránh gọi API chắc chắn
 * 403 cho non-ADMIN có `DASHBOARD_READ`.
 */
export function useAdminDashboardSummary(enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard", "admin-summary"] as const,
    queryFn: async () => {
      const response = await getAdminDashboardSummary();
      return unwrapResponse<AdminDashboardSummary>(response).data;
    },
    enabled,
    staleTime: 20_000, // Server cache TTL 30s (`DASHBOARD_CACHE_TTL_MS`) — không cần refetch dày hơn ngưỡng đó.
  });
}
