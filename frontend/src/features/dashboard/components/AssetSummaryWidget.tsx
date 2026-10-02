import { Link } from "react-router-dom";
import { Boxes, Wallet, Tags, Landmark } from "lucide-react";
import { ErrorState } from "@/components/shared/ErrorState";
import { KpiWidgetSkeleton } from "@/features/dashboard/components/DashboardSkeleton";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { AssetStatusBadge } from "@/features/assets/components/AssetStatusBadge";
import { ASSET_STATUS_MAP } from "@/features/assets/constants/assetStatus.constants";
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
  const { hasPermission } = usePermission();

  if (query.isLoading) return <KpiWidgetSkeleton label="Đang tải thống kê tài sản..." cards={2} />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error ? parseApiError(query.error).message : undefined} onRetry={() => query.refetch()} />;
  }

  const d = query.data;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* [FE-37] Bấm → danh sách Tài sản (mặc định chỉ tài sản đang hoạt động — khớp số đếm ở đây). */}
        <KpiCard
          label="Tổng tài sản"
          value={d.totalAssets}
          icon={Boxes}
          tone="primary"
          countUp
          to={hasPermission(PERMISSIONS.ASSET_VIEW) ? "/app/assets" : undefined}
        />
        <KpiCard label="Tổng giá trị mua" value={`${d.totalPurchaseValue.toLocaleString("vi-VN")} đ`} icon={Wallet} tone="success" />
      </div>

      {/*
        [MỚI DEV-083] User yêu cầu: bấm vào từng ô trạng thái → xem đúng danh
        sách tài sản tương ứng. Điều hướng tới `/app/assets?status=<mã>` —
        `AssetsListPage` đọc `status` từ URL lúc mount để lọc sẵn (giữ nguyên
        `isActive=true` mặc định, khớp đúng số liệu widget này CHỈ đếm tài sản
        active — xem `assetDashboard.service.ts::getAssetDashboardSummaryService`).
        Không gate permission riêng: mọi role có `DASHBOARD_READ` (tab "Tài
        sản" mới gọi tới widget này) đã có sẵn `ASSET_VIEW` trong
        `rolePermission.map.ts` — đã kiểm tra khớp qua toàn bộ role hiện có.
      */}
      <div className="flex flex-wrap gap-2">
        {d.byStatus.map((s) => (
          <Link
            key={s.status}
            to={`/app/assets?status=${s.status}`}
            aria-label={`Xem ${s.count} tài sản trạng thái ${ASSET_STATUS_MAP[s.status].label}`}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <AssetStatusBadge status={s.status} />
            <span className="font-medium text-foreground">{s.count}</span>
          </Link>
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
