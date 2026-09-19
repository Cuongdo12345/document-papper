import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkDeleteUsers } from "@/api/users.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { showBulkDeleteToast } from "@/utils/bulkDeleteToast";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/** [MỚI 2026-09-16, DEV-060] Vô hiệu hoá hàng loạt — Batch Action Bar. */
export function useBulkDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteUsers(ids),
    onSuccess: (response, ids) => {
      showBulkDeleteToast(unwrapResponse(response).data, ids.length);
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
