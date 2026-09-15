import { Boxes, Wallet, Tags, Landmark } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { AssetStatusBadge } from "@/features/assets/components/AssetStatusBadge";
import { useAssetDashboardSummary } from "@/features/dashboard/hooks/useAssetDashboardSummary";
import { parseApiError } from "@/utils/parseApiError";
import type { AssetCategoryCount, AssetDepartmentCount } from "@/types/dashboard.types";

const categoryColumns: DataTableColumn<AssetCategoryCount>[] = [
  {
    key: "categoryName",
    header: "Danh mục",
    className: "max-w-48 truncate",
    render: (row) => (
      <span className="block truncate" title={row.categoryName}>
        {row.categoryName ?? "—"}
      </span>
    ),
  },
  { key: "count", header: "Số lượng", className: "text-right" },
];

const departmentColumns: DataTableColumn<AssetDepartmentCount>[] = [
  {
    key: "departmentName",
    header: "Khoa/Phòng",
    className: "max-w-48 truncate",
    render: (row) => (
      <span className="block truncate" title={row.departmentName}>
        {row.departmentName ?? "—"}
      </span>
    ),
  },
  { key: "count", header: "Số lượng", className: "text-right" },
];

/** FE-09 — `GET /dashboard/assets/summary`. */
export function AssetSummaryWidget() {
  const query = useAssetDashboardSummary();

  if (query.isLoading) return <LoadingState label="Đang tải thống kê tài sản..." />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error ? parseApiError(query.error).message : undefined} onRetry={() => query.refetch()} />;
  }

  const d = query.data;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Tổng tài sản" value={d.totalAssets} icon={Boxes} tone="primary" />
        <KpiCard label="Tổng giá trị mua" value={`${d.totalPurchaseValue.toLocaleString("vi-VN")} đ`} icon={Wallet} tone="success" />
      </div>

      <div className="flex flex-wrap gap-2">
        {d.byStatus.map((s) => (
          <div key={s.status} className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm">
            <AssetStatusBadge status={s.status} />
            <span className="font-medium text-foreground">{s.count}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Tags className="size-3.5" aria-hidden="true" />
            Theo danh mục
          </h4>
          <DataTable columns={categoryColumns} data={d.byCategory} keyExtractor={(row) => row.categoryId} emptyTitle="Chưa có dữ liệu" />
        </div>
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Landmark className="size-3.5" aria-hidden="true" />
            Theo khoa/phòng
          </h4>
          <DataTable columns={departmentColumns} data={d.byDepartment} keyExtractor={(row) => row.departmentId} emptyTitle="Chưa có dữ liệu" />
        </div>
      </div>
    </div>
  );
}
