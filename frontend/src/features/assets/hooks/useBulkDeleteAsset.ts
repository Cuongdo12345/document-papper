import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkDeleteAssets } from "@/api/assets.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { showBulkDeleteToast } from "@/utils/bulkDeleteToast";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/** [MỚI 2026-09-16, DEV-060] Xoá mềm hàng loạt — Batch Action Bar. */
export function useBulkDeleteAsset() {
  const { type } = useAssetModule();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteAssets(type, ids),
    onSuccess: (response, ids) => {
      showBulkDeleteToast(unwrapResponse(response).data, ids.length);
      queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
