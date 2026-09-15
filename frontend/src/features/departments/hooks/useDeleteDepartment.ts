import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDepartment } from "@/api/departments.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/** Quick action (ConfirmDialog) — toast trong hook. Backend tự chặn (400) nếu còn user/document/asset thuộc khoa. */
export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      toast.success("Đã xoá khoa/phòng");
      queryClient.invalidateQueries({ queryKey: ["departments", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
