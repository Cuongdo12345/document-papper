import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkDeleteAssetCategories } from "@/api/assetCategories.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { showBulkDeleteToast } from "@/utils/bulkDeleteToast";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/** [MỚI 2026-09-16, DEV-060] Xoá mềm hàng loạt — Batch Action Bar. */
export function useBulkDeleteAssetCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteAssetCategories(ids),
    onSuccess: (response, ids) => {
      showBulkDeleteToast(unwrapResponse(response).data, ids.length);
      queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
