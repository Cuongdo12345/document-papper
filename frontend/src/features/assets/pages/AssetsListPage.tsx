import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Eye, Pencil, Trash2, RotateCcw, ScanLine, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PERMISSIONS } from "@/constants/permissions";
import { useAssets } from "@/features/assets/hooks/useAssets";
import { useAssetCategories } from "@/features/assets/hooks/useAssetCategories";
import { useDeleteAsset } from "@/features/assets/hooks/useDeleteAsset";
import { useRestoreAsset } from "@/features/assets/hooks/useRestoreAsset";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/utils/parseApiError";
import { AssetStatusBadge } from "@/features/assets/components/AssetStatusBadge";
import { AssetSectionTabs } from "@/features/assets/components/AssetSectionTabs";
import { AssetExcelMenu } from "@/features/assets/components/AssetExcelMenu";
import { ASSET_STATUSES, type AssetListItem, type AssetStatus } from "@/types/asset.types";

const LIMIT = 10;

const STATUS_LABEL: Record<AssetStatus, string> = {
  IN_STOCK: "Trong kho",
  IN_USE: "Đang sử dụng",
  UNDER_MAINTENANCE: "Đang bảo trì",
  RESERVED: "Đã giữ chỗ",
  DISPOSED: "Đã thanh lý",
  LOST: "Thất lạc/mất",
};

/**
 * DEV-035 (fix FE-06 Remaining Issue #1): `QueryAssetDTO`/`getAllAssetsService`
 * giờ nhận `isActive` — thêm filter "Hiển thị" + action Khôi phục ngay trên
 * hàng, CÙNG PATTERN `DocumentsListPage` (`isActive` state, mặc định
 * `"true"`). Khác Document: ẩn hẳn "Xem chi tiết"/"Sửa" ở hàng đã xoá mềm
 * (không chỉ ẩn Sửa) — `GET /assets/:id` VẪN hard-filter `isActive:true`
 * (KHÔNG sửa ở task này, giữ đúng parity với Document — `GET /documents/:id`
 * cũng vậy), nên mở trang chi tiết 1 asset đã xoá sẽ luôn 404; tránh hiện
 * link dẫn tới ngõ cụt, chỉ để lại đúng action dùng được (Khôi phục).
 */
export function AssetsListPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const isAdmin = useIsAdmin();
  const canBrowseDepartments = isAdmin || hasPermission(PERMISSIONS.DEPARTMENT_VIEW);
  const canBrowseCategories = hasPermission(PERMISSIONS.ASSET_CATEGORY_VIEW);

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<AssetStatus | "">("");
  const [isActive, setIsActive] = useState<"true" | "false" | "">("true");
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "assetCode">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const debouncedKeyword = useDebounce(keyword);

  const [deleteTarget, setDeleteTarget] = useState<AssetListItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AssetListItem | null>(null);

  function handleSortChange(key: string) {
    if (key === sortBy) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key as typeof sortBy);
      setOrder("asc");
    }
    setPage(1);
  }

  function resetFilters() {
    setKeyword("");
    setDepartment("");
    setCategory("");
    setStatus("");
    setIsActive("true");
    setPage(1);
  }

  const departmentsQuery = useDepartments({ limit: 100 }, { enabled: canBrowseDepartments });
  const categoriesQuery = useAssetCategories({ limit: 100 }, { enabled: canBrowseCategories });
  const query = useAssets({
    page,
    limit: LIMIT,
    keyword: debouncedKeyword || undefined,
    department: department || undefined,
    category: category || undefined,
    status: status || undefined,
    isActive: isActive === "" ? undefined : isActive === "true",
    sortBy,
    order,
  });
  const deleteMutation = useDeleteAsset();
  const restoreMutation = useRestoreAsset();

  const assets = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const columns: DataTableColumn<AssetListItem>[] = [
    { key: "assetCode", header: "Mã tài sản", className: "font-mono", sortKey: "assetCode" },
    {
      key: "name",
      header: "Tên tài sản",
      sortKey: "name",
      render: (row) => (
        <Link to={`/app/assets/${row._id}`} className="font-medium text-primary hover:underline">
          {row.name}
        </Link>
      ),
    },
    { key: "department", header: "Khoa/Phòng", render: (row) => row.department?.name ?? "—" },
    { key: "status", header: "Trạng thái", render: (row) => <AssetStatusBadge status={row.status} /> },
    {
      key: "isActive",
      header: "Hoạt động",
      render: (row) => (
        <StatusBadge variant={row.isActive === false ? "default" : "success"}>
          {row.isActive === false ? "Đã ẩn" : "Đang hoạt động"}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tài sản"
        description="Quản lý tài sản, cấp phát/luân chuyển/thu hồi."
        actions={
          <div className="flex gap-2">
            {/* Giai đoạn 5 (roadmap A1) — QR code kiểm kê */}
            <PermissionGuard permission={PERMISSIONS.ASSET_INVENTORY_CHECK}>
              <Button variant="secondary" size="sm" onClick={() => navigate("/app/assets/scan")}>
                <ScanLine /> Quét mã kiểm kê
              </Button>
            </PermissionGuard>
            {/* Roadmap B2 (2026-09-15) — Lịch bảo trì chủ động */}
            <PermissionGuard permission={PERMISSIONS.ASSET_MAINTENANCE_PLAN_VIEW}>
              <Button variant="secondary" size="sm" onClick={() => navigate("/app/assets/maintenance-calendar")}>
                <CalendarDays /> Lịch bảo trì
              </Button>
            </PermissionGuard>
            <AssetExcelMenu />
            <PermissionGuard permission={PERMISSIONS.ASSET_CREATE}>
              <Button size="sm" onClick={() => navigate("/app/assets/create")}>
                <Plus /> Thêm tài sản
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      <AssetSectionTabs />

      <FilterBar onReset={resetFilters}>
        <div className="min-w-48 space-y-1.5">
          <label htmlFor="asset-search" className="text-xs font-medium text-muted-foreground">
            Tìm kiếm (mã/tên/serial)
          </label>
          <input
            id="asset-search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập mã, tên hoặc serial..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {canBrowseDepartments && (
          <div className="min-w-40 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Khoa/Phòng</label>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Tất cả</option>
              {departmentsQuery.data?.data.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {canBrowseCategories && (
          <div className="min-w-40 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Danh mục</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Tất cả</option>
              {categoriesQuery.data?.data.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="min-w-40 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Trạng thái</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as AssetStatus | "");
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả</option>
            {ASSET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-36 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Hiển thị</label>
          <select
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value as "true" | "false" | "");
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã ẩn (đã xoá)</option>
            <option value="">Tất cả</option>
          </select>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={assets}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có tài sản nào"
        emptyMessage="Thêm tài sản đầu tiên để bắt đầu quản lý."
        sortBy={sortBy}
        order={order}
        onSortChange={handleSortChange}
        rowActions={(row) =>
          row.isActive === false ? (
            <div className="flex justify-end gap-1">
              <PermissionGuard permission={PERMISSIONS.ASSET_UPDATE}>
                <Button variant="ghost" size="sm" aria-label="Khôi phục" onClick={() => setRestoreTarget(row)}>
                  <RotateCcw />
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" aria-label="Xem chi tiết" onClick={() => navigate(`/app/assets/${row._id}`)}>
                <Eye />
              </Button>
              <PermissionGuard permission={PERMISSIONS.ASSET_UPDATE}>
                <Button variant="ghost" size="sm" aria-label="Sửa" onClick={() => navigate(`/app/assets/${row._id}`)}>
                  <Pencil />
                </Button>
              </PermissionGuard>
              <PermissionGuard permission={PERMISSIONS.ASSET_DELETE}>
                <Button variant="ghost" size="sm" aria-label="Xoá" onClick={() => setDeleteTarget(row)}>
                  <Trash2 className="text-destructive" />
                </Button>
              </PermissionGuard>
            </div>
          )
        }
      />

      {pagination && (
        <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
        }}
        title="Xoá tài sản"
        message={`Ẩn "${deleteTarget?.name}"? Có thể khôi phục lại sau bằng bộ lọc "Hiển thị: Đã ẩn".`}
        danger
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => {
          if (!restoreTarget) return;
          restoreMutation.mutate(restoreTarget._id, { onSuccess: () => setRestoreTarget(null) });
        }}
        title="Khôi phục tài sản"
        message={`Khôi phục "${restoreTarget?.name}"?`}
        isLoading={restoreMutation.isPending}
      />
    </div>
  );
}
