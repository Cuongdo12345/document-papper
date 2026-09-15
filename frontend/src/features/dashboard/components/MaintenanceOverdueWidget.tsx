import { useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { useAssetMaintenanceOverdue } from "@/features/dashboard/hooks/useAssetMaintenanceOverdue";
import { parseApiError } from "@/utils/parseApiError";
import type { MaintenanceOverdueItem } from "@/types/dashboard.types";

const columns: DataTableColumn<MaintenanceOverdueItem>[] = [
  {
    key: "name",
    header: "Tài sản",
    className: "max-w-56 truncate",
    render: (row) => (
      <Link to={`/app/assets/${row._id}`} className="font-medium text-foreground hover:underline" title={row.name}>
        {row.name}
      </Link>
    ),
  },
  { key: "department", header: "Khoa/Phòng", className: "max-w-44 truncate", render: (row) => row.department.name },
  { key: "maintenanceStartedAt", header: "Bắt đầu bảo trì", render: (row) => (row.maintenanceStartedAt ? new Date(row.maintenanceStartedAt).toLocaleDateString("vi-VN") : "—") },
  { key: "daysInMaintenance", header: "Số ngày đang bảo trì", className: "text-right", render: (row) => (row.daysInMaintenance ?? "—") },
];

/** FE-09 — `GET /dashboard/assets/maintenance-overdue`. Mặc định `daysThreshold=7`, khớp `assetAlerts.service.ts`. */
export function MaintenanceOverdueWidget() {
  const [daysThresholdInput, setDaysThresholdInput] = useState("7");
  const [page, setPage] = useState(1);

  const daysThreshold = Number(daysThresholdInput);
  const isValid = Number.isInteger(daysThreshold) && daysThreshold >= 0;
  const query = useAssetMaintenanceOverdue(isValid ? daysThreshold : 7, { page, limit: 10 });

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="maintenance-days" className="text-xs font-medium text-muted-foreground">
            Bảo trì quá (ngày)
          </label>
          <input
            id="maintenance-days"
            type="number"
            min={0}
            value={daysThresholdInput}
            onChange={(e) => {
              setDaysThresholdInput(e.target.value);
              setPage(1);
            }}
            className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {!isValid && <p className="pb-2 text-xs text-destructive">Phải là số nguyên ≥ 0 — đang dùng mặc định 7.</p>}
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Không có tài sản nào bảo trì quá hạn"
      />

      {query.data?.pagination && query.data.pagination.totalPages > 1 && (
        <Pagination
          page={query.data.pagination.page}
          limit={query.data.pagination.limit}
          total={query.data.pagination.total}
          totalPages={query.data.pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
