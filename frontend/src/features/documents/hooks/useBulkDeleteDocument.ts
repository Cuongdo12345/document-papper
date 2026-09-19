import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkDeleteDocuments } from "@/api/documents.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { showBulkDeleteToast } from "@/utils/bulkDeleteToast";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/** [MỚI 2026-09-17, DEV-061] Xoá mềm hàng loạt — Batch Action Bar. Cùng guard ADMIN-only với `useDeleteDocument`. */
export function useBulkDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteDocuments(ids),
    onSuccess: (response, ids) => {
      showBulkDeleteToast(unwrapResponse(response).data, ids.length, "xoá");
      queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
