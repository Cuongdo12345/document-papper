import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createRole, updateRole, deleteRole, assignPermissionsToRole } from "@/api/rbac.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { CreateRoleRequest, UpdateRoleRequest, AssignPermissionsRequest } from "@/types/rbac.types";

/**
 * FE-08 — Role CRUD + assign-permissions. Gộp chung 1 file (cùng lý do
 * `useAssetAssignmentActions.ts` FE-06): TẤT CẢ đều invalidate list + detail
 * của CHÍNH role vừa đổi. `invalidateQueries({queryKey:["rbac","roles"]})`
 * KHỚP PREFIX — tự cascade luôn `useRoleList`'s `["rbac","roles","list",...]`
 * VÀ `useRoles()`'s `["rbac","roles"]` (dropdown Users/AssignRoleModal),
 * không cần gọi riêng từng key con.
 */
function invalidateRoleQueries(queryClient: QueryClient, id?: string) {
  queryClient.invalidateQueries({ queryKey: ["rbac", "roles"] });
  if (id) queryClient.invalidateQueries({ queryKey: ["rbac", "roles", "detail", id] });
}

/** Form (`RoleFormModal`, chế độ tạo) — KHÔNG toast lỗi ở hook, form tự hiển thị qua `apiError` (cùng `useCreateDepartment`). */
export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoleRequest) => createRole(body),
    onSuccess: () => invalidateRoleQueries(queryClient),
  });
}

/** Form (`RoleFormModal`, chế độ sửa). */
export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRoleRequest }) => updateRole(id, body),
    onSuccess: (_data, variables) => invalidateRoleQueries(queryClient, variables.id),
  });
}

/** Quick action (`ConfirmDialog`) — toast trong hook (cùng `useDeleteDepartment`). Backend tự chặn (409) nếu còn user gán role. */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      toast.success("Đã xoá role");
      invalidateRoleQueries(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

/** Quick action (nút "Lưu quyền" ở permission matrix, không phải form field-level) — toast trong hook. */
export function useAssignRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AssignPermissionsRequest }) => assignPermissionsToRole(id, body),
    onSuccess: (_data, variables) => {
      toast.success("Đã cập nhật danh sách quyền của role");
      invalidateRoleQueries(queryClient, variables.id);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
