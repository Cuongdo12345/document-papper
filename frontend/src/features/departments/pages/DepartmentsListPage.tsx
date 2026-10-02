import { useState } from "react";
import { Plus, Pencil, Trash2, FileSpreadsheet, RotateCcw } from "lucide-react";
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
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useDeleteDepartment } from "@/features/departments/hooks/useDeleteDepartment";
import { useRestoreDepartment } from "@/features/departments/hooks/useRestoreDepartment";
import { useBulkDeleteDepartment } from "@/features/departments/hooks/useBulkDeleteDepartment";
import { useBulkRestoreDepartment } from "@/features/departments/hooks/useBulkRestoreDepartment";
import { DepartmentFormModal } from "@/features/departments/components/DepartmentFormModal";
import { DepartmentSyncModal } from "@/features/departments/components/DepartmentSyncModal";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/utils/parseApiError";
import { splitSelectionByActive } from "@/utils/splitSelectionByActive";
import type { Department } from "@/types/department.types";

const LIMIT = 10;

/**
 * [DEV-086] Xoá mềm + khôi phục + xoá nhiều — cùng pattern ĐÃ có ở
 * `AssetCategoriesListPage.tsx` (bộ lọc "Hiển thị", `useRowSelection` +
 * `BatchActionBar`, row action đổi hẳn Sửa/Xoá <-> Khôi phục theo
 * `row.isActive`). Khôi phục dùng quyền RIÊNG `DEPARTMENT_RESTORE` (khác
 * AssetCategory dùng lại `*_UPDATE` — quyết định user chọn khi làm task này).
 */
export function DepartmentsListPage() {
  const { hasPermission } = usePermission();
  const canBulkDelete = hasPermission(PERMISSIONS.DEPARTMENT_DELETE);
  const canBulkRestore = hasPermission(PERMISSIONS.DEPARTMENT_RESTORE);
  const canBulkAct = canBulkDelete || canBulkRestore;

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState("code");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [isActive, setIsActive] = useState<"true" | "false" | "">("true");
  const debouncedKeyword = useDebounce(keyword);

  const [formState, setFormState] = useState<{ open: boolean; department?: Department }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Department | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchRestoreOpen, setBatchRestoreOpen] = useState(false);

  function handleSortChange(key: string) {
    if (key === sortBy) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setOrder("asc");
    }
    setPage(1);
  }

  function resetFilters() {
    setKeyword("");
    setIsActive("true");
    setPage(1);
  }

  const query = useDepartments({
    page,
    limit: LIMIT,
    keyword: debouncedKeyword || undefined,
    sortBy,
    order,
    isActive: isActive === "" ? undefined : isActive === "true",
  });
  const deleteMutation = useDeleteDepartment();
  const restoreMutation = useRestoreDepartment();
  const bulkDeleteMutation = useBulkDeleteDepartment();
  const bulkRestoreMutation = useBulkRestoreDepartment();

  const departments = query.data?.data ?? [];
  const pagination = query.data?.pagination;
  const selection = useRowSelection(departments.map((d) => d._id));
  const { activeIds, inactiveIds } = splitSelectionByActive(departments, selection.selectedIds, (d) => d.isActive !== false);

  const columns: DataTableColumn<Department>[] = [
    { key: "code", header: "Mã", className: "font-mono" },
    { key: "name", header: "Tên phòng ban" },
    {
      key: "createdAt",
      header: "Ngày tạo",
      render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "—"),
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
        title="Khoa/Phòng"
        description="Quản lý danh sách khoa/phòng ban trong bệnh viện."
        actions={
          <div className="flex gap-2">
            <PermissionGuard permission={PERMISSIONS.EXCEL_DEPARTMENT_SYNC}>
              <Button variant="secondary" size="sm" onClick={() => setSyncOpen(true)}>
                <FileSpreadsheet /> Đồng bộ từ Excel
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.DEPARTMENT_CREATE}>
              <Button size="sm" onClick={() => setFormState({ open: true })}>
                <Plus /> Tạo mới
              </Button>
            </PermissionGuard>
          </div>
        }
      />

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
          <label htmlFor="dept-search" className="text-xs font-medium text-muted-foreground">
            Tìm kiếm (mã/tên)
          </label>
          <input
            id="dept-search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập mã hoặc tên phòng ban..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="min-w-36 space-y-1.5">
          <label htmlFor="dept-active" className="text-xs font-medium text-muted-foreground">
            Hiển thị
          </label>
          <select
            id="dept-active"
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
        data={departments}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có khoa/phòng nào"
        emptyMessage="Tạo khoa/phòng đầu tiên để bắt đầu quản lý."
        sortBy={sortBy}
        order={order}
        onSortChange={handleSortChange}
        selection={
          canBulkAct
            ? { selectedIds: selection.selectedIds, onToggleRow: selection.toggleRow, onToggleAll: selection.toggleAll }
            : undefined
        }
        rowActions={(row) =>
          row.isActive === false ? (
            <div className="flex justify-end gap-1">
              <PermissionGuard permission={PERMISSIONS.DEPARTMENT_RESTORE}>
                <Button variant="ghost" size="sm" aria-label="Khôi phục" onClick={() => setRestoreTarget(row)}>
                  <RotateCcw />
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <div className="flex justify-end gap-1">
              <PermissionGuard permission={PERMISSIONS.DEPARTMENT_UPDATE}>
                <Button variant="ghost" size="sm" onClick={() => setFormState({ open: true, department: row })} aria-label="Sửa">
                  <Pencil />
                </Button>
              </PermissionGuard>
              <PermissionGuard permission={PERMISSIONS.DEPARTMENT_DELETE}>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)} aria-label="Xoá">
                  <Trash2 className="text-destructive" />
                </Button>
              </PermissionGuard>
            </div>
          )
        }
      />
      </div>

      {pagination && (
        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      <DepartmentFormModal
        open={formState.open}
        onClose={() => setFormState({ open: false })}
        department={formState.department}
      />

      <DepartmentSyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
        }}
        title="Xoá khoa/phòng"
        message={`Ẩn "${deleteTarget?.name}"? Backend sẽ từ chối nếu còn user/tài liệu/tài sản thuộc khoa này. Có thể khôi phục lại sau bằng bộ lọc "Hiển thị: Đã ẩn".`}
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
        title="Khôi phục khoa/phòng"
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
        title="Xoá khoa/phòng đã chọn"
        message={`Ẩn ${activeIds.length} khoa/phòng đang hoạt động đã chọn? Backend sẽ từ chối khoa nào còn user/tài liệu/tài sản tham chiếu.`}
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
        title="Khôi phục khoa/phòng đã chọn"
        message={`Khôi phục ${inactiveIds.length} khoa/phòng đã ẩn đã chọn?`}
        isLoading={bulkRestoreMutation.isPending}
      />
    </div>
  );
}
