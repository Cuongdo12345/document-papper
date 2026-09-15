import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restoreAsset } from "@/api/assets.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/**
 * DEV-035 — trước đây hook này không có consumer (không có cách nào reach
 * asset đã xoá mềm qua UI, xem `useDeleteAsset.ts`/FE-06.md Remaining Issue
 * #1) nên đã bị xoá. Tạo lại sau khi `QueryAssetDTO.isActive` được thêm —
 * `AssetsListPage` giờ lọc được `isActive=false` và hiện action Khôi phục
 * ngay trên hàng (cùng pattern `useRestoreDocument`).
 */
export function useRestoreAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreAsset(id),
    onSuccess: () => {
      toast.success("Đã khôi phục tài sản");
      queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
