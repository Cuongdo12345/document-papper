import { useQuery } from "@tanstack/react-query";
import { getAuditDashboard } from "@/api/audit.api";
import type { AuditDashboardParams } from "@/types/audit.types";

/**
 * Thống kê cho tab "Thống kê" (`AuditStatsTab`) — permission RIÊNG
 * `AUDIT_VIEW_DASHBOARD` (khác `AUDIT_VIEW` của tab "Nhật ký", KHÔNG phải
 * lúc nào cũng đi cùng nhau — `IT` chỉ có `AUDIT_VIEW`, xem
 * `rolePermission.map.ts`). `options.enabled` — Radix `Tabs.Content` không
 * mount tab chưa active nên về lý thuyết không cần, nhưng vẫn truyền tường
 * minh theo permission (phòng trường hợp `AuditStatsTab` bị dùng lại ở nơi
 * khác sau này, cùng thận trọng như `useAssetCategories`).
 */
export function useAuditDashboard(params: AuditDashboardParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["audit-logs", "dashboard", params] as const,
    queryFn: async () => {
      const response = await getAuditDashboard(params);
      return response.data;
    },
    enabled: options?.enabled,
  });
}
