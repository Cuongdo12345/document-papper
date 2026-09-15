import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { MonthlyTrendBars } from "@/features/dashboard/components/MonthlyTrendBars";
import { useDeviceDamageTrend } from "@/features/dashboard/hooks/useDeviceDamageTrend";
import { parseApiError } from "@/utils/parseApiError";

/** FE-09 — `GET /dashboard/kpi/device-damage-trend`: xu hướng số báo cáo "Kiểm tra hư hỏng" theo tháng, 12 tháng gần nhất. */
export function DeviceDamageTrendWidget() {
  const query = useDeviceDamageTrend({ page: 1, limit: 12, sortBy: "monthLabel", sortOrder: "asc" });

  if (query.isLoading) return <LoadingState variant="skeleton-table" />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error ? parseApiError(query.error).message : undefined} onRetry={() => query.refetch()} />;
  }

  const items = query.data.items;

  return (
    <MonthlyTrendBars
      categories={items.map((i) => i.monthLabel)}
      series={[{ label: "Báo cáo hư hỏng", color: "primary", data: items.map((i) => ({ label: i.monthLabel, value: i.totalReports })) }]}
    />
  );
}
