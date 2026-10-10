import { useQuery } from "@tanstack/react-query";
import { getAssetCategories } from "@/api/assetCategories.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AssetCategory, GetAssetCategoriesParams } from "@/types/asset.types";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/**
 * List phân trang — dùng CHUNG cho dropdown chọn danh mục ở Create/Edit
 * Asset (FE-06) VÀ `AssetCategoriesListPage` (Asset Categories UI, CRUD đầy
 * đủ). `*_ASSET_CATEGORY_VIEW` là permission RIÊNG (khác `*_ASSET_VIEW`), xem
 * `useAssetCreateForm` cho cách xử lý khi thiếu quyền ở form Asset.
 */
export function useAssetCategories(params: GetAssetCategoriesParams, options?: { enabled?: boolean }) {
  const { type } = useAssetModule();
  return useQuery({
    queryKey: ["asset-categories", "list", type, params] as const,
    queryFn: async () => {
      const response = await getAssetCategories(type, params);
      return unwrapResponse<AssetCategory[]>(response);
    },
    placeholderData: (prev) => prev,
    enabled: options?.enabled,
  });
}
