import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkRestoreDocuments } from "@/api/documents.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { showBulkDeleteToast } from "@/utils/bulkDeleteToast";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/** [MỚI 2026-09-17, DEV-061] Khôi phục hàng loạt — Batch Action Bar. Cùng guard ADMIN-hoặc-người-tạo với `useRestoreDocument`. */
export function useBulkRestoreDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkRestoreDocuments(ids),
    onSuccess: (response, ids) => {
      showBulkDeleteToast(unwrapResponse(response).data, ids.length, "khôi phục");
      queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
