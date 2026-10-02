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
import { AssetCategoryOptions } from "@/features/assets/components/AssetCategoryOptions";
import { parseApiError } from "@/utils/parseApiError";
import { splitSelectionByActive } from "@/utils/splitSelectionByActive";
import type { AssetCategory } from "@/types/asset.types";

const LIMIT = 10;

/**
 * DEV-081 (thay cách hiển thị cây của DEV-080 theo yêu cầu user): danh sách
 * PHẲNG, mặc định CHỈ danh mục con (cấp cuối — nơi gắn tài sản), lọc theo
 * "Nhóm" (chọn gốc CNTT/TBYT hoặc nhóm cấp 2 → mọi danh mục con trong nhánh),
 * phân trang ở SERVER (`group`/`level` của `QueryAssetCategoryDTO`). Bộ lọc
 * "Cấp" cho phép chuyển sang xem danh mục nhóm để vẫn sửa/xoá/khôi phục được.
 */
type LevelFilter = "leaf" | "group" | "";

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
  const [group, setGroup] = useState("");
  const [level, setLevel] = useState<LevelFilter>("leaf");
  const debouncedKeyword = useDebounce(keyword);

  const [formState, setFormState] = useState<{ open: boolean; category?: AssetCategory }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<AssetCategory | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AssetCategory | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchRestoreOpen, setBatchRestoreOpen] = useState(false);

  function resetFilters() {
    setKeyword("");
    setIsActive("true");
    setGroup("");
    setLevel("leaf");
    setPage(1);
  }

  const query = useAssetCategories({
    page,
    limit: LIMIT,
    keyword: debouncedKeyword || undefined,
    isActive: isActive === "" ? undefined : isActive === "true",
    group: group || undefined,
    level: level || undefined,
  });
  // Nguồn cho dropdown "Nhóm" — toàn bộ danh mục active để dựng cây, chỉ render nhóm.
  const allCategoriesQuery = useAssetCategories({ limit: 300, isActive: true });
  const deleteMutation = useDeleteAssetCategory();
  const restoreMutation = useRestoreAssetCategory();
  const bulkDeleteMutation = useBulkDeleteAssetCategory();
  const bulkRestoreMutation = useBulkRestoreAssetCategory();

  const categories = query.data?.data ?? [];
  const pagination = query.data?.pagination;
  const selection = useRowSelection(categories.map((c) => c._id));
  const { activeIds, inactiveIds } = splitSelectionByActive(categories, selection.selectedIds, (c) => c.isActive !== false);

  const columns: DataTableColumn<AssetCategory>[] = [
    { key: "code", header: "Mã danh mục", className: "font-mono" },
    { key: "name", header: "Tên danh mục" },
    { key: "parentCategory", header: "Nhóm", render: (row) => row.parentCategory?.name ?? "—" },
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
        description="Danh mục con dùng để gán tài sản — lọc theo nhóm để thu hẹp danh sách."
        actions={
          <PermissionGuard permission={PERMISSIONS.ASSET_CATEGORY_CREATE}>
            <Button size="sm" onClick={() => setFormState({ open: true })}>
              <Plus /> Thêm danh mục
            </Button>
          </PermissionGuard>
        }
      />

      <AssetSectionTabs />

      {canBulkAct && (
        <BatchActionBar
          count={selection.selectedIds.size}
          onClear={selection.clear}
          onDelete={canBulkDelete && activeIds.length > 0 ? () => setBatchDeleteOpen(true) : undefined}
          onRestore={canBulkRestore && inactiveIds.length > 0 ? () => setBatchRestoreOpen(true) : undefined}
          isLoading={bulkDeleteMutation.isPending || bulkRestoreMutation.isPending}
        />
      )}

      {/* [Pass 3b, FE-27/FE-28, UI_DESIGN_SYSTEM.md Mục 4/9.3] Gộp FilterBar+DataTable vào 1 khung viền ngoài. */}
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      <FilterBar variant="embedded" onReset={resetFilters}>
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

        <div className="min-w-56 space-y-1.5">
          <label htmlFor="cat-group" className="text-xs font-medium text-muted-foreground">
            Nhóm
          </label>
          <select
            id="cat-group"
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả nhóm</option>
            <AssetCategoryOptions categories={allCategoriesQuery.data?.data ?? []} mode="group" />
          </select>
        </div>

        <div className="min-w-36 space-y-1.5">
          <label htmlFor="cat-level" className="text-xs font-medium text-muted-foreground">
            Cấp
          </label>
          <select
            id="cat-level"
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as LevelFilter);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="leaf">Danh mục con</option>
            <option value="group">Danh mục nhóm</option>
            <option value="">Tất cả</option>
          </select>
        </div>

        <div className="min-w-36 space-y-1.5">
          <label htmlFor="cat-active" className="text-xs font-medium text-muted-foreground">
            Hiển thị
          </label>
          <select
            id="cat-active"
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
        className="rounded-none border-0"
        columns={columns}
        data={categories}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Không có danh mục phù hợp"
        emptyMessage="Đổi bộ lọc Nhóm/Cấp/Hiển thị, hoặc thêm danh mục mới."
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
      </div>

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
          bulkDeleteMutation.mutate(activeIds, {
            onSuccess: () => {
              setBatchDeleteOpen(false);
              selection.clear();
            },
          });
        }}
        title="Xoá danh mục tài sản đã chọn"
        message={`Ẩn ${activeIds.length} danh mục đang hoạt động đã chọn? Backend sẽ từ chối danh mục nào còn tài sản/danh mục con tham chiếu.`}
        danger
        isLoading={bulkDeleteMutation.isPending}
      />

      <ConfirmDialog
        open={batchRestoreOpen}
        onClose={() => setBatchRestoreOpen(false)}
        onConfirm={() => {
          bulkRestoreMutation.mutate(inactiveIds, {
            onSuccess: () => {
              setBatchRestoreOpen(false);
              selection.clear();
            },
          });
        }}
        title="Khôi phục danh mục tài sản đã chọn"
        message={`Khôi phục ${inactiveIds.length} danh mục đã ẩn đã chọn?`}
        isLoading={bulkRestoreMutation.isPending}
      />
    </div>
  );
}
