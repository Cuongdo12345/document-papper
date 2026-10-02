import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkDeleteDepartments } from "@/api/departments.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { showBulkDeleteToast } from "@/utils/bulkDeleteToast";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/** [MỚI DEV-086] Xoá mềm hàng loạt — Batch Action Bar, cùng pattern `useBulkDeleteAssetCategory`. */
export function useBulkDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteDepartments(ids),
    onSuccess: (response, ids) => {
      showBulkDeleteToast(unwrapResponse(response).data, ids.length);
      queryClient.invalidateQueries({ queryKey: ["departments", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
