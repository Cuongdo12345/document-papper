import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAsset } from "@/api/assets.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/** Quick action (ConfirmDialog) — toast trong hook (cùng pattern `useDeleteDocument`). */
export function useDeleteAsset() {
  const { type } = useAssetModule();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAsset(type, id),
    onSuccess: () => {
      toast.success("Đã xoá tài sản");
      queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
