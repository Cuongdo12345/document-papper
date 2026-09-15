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
import { PolicyFormModal } from "@/features/rbac/components/PolicyFormModal";
import { usePolicyList } from "@/features/rbac/hooks/usePolicyList";
import { useDeletePolicy } from "@/features/rbac/hooks/usePolicyActions";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/utils/parseApiError";
import type { Policy } from "@/types/rbac.types";

const LIMIT = 10;

/**
 * FE-08 — Policies (ABAC). `ROUTE_PERMISSION_MAP.md` (viết trước phiên này)
 * từng ghi "cân nhắc ẩn/gắn Beta — cơ chế ABAC chưa hoạt động runtime" — ghi
 * chú đó nay OUTDATED (CLAUDE.md Mục 3: source code > tài liệu cũ): DEV-034
 * đã tạo + xác minh 1 Policy thật hoạt động đúng ở `authorizePermission.middleware.ts`
 * (200 khi điều kiện khớp, 403 khi không, qua HTTP thật) — ABAC ĐANG hoạt
 * động runtime. Không gắn "Beta" ở trang này nữa.
 */
export function PoliciesListPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [resource, setResource] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const debouncedKeyword = useDebounce(keyword);
  const debouncedResource = useDebounce(resource);

  const [formState, setFormState] = useState<{ open: boolean; policy?: Policy }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null);

  function handleSortChange(key: string) {
    if (key === sortBy) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setOrder("asc");
    }
    setPage(1);
  }

  const query = usePolicyList({
    page,
    limit: LIMIT,
    keyword: debouncedKeyword || undefined,
    resource: debouncedResource || undefined,
    sortBy: sortBy as "createdAt" | "name" | "resource" | "action",
    order,
  });
  const deleteMutation = useDeletePolicy();

  const policies = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const columns: DataTableColumn<Policy>[] = [
    { key: "name", header: "Tên policy", className: "font-mono" },
    { key: "resource", header: "Resource" },
    { key: "action", header: "Action" },
    { key: "condition", header: "Điều kiện", className: "max-w-xs truncate font-mono text-xs", render: (row) => row.condition },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Phân quyền (RBAC)"
        description="Quản lý Role, Permission và Policy (ABAC) của hệ thống."
        actions={
          <PermissionGuard permission={PERMISSIONS.POLICY_CREATE}>
            <Button size="sm" onClick={() => setFormState({ open: true })}>
              <Plus /> Tạo policy
            </Button>
          </PermissionGuard>
        }
      />

      <RbacSectionTabs />

      <p className="text-xs text-muted-foreground">
        Policy CHỈ được xét khi role (RBAC) chưa có sẵn permission tương ứng — dùng để cấp quyền có điều kiện theo TỪNG bản ghi (vd:
        cùng khoa/phòng), không phải để thay thế RBAC thông thường.
      </p>

      <FilterBar
        onReset={() => {
          setKeyword("");
          setResource("");
        }}
      >
        <div className="min-w-48 space-y-1.5">
          <label htmlFor="policy-search" className="text-xs font-medium text-muted-foreground">
            Tìm kiếm (tên policy)
          </label>
          <input
            id="policy-search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập tên policy..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="min-w-40 space-y-1.5">
          <label htmlFor="policy-resource" className="text-xs font-medium text-muted-foreground">
            Resource
          </label>
          <input
            id="policy-resource"
            value={resource}
            onChange={(e) => {
              setResource(e.target.value);
              setPage(1);
            }}
            placeholder="VD: document"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={policies}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có policy nào"
        emptyMessage="Tạo policy đầu tiên để cấp quyền có điều kiện (ABAC)."
        sortBy={sortBy}
        order={order}
        onSortChange={handleSortChange}
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <PermissionGuard permission={PERMISSIONS.POLICY_UPDATE}>
              <Button variant="ghost" size="sm" onClick={() => setFormState({ open: true, policy: row })} aria-label="Sửa">
                <Pencil />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.POLICY_DELETE}>
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

      <PolicyFormModal open={formState.open} onClose={() => setFormState({ open: false })} policy={formState.policy} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
        }}
        title="Xoá policy"
        message={`Xoá vĩnh viễn policy "${deleteTarget?.name}"? Hành động này ảnh hưởng ngay tới quyền truy cập ABAC của mọi user khớp điều kiện, không thể hoàn tác.`}
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
