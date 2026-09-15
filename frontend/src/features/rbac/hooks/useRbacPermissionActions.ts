import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createRbacPermission, updateRbacPermission, deleteRbacPermission } from "@/api/rbac.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { CreateRbacPermissionRequest, UpdateRbacPermissionRequest } from "@/types/rbac.types";

function invalidatePermissionQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["rbac", "permissions"] }); // gồm cả "list" (phân trang) và "all" (matrix nguồn)
}

/** Form (`RbacPermissionFormModal`, chế độ tạo) — không toast lỗi ở hook. */
export function useCreateRbacPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRbacPermissionRequest) => createRbacPermission(body),
    onSuccess: () => invalidatePermissionQueries(queryClient),
  });
}

/** Form (`RbacPermissionFormModal`, chế độ sửa). */
export function useUpdateRbacPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRbacPermissionRequest }) => updateRbacPermission(id, body),
    onSuccess: () => invalidatePermissionQueries(queryClient),
  });
}

/** Quick action (`ConfirmDialog`) — toast trong hook. Backend tự chặn (409) nếu còn role/user đang dùng permission này. */
export function useDeleteRbacPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRbacPermission(id),
    onSuccess: () => {
      toast.success("Đã xoá permission");
      invalidatePermissionQueries(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
