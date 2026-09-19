import { useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
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
import { PERMISSIONS } from "@/constants/permissions";
import { useRowSelection } from "@/hooks/useRowSelection";
import { InventorySectionTabs } from "@/features/inventory/components/InventorySectionTabs";
import { ConsumableCategoryFormModal } from "@/features/inventory/components/ConsumableCategoryFormModal";
import { useConsumableCategories } from "@/features/inventory/hooks/useConsumableCategories";
import {
  useDeleteConsumableCategory,
  useBulkDeleteConsumableCategories,
  useRestoreConsumableCategory,
  useBulkRestoreConsumableCategories,
} from "@/features/inventory/hooks/useConsumableCategoryActions";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/utils/parseApiError";
import type { ConsumableCategory } from "@/types/consumableCategory.types";

const LIMIT = 10;

/**
 * Nhóm vật tư tiêu hao (2026-09-16, user yêu cầu sau B3 — trước đó `category`
 * là text tự do) — mirror ĐÚNG `AssetCategoriesListPage` (CRUD đơn giản,
 * dùng chung PageHeader/DataTable/ConfirmDialog). `isActive` filter/action
 * Khôi phục — CÙNG PATTERN `AssetCategoriesListPage`/`AssetsListPage`.
 *
 * KHÔNG có action "Xoá vĩnh viễn" — khác `AssetCategoriesListPage`, module
 * này không xây endpoint đó ngay từ đầu (0 permission nào sẽ được gán, xem
 * `consumableCategory.service.ts` — tránh dead code, CLAUDE.md Mục 12).
 */
export function ConsumableCategoriesListPage() {
  const { hasPermission } = usePermission();
  // [MỞ RỘNG 2026-09-17, DEV-062] 2 permission khác nhau cho 2 nút hàng loạt,
  // khớp đúng guard nút từng dòng.
  const canBulkDelete = hasPermission(PERMISSIONS.CONSUMABLE_CATEGORY_DELETE);
  const canBulkRestore = hasPermission(PERMISSIONS.CONSUMABLE_CATEGORY_UPDATE);
  const canBulkAct = canBulkDelete || canBulkRestore;

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [isActive, setIsActive] = useState<"true" | "false" | "">("true");
  const debouncedKeyword = useDebounce(keyword);

  const [formState, setFormState] = useState<{ open: boolean; category?: ConsumableCategory }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<ConsumableCategory | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ConsumableCategory | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchRestoreOpen, setBatchRestoreOpen] = useState(false);

  function resetFilters() {
    setKeyword("");
    setIsActive("true");
    setPage(1);
  }

  const query = useConsumableCategories({
    page,
    limit: LIMIT,
    keyword: debouncedKeyword || undefined,
    isActive: isActive === "" ? undefined : isActive === "true",
  });
  const deleteMutation = useDeleteConsumableCategory();
  const restoreMutation = useRestoreConsumableCategory();
  const bulkDeleteMutation = useBulkDeleteConsumableCategories();
  const bulkRestoreMutation = useBulkRestoreConsumableCategories();

  const categories = query.data?.data ?? [];
  const pagination = query.data?.pagination;
  const selection = useRowSelection(categories.map((c) => c._id));

  const columns: DataTableColumn<ConsumableCategory>[] = [
    { key: "code", header: "Mã nhóm", className: "font-mono" },
    { key: "name", header: "Tên nhóm" },
    { key: "parentCategory", header: "Nhóm cha", render: (row) => row.parentCategory?.name ?? "—" },
    {
      key: "isActive",
      header: "Trạng thái",
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
        title="Nhóm vật tư"
        description="Quản lý nhóm phân loại vật tư tiêu hao, có phân cấp cha/con."
        actions={
          <PermissionGuard permission={PERMISSIONS.CONSUMABLE_CATEGORY_CREATE}>
            <Button size="sm" onClick={() => setFormState({ open: true })}>
              <Plus /> Thêm nhóm
            </Button>
          </PermissionGuard>
        }
      />

      <InventorySectionTabs />

      <FilterBar onReset={resetFilters}>
        <div className="min-w-48 space-y-1.5">
          <label htmlFor="cc-search" className="text-xs font-medium text-muted-foreground">
            Tìm kiếm (mã/tên)
          </label>
          <input
            id="cc-search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập mã hoặc tên nhóm..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
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

      {canBulkAct && (
        <BatchActionBar
          count={selection.selectedIds.size}
          onClear={selection.clear}
          onDelete={canBulkDelete ? () => setBatchDeleteOpen(true) : undefined}
          onRestore={canBulkRestore ? () => setBatchRestoreOpen(true) : undefined}
          isLoading={bulkDeleteMutation.isPending || bulkRestoreMutation.isPending}
        />
      )}

      <DataTable
        columns={columns}
        data={categories}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có nhóm vật tư nào"
        emptyMessage="Thêm nhóm đầu tiên để bắt đầu phân loại vật tư tiêu hao."
        selection={
          canBulkAct
            ? { selectedIds: selection.selectedIds, onToggleRow: selection.toggleRow, onToggleAll: selection.toggleAll }
            : undefined
        }
        rowActions={(row) =>
          row.isActive === false ? (
            <div className="flex justify-end gap-1">
              <PermissionGuard permission={PERMISSIONS.CONSUMABLE_CATEGORY_UPDATE}>
                <Button variant="ghost" size="sm" aria-label="Khôi phục" onClick={() => setRestoreTarget(row)}>
                  <RotateCcw />
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <div className="flex justify-end gap-1">
              <PermissionGuard permission={PERMISSIONS.CONSUMABLE_CATEGORY_UPDATE}>
                <Button variant="ghost" size="sm" aria-label="Sửa" onClick={() => setFormState({ open: true, category: row })}>
                  <Pencil />
                </Button>
              </PermissionGuard>
              <PermissionGuard permission={PERMISSIONS.CONSUMABLE_CATEGORY_DELETE}>
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

      <ConsumableCategoryFormModal
        key={formState.category?._id ?? "create"}
        open={formState.open}
        onClose={() => setFormState({ open: false })}
        category={formState.category}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
        }}
        title="Xoá nhóm vật tư"
        message={`Ẩn "${deleteTarget?.name}"? Backend sẽ từ chối nếu còn vật tư hoặc nhóm con thuộc nhóm này. Có thể khôi phục lại sau bằng bộ lọc "Hiển thị: Đã ẩn".`}
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
        title="Khôi phục nhóm vật tư"
        message={`Khôi phục "${restoreTarget?.name}"?`}
        isLoading={restoreMutation.isPending}
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
        title="Xoá nhóm vật tư đã chọn"
        message={`Ẩn ${selection.selectedIds.size} nhóm đã chọn? Backend sẽ từ chối nhóm nào còn vật tư/nhóm con tham chiếu.`}
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
        title="Khôi phục nhóm vật tư đã chọn"
        message={`Khôi phục ${selection.selectedIds.size} nhóm đã chọn?`}
        isLoading={bulkRestoreMutation.isPending}
      />
    </div>
  );
}
