import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDocument } from "@/api/documents.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/** Quick action (ConfirmDialog) — toast trong hook. Backend CHẶN (400) nếu còn REPORT tham chiếu hoặc workflowStatus="pending"; 403 nếu không phải ADMIN. */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      toast.success("Đã xoá document");
      queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
