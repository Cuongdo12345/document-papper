import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkInAsset } from "@/api/assets.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { Asset } from "@/types/asset.types";

/**
 * Giai đoạn 5 (roadmap A1) — bước 2 luồng kiểm kê: ghi nhận đã thấy tài sản
 * (`lastInventoryCheckAt`/`By`, KHÔNG đổi status/department — xem
 * `checkInAssetService` comment gốc). Toast trong hook, cùng quy ước action
 * không-form khác (`useDeleteFile`...) — `AssetScanPage` truyền THÊM
 * `onSuccess` riêng vào `mutate()` (TanStack Query gọi CẢ 2, không thay thế)
 * để tự cập nhật "đã kiểm kê trong phiên này" + reset form, không cần hook
 * này biết gì về UI cụ thể của trang gọi nó.
 */
export function useCheckInAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await checkInAsset(id);
      return unwrapResponse<Asset>(response).data;
    },
    onSuccess: (asset) => {
      toast.success(`Đã ghi nhận kiểm kê: ${asset.assetCode}`);
      queryClient.invalidateQueries({ queryKey: ["assets", "detail", asset._id] });
      queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
