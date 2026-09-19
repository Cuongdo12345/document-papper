import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkRestoreUsers } from "@/api/users.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { showBulkDeleteToast } from "@/utils/bulkDeleteToast";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/** [MỚI 2026-09-17, DEV-062] Khôi phục hàng loạt — Batch Action Bar. */
export function useBulkRestoreUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkRestoreUsers(ids),
    onSuccess: (response, ids) => {
      showBulkDeleteToast(unwrapResponse(response).data, ids.length, "khôi phục");
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
