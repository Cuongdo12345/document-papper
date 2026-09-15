import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { useTopDamagedDevices, useTopDamagedInk } from "@/features/dashboard/hooks/useTopDamaged";
import { parseApiError } from "@/utils/parseApiError";
import type { TopDamagedItem } from "@/types/dashboard.types";

function buildColumns(nameHeader: string): DataTableColumn<TopDamagedItem>[] {
  return [
    { key: "deviceName", header: nameHeader, className: "max-w-64 truncate" },
    { key: "totalBroken", header: "Số lượng hỏng", className: "text-right" },
    { key: "totalReports", header: "Số báo cáo", className: "text-right" },
  ];
}

/** FE-09 — `GET /dashboard/kpi/top-damaged-devices`: "Kiểm tra hư hỏng" báo cáo nhiều nhất về thiết bị nào? */
export function TopDamagedDevicesWidget() {
  const query = useTopDamagedDevices({ page: 1, limit: 10, sortBy: "totalBroken", sortOrder: "desc" });

  return (
    <DataTable
      columns={buildColumns("Thiết bị")}
      data={query.data?.items ?? []}
      keyExtractor={(row) => row.deviceName}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage={query.error ? parseApiError(query.error).message : undefined}
      onRetry={() => query.refetch()}
      emptyTitle="Chưa có dữ liệu"
    />
  );
}

/** FE-09 — `GET /dashboard/kpi/top-damaged-inks`: "Xác nhận tình trạng" báo cáo nhiều nhất về loại mực nào? */
export function TopDamagedInkWidget() {
  const query = useTopDamagedInk({ page: 1, limit: 10, sortBy: "totalBroken", sortOrder: "desc" });

  return (
    <DataTable
      columns={buildColumns("Loại mực")}
      data={query.data?.items ?? []}
      keyExtractor={(row) => row.deviceName}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage={query.error ? parseApiError(query.error).message : undefined}
      onRetry={() => query.refetch()}
      emptyTitle="Chưa có dữ liệu"
    />
  );
}
