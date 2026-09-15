import { useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useMedicalDeviceCalibrationDue } from "@/features/dashboard/hooks/useMedicalDeviceCalibrationDue";
import { parseApiError } from "@/utils/parseApiError";
import type { CalibrationDueItem } from "@/types/dashboard.types";

const columns: DataTableColumn<CalibrationDueItem>[] = [
  {
    key: "asset",
    header: "Thiết bị",
    className: "max-w-56 truncate",
    render: (row) => (
      <Link to={`/app/assets/${row.asset._id}`} className="font-medium text-foreground hover:underline" title={row.asset.name}>
        {row.asset.name}
      </Link>
    ),
  },
  { key: "department", header: "Khoa/Phòng", className: "max-w-44 truncate", render: (row) => row.asset.department?.name ?? "—" },
  {
    key: "nextCalibrationDueDate",
    header: "Hạn kiểm định kế tiếp",
    render: (row) => (row.nextCalibrationDueDate ? new Date(row.nextCalibrationDueDate).toLocaleDateString("vi-VN") : "—"),
  },
  {
    key: "isOverdue",
    header: "Trạng thái",
    render: (row) => (row.isOverdue ? <StatusBadge variant="destructive">Đã quá hạn</StatusBadge> : <StatusBadge variant="warning">Sắp tới hạn</StatusBadge>),
  },
];

/** FE-09 — `GET /dashboard/medical-devices/calibration-due`. Mặc định `daysAhead=30`, khớp `CALIBRATION_ALERT_DAYS_BEFORE` (đã dùng ở FE-07). */
export function CalibrationDueWidget() {
  const [daysAheadInput, setDaysAheadInput] = useState("30");
  const [page, setPage] = useState(1);

  const daysAhead = Number(daysAheadInput);
  const isValid = Number.isInteger(daysAhead) && daysAhead >= 0;
  const query = useMedicalDeviceCalibrationDue(isValid ? daysAhead : 30, { page, limit: 10 });

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="calibration-days" className="text-xs font-medium text-muted-foreground">
            Trong vòng (ngày)
          </label>
          <input
            id="calibration-days"
            type="number"
            min={0}
            value={daysAheadInput}
            onChange={(e) => {
              setDaysAheadInput(e.target.value);
              setPage(1);
            }}
            className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {!isValid && <p className="pb-2 text-xs text-destructive">Phải là số nguyên ≥ 0 — đang dùng mặc định 30.</p>}
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        keyExtractor={(row) => `${row.asset._id}`}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Không có thiết bị nào sắp/quá hạn kiểm định"
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
