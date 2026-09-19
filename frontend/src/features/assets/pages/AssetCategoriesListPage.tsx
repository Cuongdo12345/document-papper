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
import { AssetSectionTabs } from "@/features/assets/components/AssetSectionTabs";
import { AssetCategoryFormModal } from "@/features/assets/components/AssetCategoryFormModal";
import { useAssetCategories } from "@/features/assets/hooks/useAssetCategories";
import { useDeleteAssetCategory } from "@/features/assets/hooks/useDeleteAssetCategory";
import { useBulkDeleteAssetCategory } from "@/features/assets/hooks/useBulkDeleteAssetCategory";
import { useRestoreAssetCategory } from "@/features/assets/hooks/useRestoreAssetCategory";
import { useBulkRestoreAssetCategory } from "@/features/assets/hooks/useBulkRestoreAssetCategory";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/utils/parseApiError";
import type { AssetCategory } from "@/types/asset.types";

const LIMIT = 10;

/**
 * Asset Categories UI (roadmap Mục 14 FE_UI_DEVELOPMENT_ROADMAP.md — "CRUD
 * đơn giản nhưng vẫn dùng chung PageHeader/DataTable/ConfirmDialog"). Hoàn
 * thiện phần còn thiếu của FE-06 (trước đó CHỈ có list tối thiểu cho dropdown
 * chọn danh mục ở Create/Edit Asset). KHÔNG dùng sortBy — `QueryAssetCategoryDTO`
 * không hỗ trợ tham số này (backend luôn sort cố định theo `code`), khác
 * `AssetsListPage` — không tự bịa khả năng sort UI mà API không có.
 *
 * `isActive` filter/action Khôi phục — CÙNG PATTERN `AssetsListPage` (DEV-035):
 * `QueryAssetCategoryDTO.isActive` mới thêm (trước đây backend hard-code
 * `true`), nếu không có sẽ không có cách nào reach danh mục đã xoá mềm để
 * gọi `PATCH /:id/restore` (endpoint có sẵn nhưng không ai gọi tới được).
 *
 * KHÔNG có action "Xoá vĩnh viễn" (`ASSET_CATEGORY_DELETE_PERMANENT`) — cùng
 * quyết định với `ASSET_DELETE_PERMANENT` ở FE-06 (0 UI, xem `assets.api.ts`
 * lịch sử): backend CỐ TÌNH không gán permission này cho bất kỳ role nào
 * (`rolePermission.map.ts` comment gốc "rủi ro cao"), `PermissionGuard` cũng
 * sẽ ẩn hoàn toàn nút này với mọi tài khoản hiện có — không xây UI cho hành
 * động không ai dùng được ở thời điểm này.
 */
export function AssetCategoriesListPage() {
  const { hasPermission } = usePermission();
  // [MỞ RỘNG 2026-09-17, DEV-062] 2 permission khác nhau cho 2 nút hàng loạt,
  // khớp đúng guard nút từng dòng — cùng cách DocumentsListPage/AssetsListPage.
  const canBulkDelete = hasPermission(PERMISSIONS.ASSET_CATEGORY_DELETE);
  const canBulkRestore = hasPermission(PERMISSIONS.ASSET_CATEGORY_UPDATE);
  const canBulkAct = canBulkDelete || canBulkRestore;

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [isActive, setIsActive] = useState<"true" | "false" | "">("true");
  const debouncedKeyword = useDebounce(keyword);

  const [formState, setFormState] = useState<{ open: boolean; category?: AssetCategory }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<AssetCategory | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AssetCategory | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchRestoreOpen, setBatchRestoreOpen] = useState(false);

  function resetFilters() {
    setKeyword("");
    setIsActive("true");
    setPage(1);
  }

  const query = useAssetCategories({
    page,
    limit: LIMIT,
    keyword: debouncedKeyword || undefined,
    isActive: isActive === "" ? undefined : isActive === "true",
  });
  const deleteMutation = useDeleteAssetCategory();
  const restoreMutation = useRestoreAssetCategory();
  const bulkDeleteMutation = useBulkDeleteAssetCategory();
  const bulkRestoreMutation = useBulkRestoreAssetCategory();

  const categories = query.data?.data ?? [];
  const pagination = query.data?.pagination;
  const selection = useRowSelection(categories.map((c) => c._id));

  const columns: DataTableColumn<AssetCategory>[] = [
    { key: "code", header: "Mã danh mục", className: "font-mono" },
    { key: "name", header: "Tên danh mục" },
    { key: "parentCategory", header: "Danh mục cha", render: (row) => row.parentCategory?.name ?? "—" },
    {
      key: "defaultWarrantyMonths",
      header: "Bảo hành mặc định",
      className: "text-right",
      render: (row) => (row.defaultWarrantyMonths != null ? `${row.defaultWarrantyMonths} tháng` : "—"),
    },
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
        title="Danh mục tài sản"
        description="Quản lý danh mục phân loại tài sản, kèm bảo hành mặc định."
        actions={
          <PermissionGuard permission={PERMISSIONS.ASSET_CATEGORY_CREATE}>
            <Button size="sm" onClick={() => setFormState({ open: true })}>
              <Plus /> Thêm danh mục
            </Button>
          </PermissionGuard>
        }
      />

      <AssetSectionTabs />

      <FilterBar onReset={resetFilters}>
        <div className="min-w-48 space-y-1.5">
          <label htmlFor="cat-search" className="text-xs font-medium text-muted-foreground">
            Tìm kiếm (mã/tên)
          </label>
          <input
            id="cat-search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập mã hoặc tên danh mục..."
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
        emptyTitle="Chưa có danh mục tài sản nào"
        emptyMessage="Thêm danh mục đầu tiên để bắt đầu phân loại tài sản."
        selection={
          canBulkAct
            ? { selectedIds: selection.selectedIds, onToggleRow: selection.toggleRow, onToggleAll: selection.toggleAll }
            : undefined
        }
        rowActions={(row) =>
          row.isActive === false ? (
            <div className="flex justify-end gap-1">
              <PermissionGuard permission={PERMISSIONS.ASSET_CATEGORY_UPDATE}>
                <Button variant="ghost" size="sm" aria-label="Khôi phục" onClick={() => setRestoreTarget(row)}>
                  <RotateCcw />
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <div className="flex justify-end gap-1">
              <PermissionGuard permission={PERMISSIONS.ASSET_CATEGORY_UPDATE}>
                <Button variant="ghost" size="sm" aria-label="Sửa" onClick={() => setFormState({ open: true, category: row })}>
                  <Pencil />
                </Button>
              </PermissionGuard>
              <PermissionGuard permission={PERMISSIONS.ASSET_CATEGORY_DELETE}>
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

      <AssetCategoryFormModal
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
        title="Xoá danh mục tài sản"
        message={`Ẩn "${deleteTarget?.name}"? Backend sẽ từ chối nếu còn tài sản hoặc danh mục con thuộc danh mục này. Có thể khôi phục lại sau bằng bộ lọc "Hiển thị: Đã ẩn".`}
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
        title="Khôi phục danh mục tài sản"
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
        title="Xoá danh mục tài sản đã chọn"
        message={`Ẩn ${selection.selectedIds.size} danh mục đã chọn? Backend sẽ từ chối danh mục nào còn tài sản/danh mục con tham chiếu.`}
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
        title="Khôi phục danh mục tài sản đã chọn"
        message={`Khôi phục ${selection.selectedIds.size} danh mục đã chọn?`}
        isLoading={bulkRestoreMutation.isPending}
      />
    </div>
  );
}
