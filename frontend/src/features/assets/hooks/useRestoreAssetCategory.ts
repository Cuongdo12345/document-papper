import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restoreAssetCategory } from "@/api/assetCategories.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/** Quick action (`ConfirmDialog`) — toast trong hook (cùng pattern `useRestoreAsset`). Chỉ dùng được sau khi backend nhận `isActive` ở `QueryAssetCategoryDTO` (mới thêm, xem `AssetCategoriesListPage.tsx`). */
export function useRestoreAssetCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreAssetCategory(id),
    onSuccess: () => {
      toast.success("Đã khôi phục danh mục tài sản");
      queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
