import { useMutation, useQueryClient } from "@tanstack/react-query";
import { disableUser } from "@/api/users.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/** Quick action (trigger từ nút + ConfirmDialog, không có form) — toast trong hook. */
export function useDisableUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => disableUser(id),
    onSuccess: () => {
      toast.success("Đã vô hiệu hoá user");
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
