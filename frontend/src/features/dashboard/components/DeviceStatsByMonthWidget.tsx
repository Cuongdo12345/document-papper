import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { useDashboardDeviceStats } from "@/features/dashboard/hooks/useDashboardDeviceStats";
import { parseApiError } from "@/utils/parseApiError";
import type { DeviceStatsByMonthItem } from "@/types/dashboard.types";

const columns: DataTableColumn<DeviceStatsByMonthItem>[] = [
  { key: "deviceName", header: "Tên thiết bị/vật tư", className: "max-w-72 truncate" },
  { key: "totalQuantity", header: "Tổng số lượng", className: "text-right" },
];

const now = new Date();

/**
 * FE-09 — `GET /dashboard/device-stats`: "Tháng X/Y đã đề xuất bao nhiêu
 * mực/sửa chữa/vật tư cho thiết bị nào?" `month`/`year` BẮT BUỘC ở backend
 * (400 nếu thiếu) — mặc định tháng/năm HIỆN TẠI, validate client-side
 * (roadmap Mục 15: filter dashboard phải validate trước khi gọi API) trước
 * khi coi giá trị hợp lệ để bật query.
 */
export function DeviceStatsByMonthWidget() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const isValid = Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year) && year >= 2000 && year <= 2100;
  const query = useDashboardDeviceStats({ month, year, page: 1, limit: 20, sortBy: "totalQuantity", sortOrder: "desc" }, isValid);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="stats-month" className="text-xs font-medium text-muted-foreground">
            Tháng
          </label>
          <input
            id="stats-month"
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="stats-year" className="text-xs font-medium text-muted-foreground">
            Năm
          </label>
          <input
            id="stats-year"
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {!isValid ? (
        <p className="text-sm text-destructive">Tháng phải từ 1-12, năm từ 2000-2100.</p>
      ) : (
        <DataTable
          columns={columns}
          data={query.data?.items ?? []}
          keyExtractor={(row) => row.deviceName}
          isLoading={query.isLoading}
          isError={query.isError}
          errorMessage={query.error ? parseApiError(query.error).message : undefined}
          onRetry={() => query.refetch()}
          emptyTitle="Không có dữ liệu cho tháng/năm này"
        />
      )}
    </div>
  );
}
