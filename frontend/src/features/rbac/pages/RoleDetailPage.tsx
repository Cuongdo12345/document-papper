import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { RbacSectionTabs } from "@/features/rbac/components/RbacSectionTabs";
import { RoleFormModal } from "@/features/rbac/components/RoleFormModal";
import { RolePermissionMatrix } from "@/features/rbac/components/RolePermissionMatrix";
import { useRoleDetail } from "@/features/rbac/hooks/useRoleDetail";
import { useAllRbacPermissions } from "@/features/rbac/hooks/useRbacPermissionList";
import { useDeleteRole, useAssignRolePermissions } from "@/features/rbac/hooks/useRoleActions";
import { isProtectedSystemRole } from "@/features/rbac/utils/roleGuards";
import { parseApiError } from "@/utils/parseApiError";

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";

export function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // "Chốt" phiên bản `role` gần nhất đã đồng bộ vào `selectedIds` — dùng
  // `updatedAt` (Mongoose `timestamps:true`, đổi mỗi lần `assignPermissionsToRoleService`
  // save) làm version key, KHÔNG dùng `useEffect` (oxlint `set-state-in-effect`:
  // nên derive trong lúc render thay vì đồng bộ 2 state qua side-effect).
  const [syncedAt, setSyncedAt] = useState(""); // "" = chưa sync lần nào, không khớp bất kỳ ISO string thật nào.

  const roleQuery = useRoleDetail(id);
  const role = roleQuery.data;
  const permissionsQuery = useAllRbacPermissions();
  const allPermissions = permissionsQuery.data ?? [];

  const deleteMutation = useDeleteRole();
  const assignMutation = useAssignRolePermissions();

  // Đồng bộ lại selection MỖI KHI role load xong / load lại (vd sau khi lưu
  // permission thành công, `updatedAt` đổi) — chạy NGAY TRONG RENDER (React
  // cho phép gọi setState khi đang render để "điều chỉnh state theo prop mới",
  // xử lý xong trước khi commit, không tạo thêm 1 vòng effect/render thừa).
  if (role && (role.updatedAt ?? "") !== syncedAt) {
    setSyncedAt(role.updatedAt ?? "");
    setSelectedIds(new Set((role.permissions ?? []).map((p) => p._id)));
  }

  if (roleQuery.isLoading) return <LoadingState label="Đang tải role..." />;
  if (roleQuery.isError || !role) {
    return (
      <ErrorState
        message={roleQuery.error ? parseApiError(roleQuery.error).message : "Không tìm thấy role"}
        onRetry={() => roleQuery.refetch()}
      />
    );
  }

  const initialIds = new Set((role.permissions ?? []).map((p) => p._id));
  const isDirty = selectedIds.size !== initialIds.size || [...selectedIds].some((id) => !initialIds.has(id));

  function toggle(permissionId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  }

  function toggleGroup(permissionIds: string[], nextChecked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of permissionIds) {
        if (nextChecked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={role.name}
        breadcrumb={[{ label: "Phân quyền", to: "/app/rbac/roles" }, { label: role.name }]}
        actions={
          !isProtectedSystemRole(role) && (
            <div className="flex flex-wrap gap-2">
              <PermissionGuard permission={PERMISSIONS.ROLE_UPDATE}>
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil /> Sửa tên
                </Button>
              </PermissionGuard>
              <PermissionGuard permission={PERMISSIONS.ROLE_DELETE}>
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 /> Xoá
                </Button>
              </PermissionGuard>
            </div>
          )
        }
      />

      <RbacSectionTabs />

      <div className={SECTION_CLASS}>
        <div className="flex flex-wrap items-center gap-2">
          {isProtectedSystemRole(role) && <StatusBadge variant="info">System Role — không thể đổi tên/xoá</StatusBadge>}
          <span className="text-xs text-muted-foreground">
            {role.createdAt ? `Tạo lúc ${new Date(role.createdAt).toLocaleString("vi-VN")}` : null}
          </span>
        </div>
      </div>

      <div className={SECTION_CLASS}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Danh sách quyền ({selectedIds.size}/{allPermissions.length})
          </h2>
          <PermissionGuard permission={PERMISSIONS.ROLE_ASSIGN_PERMISSIONS}>
            <Button
              size="sm"
              disabled={!isDirty || assignMutation.isPending}
              loading={assignMutation.isPending}
              onClick={() => {
                if (!id) return;
                assignMutation.mutate({ id, body: { permissionIds: [...selectedIds] } });
              }}
            >
              <Save /> Lưu thay đổi quyền
            </Button>
          </PermissionGuard>
        </div>

        {permissionsQuery.isLoading ? (
          <LoadingState variant="skeleton-table" />
        ) : permissionsQuery.isError ? (
          <ErrorState
            message={permissionsQuery.error ? parseApiError(permissionsQuery.error).message : undefined}
            onRetry={() => permissionsQuery.refetch()}
          />
        ) : (
          <RolePermissionMatrix
            allPermissions={allPermissions}
            selectedIds={selectedIds}
            onToggle={toggle}
            onToggleGroup={toggleGroup}
            disabled={assignMutation.isPending}
          />
        )}
      </div>

      {editOpen && <RoleFormModal key={role._id} open={editOpen} onClose={() => setEditOpen(false)} role={role} />}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(role._id, { onSuccess: () => navigate("/app/rbac/roles") })}
        title="Xoá role"
        message={`Xoá vĩnh viễn role "${role.name}"? Backend sẽ từ chối nếu còn user đang được gán role này.`}
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
