import { useState } from "react";
import { Plus, Pencil, Trash2, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useDeleteDepartment } from "@/features/departments/hooks/useDeleteDepartment";
import { DepartmentFormModal } from "@/features/departments/components/DepartmentFormModal";
import { DepartmentSyncModal } from "@/features/departments/components/DepartmentSyncModal";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/utils/parseApiError";
import type { Department } from "@/types/department.types";

const LIMIT = 10;

export function DepartmentsListPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState("code");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const debouncedKeyword = useDebounce(keyword);

  const [formState, setFormState] = useState<{ open: boolean; department?: Department }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);

  function handleSortChange(key: string) {
    if (key === sortBy) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setOrder("asc");
    }
    setPage(1);
  }

  const query = useDepartments({ page, limit: LIMIT, keyword: debouncedKeyword || undefined, sortBy, order });
  const deleteMutation = useDeleteDepartment();

  const departments = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const columns: DataTableColumn<Department>[] = [
    { key: "code", header: "Mã", className: "font-mono" },
    { key: "name", header: "Tên phòng ban" },
    {
      key: "createdAt",
      header: "Ngày tạo",
      render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "—"),
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

      <FilterBar onReset={() => setKeyword("")}>
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
      </FilterBar>

      <DataTable
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
        rowActions={(row) => (
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
        )}
      />

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
        message={`Xoá vĩnh viễn "${deleteTarget?.name}"? Backend sẽ từ chối nếu còn user/tài liệu/tài sản thuộc khoa này.`}
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
