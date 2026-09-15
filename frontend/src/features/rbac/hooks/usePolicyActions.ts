import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPolicy, updatePolicy, deletePolicy } from "@/api/rbac.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { CreatePolicyRequest, UpdatePolicyRequest } from "@/types/rbac.types";

/** Form (`PolicyFormModal`, chế độ tạo) — không toast lỗi ở hook. Backend validate cú pháp `condition` (400) NGAY LÚC tạo. */
export function useCreatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePolicyRequest) => createPolicy(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rbac", "policies"] }),
  });
}

/** Form (`PolicyFormModal`, chế độ sửa). */
export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePolicyRequest }) => updatePolicy(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rbac", "policies"] }),
  });
}

/** Quick action (`ConfirmDialog`) — toast trong hook. Policy không có guard "in use" (xem `deletePolicyService` — không có ref ObjectId nào tới Policy). */
export function useDeletePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: () => {
      toast.success("Đã xoá policy");
      queryClient.invalidateQueries({ queryKey: ["rbac", "policies"] });
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
