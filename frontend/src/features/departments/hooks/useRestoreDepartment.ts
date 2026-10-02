import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restoreDepartment } from "@/api/departments.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/** [MỚI DEV-086] Quick action (ConfirmDialog) — toast trong hook, cùng pattern `useRestoreAssetCategory`. */
export function useRestoreDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreDepartment(id),
    onSuccess: () => {
      toast.success("Đã khôi phục khoa/phòng");
      queryClient.invalidateQueries({ queryKey: ["departments", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
