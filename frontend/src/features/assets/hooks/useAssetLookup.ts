import { useQuery } from "@tanstack/react-query";
import { lookupAssetOptionById, lookupAssetOptions } from "@/api/assets.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AssetLookupItem, AssetLookupParams } from "@/types/asset.types";

/**
 * FE-44 — tra cứu tài sản DÙNG CHUNG cho hai loại (ô chọn tài sản ở Tài liệu/Hợp đồng). Không cần
 * `AssetModuleLayout`. Backend (`GET /assets/lookup-options`) chỉ trả loại người dùng có quyền xem.
 */
export function useAssetLookup(params: AssetLookupParams, enabled = true) {
  return useQuery({
    queryKey: ["assets", "lookup", params] as const,
    queryFn: async () => {
      const response = await lookupAssetOptions(params);
      return unwrapResponse<AssetLookupItem[]>(response);
    },
    enabled,
  });
}

/**
 * 1 tài sản theo id kèm LOẠI — để dẫn từ link Thông báo/Tài liệu/Hợp đồng tới đúng trang chi tiết. Lỗi 404 =
 * không tồn tại HOẶC thuộc loại người dùng không xem được (backend không phân biệt, cố ý).
 */
export function useAssetLookupItem(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["assets", "lookup-item", id] as const,
    queryFn: async () => {
      const response = await lookupAssetOptionById(id!);
      return unwrapResponse<AssetLookupItem>(response).data;
    },
    enabled: !!id && enabled,
    retry: false,
  });
}
