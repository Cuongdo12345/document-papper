import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkRestoreDepartments } from "@/api/departments.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { showBulkDeleteToast } from "@/utils/bulkDeleteToast";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/** [MỚI DEV-086] Khôi phục hàng loạt — Batch Action Bar, cùng pattern `useBulkRestoreAssetCategory`. */
export function useBulkRestoreDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkRestoreDepartments(ids),
    onSuccess: (response, ids) => {
      showBulkDeleteToast(unwrapResponse(response).data, ids.length, "khôi phục");
      queryClient.invalidateQueries({ queryKey: ["departments", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
