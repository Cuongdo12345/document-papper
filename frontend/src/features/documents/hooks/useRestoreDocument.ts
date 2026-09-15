import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restoreDocument } from "@/api/documents.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/** Quick action (ConfirmDialog) — toast trong hook. Backend CHỈ cho ADMIN hoặc chính người tạo document (`validateRestorePermission`). */
export function useRestoreDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreDocument(id),
    onSuccess: () => {
      toast.success("Đã khôi phục document");
      queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
