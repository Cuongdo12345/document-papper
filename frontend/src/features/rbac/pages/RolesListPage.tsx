import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { RbacSectionTabs } from "@/features/rbac/components/RbacSectionTabs";
import { RoleFormModal } from "@/features/rbac/components/RoleFormModal";
import { useRoleList } from "@/features/rbac/hooks/useRoleList";
import { useDeleteRole } from "@/features/rbac/hooks/useRoleActions";
import { isProtectedSystemRole } from "@/features/rbac/utils/roleGuards";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/utils/parseApiError";
import type { Role } from "@/types/rbac.types";

const LIMIT = 10;

export function RolesListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const debouncedKeyword = useDebounce(keyword);

  const [formState, setFormState] = useState<{ open: boolean; role?: Role }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  function handleSortChange(key: string) {
    if (key === sortBy) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setOrder("asc");
    }
    setPage(1);
  }

  const query = useRoleList({ page, limit: LIMIT, keyword: debouncedKeyword || undefined, sortBy: sortBy as "name" | "createdAt", order });
  const deleteMutation = useDeleteRole();

  const roles = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const columns: DataTableColumn<Role>[] = [
    {
      key: "name",
      header: "Tên role",
      render: (row) => (
        <Link to={`/app/rbac/roles/${row._id}`} className="font-medium text-foreground hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      key: "isSystemRole",
      header: "Loại",
      render: (row) => (isProtectedSystemRole(row) ? <StatusBadge variant="info">System Role</StatusBadge> : <StatusBadge>Thường</StatusBadge>),
    },
    {
      key: "permissions",
      header: "Số quyền",
      render: (row) => row.permissions?.length ?? "—",
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "—"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Phân quyền (RBAC)"
        description="Quản lý Role, Permission và Policy (ABAC) của hệ thống."
        actions={
          <PermissionGuard permission={PERMISSIONS.ROLE_CREATE}>
            <Button size="sm" onClick={() => setFormState({ open: true })}>
              <Plus /> Tạo role
            </Button>
          </PermissionGuard>
        }
      />

      <RbacSectionTabs />

      <FilterBar onReset={() => setKeyword("")}>
        <div className="min-w-48 space-y-1.5">
          <label htmlFor="role-search" className="text-xs font-medium text-muted-foreground">
            Tìm kiếm (tên role)
          </label>
          <input
            id="role-search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập tên role..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={roles}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có role nào"
        emptyMessage="Tạo role đầu tiên để bắt đầu phân quyền."
        sortBy={sortBy}
        order={order}
        onSortChange={handleSortChange}
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" aria-label="Xem chi tiết / gán quyền" onClick={() => navigate(`/app/rbac/roles/${row._id}`)}>
              <Eye />
            </Button>
            {/* System role (ADMIN) — bất biến ở backend (mọi authorization check chỉ dựa `isSystemRole===true` từ DEV-047 "Phase B"), ẩn luôn nút Sửa/Xoá thay vì để user bấm rồi gặp lỗi. Xem `isProtectedSystemRole()`. */}
            {!isProtectedSystemRole(row) && (
              <>
                <PermissionGuard permission={PERMISSIONS.ROLE_UPDATE}>
                  <Button variant="ghost" size="sm" onClick={() => setFormState({ open: true, role: row })} aria-label="Sửa">
                    <Pencil />
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission={PERMISSIONS.ROLE_DELETE}>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)} aria-label="Xoá">
                    <Trash2 className="text-destructive" />
                  </Button>
                </PermissionGuard>
              </>
            )}
          </div>
        )}
      />

      {pagination && (
        <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}

      <RoleFormModal open={formState.open} onClose={() => setFormState({ open: false })} role={formState.role} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
        }}
        title="Xoá role"
        message={`Xoá vĩnh viễn role "${deleteTarget?.name}"? Backend sẽ từ chối nếu còn user đang được gán role này.`}
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
