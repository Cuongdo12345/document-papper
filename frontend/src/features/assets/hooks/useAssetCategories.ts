import { useQuery } from "@tanstack/react-query";
import { getAssetCategories } from "@/api/assetCategories.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AssetCategory, GetAssetCategoriesParams } from "@/types/asset.types";

/**
 * List phân trang — dùng CHUNG cho dropdown chọn danh mục ở Create/Edit
 * Asset (FE-06) VÀ `AssetCategoriesListPage` (Asset Categories UI, CRUD đầy
 * đủ). `ASSET_CATEGORY_VIEW` là permission RIÊNG (khác `ASSET_VIEW`), xem
 * `useAssetCreateForm` cho cách xử lý khi thiếu quyền ở form Asset.
 */
export function useAssetCategories(params: GetAssetCategoriesParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["asset-categories", "list", params] as const,
    queryFn: async () => {
      const response = await getAssetCategories(params);
      return unwrapResponse<AssetCategory[]>(response);
    },
    placeholderData: (prev) => prev,
    enabled: options?.enabled,
  });
}
