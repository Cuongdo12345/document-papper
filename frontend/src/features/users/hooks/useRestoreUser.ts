import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restoreUser } from "@/api/users.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

export function useRestoreUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreUser(id),
    onSuccess: () => {
      toast.success("Đã khôi phục user");
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
