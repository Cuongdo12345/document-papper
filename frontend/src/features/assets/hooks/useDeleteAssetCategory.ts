import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAssetCategory } from "@/api/assetCategories.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/** Quick action (`ConfirmDialog`) — toast trong hook (cùng pattern `useDeleteAsset`). Backend tự chặn (400) nếu còn tài sản/danh mục con đang tham chiếu. */
export function useDeleteAssetCategory() {
  const { type } = useAssetModule();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAssetCategory(type, id),
    onSuccess: () => {
      toast.success("Đã xoá danh mục tài sản");
      queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
