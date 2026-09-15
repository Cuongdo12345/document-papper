import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { RbacSectionTabs } from "@/features/rbac/components/RbacSectionTabs";
import { RbacPermissionFormModal } from "@/features/rbac/components/RbacPermissionFormModal";
import { useRbacPermissionList } from "@/features/rbac/hooks/useRbacPermissionList";
import { useDeleteRbacPermission } from "@/features/rbac/hooks/useRbacPermissionActions";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/utils/parseApiError";
import type { RbacPermission } from "@/types/rbac.types";

const LIMIT = 10;

export function PermissionsListPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [resource, setResource] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const debouncedKeyword = useDebounce(keyword);
  const debouncedResource = useDebounce(resource);

  const [formState, setFormState] = useState<{ open: boolean; permission?: RbacPermission }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<RbacPermission | null>(null);

  function handleSortChange(key: string) {
    if (key === sortBy) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setOrder("asc");
    }
    setPage(1);
  }

  const query = useRbacPermissionList({
    page,
    limit: LIMIT,
    keyword: debouncedKeyword || undefined,
    resource: debouncedResource || undefined,
    sortBy: sortBy as "createdAt" | "name" | "resource" | "action",
    order,
  });
  const deleteMutation = useDeleteRbacPermission();

  const permissions = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const columns: DataTableColumn<RbacPermission>[] = [
    { key: "name", header: "Tên permission", className: "font-mono" },
    { key: "resource", header: "Resource" },
    { key: "action", header: "Action" },
    { key: "description", header: "Mô tả", render: (row) => row.description || "—" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Phân quyền (RBAC)"
        description="Quản lý Role, Permission và Policy (ABAC) của hệ thống."
        actions={
          <PermissionGuard permission={PERMISSIONS.PERMISSION_CREATE}>
            <Button size="sm" onClick={() => setFormState({ open: true })}>
              <Plus /> Tạo permission
            </Button>
          </PermissionGuard>
        }
      />

      <RbacSectionTabs />

      <FilterBar
        onReset={() => {
          setKeyword("");
          setResource("");
        }}
      >
        <div className="min-w-48 space-y-1.5">
          <label htmlFor="perm-search" className="text-xs font-medium text-muted-foreground">
            Tìm kiếm (tên/mô tả)
          </label>
          <input
            id="perm-search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập tên permission..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="min-w-40 space-y-1.5">
          <label htmlFor="perm-resource" className="text-xs font-medium text-muted-foreground">
            Resource
          </label>
          <input
            id="perm-resource"
            value={resource}
            onChange={(e) => {
              setResource(e.target.value);
              setPage(1);
            }}
            placeholder="VD: DOCUMENT"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={permissions}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có permission nào"
        emptyMessage="Tạo permission đầu tiên để bắt đầu phân quyền."
        sortBy={sortBy}
        order={order}
        onSortChange={handleSortChange}
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <PermissionGuard permission={PERMISSIONS.PERMISSION_UPDATE}>
              <Button variant="ghost" size="sm" onClick={() => setFormState({ open: true, permission: row })} aria-label="Sửa">
                <Pencil />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.PERMISSION_DELETE}>
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)} aria-label="Xoá">
                <Trash2 className="text-destructive" />
              </Button>
            </PermissionGuard>
          </div>
        )}
      />

      {pagination && (
        <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}

      <RbacPermissionFormModal open={formState.open} onClose={() => setFormState({ open: false })} permission={formState.permission} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
        }}
        title="Xoá permission"
        message={`Xoá vĩnh viễn permission "${deleteTarget?.name}"? Backend sẽ từ chối nếu còn role hoặc user đang dùng permission này.`}
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
