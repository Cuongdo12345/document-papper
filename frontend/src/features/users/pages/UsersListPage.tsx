import { useState } from "react";
import { Plus, Pencil, ShieldCheck, KeyRound, Ban, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { useUsers } from "@/features/users/hooks/useUsers";
import { useDisableUser } from "@/features/users/hooks/useDisableUser";
import { useRestoreUser } from "@/features/users/hooks/useRestoreUser";
import { useRoles } from "@/features/rbac/hooks/useRoles";
import { UserFormDrawer } from "@/features/users/components/UserFormDrawer";
import { AssignRoleModal } from "@/features/users/components/AssignRoleModal";
import { ResetPasswordModal } from "@/features/users/components/ResetPasswordModal";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/utils/parseApiError";
import type { GetUsersParams, UserListItem } from "@/types/user.types";

const LIMIT = 10;

export function UsersListPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<"" | "true" | "false">("");
  const [sortBy, setSortBy] = useState<GetUsersParams["sortBy"]>("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const debouncedKeyword = useDebounce(keyword);

  function handleSortChange(key: string) {
    if (key === sortBy) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key as GetUsersParams["sortBy"]);
      setOrder("asc");
    }
    setPage(1);
  }

  const [formState, setFormState] = useState<{ open: boolean; user?: UserListItem }>({ open: false });
  const [assignRoleTarget, setAssignRoleTarget] = useState<UserListItem | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserListItem | null>(null);
  const [disableTarget, setDisableTarget] = useState<UserListItem | null>(null);

  const params: GetUsersParams = {
    page,
    limit: LIMIT,
    keyword: debouncedKeyword || undefined,
    role: roleFilter || undefined,
    isActive: isActiveFilter || undefined,
    sortBy,
    order,
  };
  const query = useUsers(params);
  const rolesQuery = useRoles();
  const disableMutation = useDisableUser();
  const restoreMutation = useRestoreUser();

  const users = query.data?.data ?? [];
  const pagination = query.data?.pagination;
  // `GET /users` KHÔNG populate `role` (chỉ ObjectId thô) — resolve tên qua
  // danh sách Role riêng (types/user.types.ts).
  const roleNameById = new Map((rolesQuery.data ?? []).map((r) => [r._id, r.name]));

  const columns: DataTableColumn<UserListItem>[] = [
    { key: "username", header: "Tên đăng nhập", className: "font-mono", sortKey: "username" },
    { key: "fullName", header: "Họ tên", sortKey: "fullName" },
    { key: "role", header: "Vai trò", render: (row) => roleNameById.get(row.role) ?? "—" },
    { key: "department", header: "Khoa/Phòng", render: (row) => row.department?.name ?? "—" },
    {
      key: "isActive",
      header: "Trạng thái",
      render: (row) => (
        <StatusBadge variant={row.isActive ? "success" : "destructive"}>{row.isActive ? "Hoạt động" : "Đã khoá"}</StatusBadge>
      ),
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      sortKey: "createdAt",
      render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "—"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Người dùng"
        description="Quản lý tài khoản và phân quyền."
        actions={
          <PermissionGuard permission={PERMISSIONS.USER_CREATE}>
            <Button size="sm" onClick={() => setFormState({ open: true })}>
              <Plus /> Tạo mới
            </Button>
          </PermissionGuard>
        }
      />

      <FilterBar
        onReset={() => {
          setKeyword("");
          setRoleFilter("");
          setIsActiveFilter("");
          setPage(1);
        }}
      >
        <div className="min-w-48 space-y-1.5">
          <label htmlFor="user-search" className="text-xs font-medium text-muted-foreground">
            Tìm kiếm (username)
          </label>
          <input
            id="user-search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập tên đăng nhập..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="min-w-40 space-y-1.5">
          <label htmlFor="user-role-filter" className="text-xs font-medium text-muted-foreground">
            Vai trò
          </label>
          <select
            id="user-role-filter"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả</option>
            {rolesQuery.data?.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-36 space-y-1.5">
          <label htmlFor="user-active-filter" className="text-xs font-medium text-muted-foreground">
            Trạng thái
          </label>
          <select
            id="user-active-filter"
            value={isActiveFilter}
            onChange={(e) => {
              setIsActiveFilter(e.target.value as "" | "true" | "false");
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả</option>
            <option value="true">Hoạt động</option>
            <option value="false">Đã khoá</option>
          </select>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={users}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có user nào"
        emptyMessage="Tạo user đầu tiên hoặc điều chỉnh lại bộ lọc."
        sortBy={sortBy}
        order={order}
        onSortChange={handleSortChange}
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <PermissionGuard permission={PERMISSIONS.USER_UPDATE}>
              <Button variant="ghost" size="sm" onClick={() => setFormState({ open: true, user: row })} aria-label="Sửa">
                <Pencil />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.USER_ASSIGN_ROLE}>
              <Button variant="ghost" size="sm" onClick={() => setAssignRoleTarget(row)} aria-label="Gán role">
                <ShieldCheck />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.USER_RESET_PASSWORD}>
              <Button variant="ghost" size="sm" onClick={() => setResetPasswordTarget(row)} aria-label="Đặt lại mật khẩu">
                <KeyRound />
              </Button>
            </PermissionGuard>
            {row.isActive ? (
              <PermissionGuard permission={PERMISSIONS.USER_DELETE}>
                <Button variant="ghost" size="sm" onClick={() => setDisableTarget(row)} aria-label="Vô hiệu hoá">
                  <Ban className="text-destructive" />
                </Button>
              </PermissionGuard>
            ) : (
              <PermissionGuard permission={PERMISSIONS.USER_RESTORE}>
                <Button variant="ghost" size="sm" onClick={() => restoreMutation.mutate(row._id)} aria-label="Khôi phục">
                  <RotateCcw />
                </Button>
              </PermissionGuard>
            )}
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

      <UserFormDrawer open={formState.open} onClose={() => setFormState({ open: false })} user={formState.user} />
      <AssignRoleModal open={!!assignRoleTarget} onClose={() => setAssignRoleTarget(null)} user={assignRoleTarget} />
      <ResetPasswordModal open={!!resetPasswordTarget} onClose={() => setResetPasswordTarget(null)} user={resetPasswordTarget} />

      <ConfirmDialog
        open={!!disableTarget}
        onClose={() => setDisableTarget(null)}
        onConfirm={() => {
          if (!disableTarget) return;
          disableMutation.mutate(disableTarget._id, { onSuccess: () => setDisableTarget(null) });
        }}
        title="Vô hiệu hoá user"
        message={`Vô hiệu hoá tài khoản "${disableTarget?.username}"? User sẽ bị đăng xuất khỏi mọi thiết bị ngay lập tức.`}
        danger
        isLoading={disableMutation.isPending}
      />
    </div>
  );
}
