import { useState } from "react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { useAssignableRoles } from "@/features/rbac/hooks/useRoles";
import { useAssignUserRole } from "@/features/users/hooks/useAssignUserRole";
import type { UserListItem } from "@/types/user.types";

interface AssignRoleModalProps {
  open: boolean;
  onClose: () => void;
  user: UserListItem | null;
}

/**
 * Modal RIÊNG cho gán role — endpoint `PATCH /users/:id/role` tách khỏi form
 * Sửa user thường (`USER_ASSIGN_ROLE` là permission riêng, TASK-002).
 *
 * Wrapper `key={user._id}` ép remount `Content` mỗi khi mở cho user khác —
 * state cục bộ (`roleId`/`resetPermissions`) tự khởi tạo đúng giá trị ban
 * đầu qua `useState` lazy initializer, KHÔNG cần `useEffect` để đồng bộ lại
 * (tránh cascading render — khuyến nghị oxlint `set-state-in-effect`).
 */
export function AssignRoleModal({ open, onClose, user }: AssignRoleModalProps) {
  if (!user) return null;
  return <AssignRoleModalContent key={user._id} open={open} onClose={onClose} user={user} />;
}

function AssignRoleModalContent({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: UserListItem;
}) {
  const rolesQuery = useAssignableRoles();
  const mutation = useAssignUserRole();

  const [roleId, setRoleId] = useState(user.role ?? "");
  const [resetPermissions, setResetPermissions] = useState(false);

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={`Gán role — ${user.fullName}`}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button
            type="button"
            size="sm"
            loading={mutation.isPending}
            disabled={!roleId}
            onClick={() =>
              mutation.mutate({ id: user._id, body: { roleId, resetPermissions } }, { onSuccess: () => onClose() })
            }
          >
            Gán role
          </Button>
        </>
      }
    >
      {rolesQuery.isLoading ? (
        <LoadingState label="Đang tải danh sách role..." />
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="assign-role-select" className="text-sm font-medium text-foreground">
              Role mới
            </label>
            <select
              id="assign-role-select"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">-- Chọn role --</option>
              {rolesQuery.data?.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={resetPermissions}
              onChange={(e) => setResetPermissions(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Xoá permission tuỳ chỉnh (extra/deny) của user này
          </label>
        </div>
      )}
    </AppModal>
  );
}
