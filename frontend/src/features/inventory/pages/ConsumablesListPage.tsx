import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Eye, Pencil, Trash2, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { BatchActionBar } from "@/components/shared/BatchActionBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useDebounce } from "@/hooks/useDebounce";
import { useRowSelection } from "@/hooks/useRowSelection";
import { PERMISSIONS } from "@/constants/permissions";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useConsumableItems } from "@/features/inventory/hooks/useConsumableItems";
import { useConsumableCategories } from "@/features/inventory/hooks/useConsumableCategories";
import {
  useUpdateConsumableItem,
  useBulkDeleteConsumableItems,
  useBulkRestoreConsumableItems,
} from "@/features/inventory/hooks/useConsumableActions";
import { InventorySectionTabs } from "@/features/inventory/components/InventorySectionTabs";
import { CreateConsumableItemModal } from "@/features/inventory/components/CreateConsumableItemModal";
import { EditConsumableItemModal } from "@/features/inventory/components/EditConsumableItemModal";
import { parseApiError } from "@/utils/parseApiError";
import type { ConsumableItem } from "@/types/consumable.types";

const LIMIT = 10;

function departmentLabel(item: ConsumableItem) {
  return typeof item.department === "string" ? "—" : item.department.name;
}

/**
 * Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15) — `/app/inventory`. Mirror
 * đúng pattern `AssetsListPage` (FilterBar + DataTable + Pagination).
 */
export function ConsumablesListPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const isAdmin = useIsAdmin();
  const canBrowseDepartments = isAdmin || hasPermission(PERMISSIONS.DEPARTMENT_VIEW);

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isActive, setIsActive] = useState<"true" | "false" | "">("true");
  const debouncedKeyword = useDebounce(keyword);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ConsumableItem | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ConsumableItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ConsumableItem | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchRestoreOpen, setBatchRestoreOpen] = useState(false);
  const updateMutation = useUpdateConsumableItem();
  const bulkDeleteMutation = useBulkDeleteConsumableItems();
  const bulkRestoreMutation = useBulkRestoreConsumableItems();

  function resetFilters() {
    setKeyword("");
    setDepartment("");
    setCategory("");
    setLowStockOnly(false);
    setIsActive("true");
    setPage(1);
  }

  const departmentsQuery = useDepartments({ limit: 100 }, { enabled: canBrowseDepartments });
  const categoriesQuery = useConsumableCategories({ limit: 100 });
  const query = useConsumableItems({
    page,
    limit: LIMIT,
    search: debouncedKeyword || undefined,
    department: department || undefined,
    category: category || undefined,
    lowStockOnly: lowStockOnly || undefined,
    isActive: isActive === "" ? undefined : isActive === "true",
  });

  const items = query.data?.data ?? [];
  const pagination = query.data?.pagination;
  const selection = useRowSelection(items.map((i) => i._id));

  const columns: DataTableColumn<ConsumableItem>[] = [
    {
      key: "name",
      header: "Tên vật tư",
      render: (row) => (
        <Link to={`/app/inventory/${row._id}`} className="font-medium text-primary hover:underline">
          {row.name}
        </Link>
      ),
    },
    { key: "unit", header: "Đơn vị" },
    { key: "category", header: "Nhóm", render: (row) => row.category?.name ?? "—" },
    { key: "department", header: "Khoa/Phòng", render: departmentLabel },
    {
      key: "quantityOnHand",
      header: "Tồn kho",
      render: (row) => (
        <span className="flex items-center gap-2">
          {row.quantityOnHand}
          {row.isLowStock && <StatusBadge variant="destructive">Sắp hết</StatusBadge>}
        </span>
      ),
    },
    { key: "minStockThreshold", header: "Ngưỡng cảnh báo" },
    {
      key: "isActive",
      header: "Trạng thái",
      render: (row) => (
        <StatusBadge variant={row.isActive ? "success" : "default"}>
          {row.isActive ? "Đang theo dõi" : "Ngừng theo dõi"}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vật tư tiêu hao"
        description="Theo dõi tồn kho vật tư tiêu hao theo từng khoa/phòng ban."
        actions={
          <PermissionGuard permission={PERMISSIONS.CONSUMABLE_CREATE}>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus /> Tạo vật tư
            </Button>
          </PermissionGuard>
        }
      />

      <InventorySectionTabs />

      <FilterBar onReset={resetFilters}>
        <div className="min-w-48 space-y-1.5">
          <label htmlFor="ci-search" className="text-xs font-medium text-muted-foreground">
            Tìm kiếm (tên)
          </label>
          <input
            id="ci-search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập tên vật tư..."
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

        <div className="min-w-40 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nhóm vật tư</label>
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
                {c.code} — {c.name}
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
            <option value="true">Đang theo dõi</option>
            <option value="false">Đã ngừng</option>
            <option value="">Tất cả</option>
          </select>
        </div>

        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setLowStockOnly(e.target.checked);
                setPage(1);
              }}
              className="size-4 rounded border-input"
            />
            Chỉ vật tư sắp hết
          </label>
        </div>
      </FilterBar>

      <PermissionGuard permission={PERMISSIONS.CONSUMABLE_UPDATE}>
        <BatchActionBar
          count={selection.selectedIds.size}
          onClear={selection.clear}
          onDelete={() => setBatchDeleteOpen(true)}
          onRestore={() => setBatchRestoreOpen(true)}
          isLoading={bulkDeleteMutation.isPending || bulkRestoreMutation.isPending}
        />
      </PermissionGuard>

      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có vật tư nào"
        emptyMessage="Tạo vật tư đầu tiên để bắt đầu theo dõi tồn kho."
        selection={{ selectedIds: selection.selectedIds, onToggleRow: selection.toggleRow, onToggleAll: selection.toggleAll }}
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" aria-label="Xem chi tiết" onClick={() => navigate(`/app/inventory/${row._id}`)}>
              <Eye />
            </Button>
            <PermissionGuard permission={PERMISSIONS.CONSUMABLE_UPDATE}>
              <Button variant="ghost" size="sm" aria-label="Sửa" onClick={() => setEditTarget(row)}>
                <Pencil />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.CONSUMABLE_UPDATE}>
              {row.isActive ? (
                <Button variant="ghost" size="sm" aria-label="Ngừng theo dõi" onClick={() => setDeactivateTarget(row)}>
                  <Trash2 className="text-destructive" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" aria-label="Khôi phục" onClick={() => setRestoreTarget(row)}>
                  <RotateCcw />
                </Button>
              )}
            </PermissionGuard>
          </div>
        )}
      />

      {pagination && (
        <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}

      {createOpen && <CreateConsumableItemModal open={createOpen} onClose={() => setCreateOpen(false)} />}

      {editTarget && (
        <EditConsumableItemModal open={!!editTarget} onClose={() => setEditTarget(null)} item={editTarget} />
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (!deactivateTarget) return;
          updateMutation.mutate(
            { id: deactivateTarget._id, body: { isActive: false } },
            { onSuccess: () => setDeactivateTarget(null) },
          );
        }}
        title="Ngừng theo dõi vật tư"
        message={`Ngừng theo dõi "${deactivateTarget?.name}"? Vật tư sẽ bị ẩn khỏi danh sách mặc định, lịch sử giao dịch vẫn được giữ nguyên. Có thể khôi phục lại sau bằng bộ lọc "Hiển thị: Đã ngừng".`}
        danger
        isLoading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => {
          if (!restoreTarget) return;
          updateMutation.mutate(
            { id: restoreTarget._id, body: { isActive: true } },
            { onSuccess: () => setRestoreTarget(null) },
          );
        }}
        title="Khôi phục vật tư"
        message={`Khôi phục theo dõi "${restoreTarget?.name}"?`}
        isLoading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        onConfirm={() => {
          bulkDeleteMutation.mutate([...selection.selectedIds], {
            onSuccess: () => {
              setBatchDeleteOpen(false);
              selection.clear();
            },
          });
        }}
        title="Ngừng theo dõi vật tư đã chọn"
        message={`Ngừng theo dõi ${selection.selectedIds.size} vật tư đã chọn? Có thể khôi phục lại sau bằng bộ lọc "Hiển thị: Đã ngừng".`}
        danger
        isLoading={bulkDeleteMutation.isPending}
      />

      <ConfirmDialog
        open={batchRestoreOpen}
        onClose={() => setBatchRestoreOpen(false)}
        onConfirm={() => {
          bulkRestoreMutation.mutate([...selection.selectedIds], {
            onSuccess: () => {
              setBatchRestoreOpen(false);
              selection.clear();
            },
          });
        }}
        title="Khôi phục vật tư đã chọn"
        message={`Khôi phục theo dõi ${selection.selectedIds.size} vật tư đã chọn?`}
        isLoading={bulkRestoreMutation.isPending}
      />
    </div>
  );
}
