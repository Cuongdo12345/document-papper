import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkRestoreAssetCategories } from "@/api/assetCategories.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { showBulkDeleteToast } from "@/utils/bulkDeleteToast";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/** [MỚI 2026-09-17, DEV-062] Khôi phục hàng loạt — Batch Action Bar. */
export function useBulkRestoreAssetCategory() {
  const { type } = useAssetModule();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkRestoreAssetCategories(type, ids),
    onSuccess: (response, ids) => {
      showBulkDeleteToast(unwrapResponse(response).data, ids.length, "khôi phục");
      queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
