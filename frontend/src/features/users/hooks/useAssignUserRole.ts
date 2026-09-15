import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignUserRole } from "@/api/users.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { AssignUserRoleRequest } from "@/types/user.types";

export function useAssignUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AssignUserRoleRequest }) => assignUserRole(id, body),
    onSuccess: () => {
      toast.success("Đã gán role");
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
