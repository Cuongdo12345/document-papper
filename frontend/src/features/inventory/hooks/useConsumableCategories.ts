import { useQuery } from "@tanstack/react-query";
import { getConsumableCategories } from "@/api/consumableCategory.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { ConsumableCategory, GetConsumableCategoriesParams } from "@/types/consumableCategory.types";

/**
 * List phân trang — dùng CHUNG cho dropdown chọn nhóm ở Create/Edit vật tư
 * VÀ `ConsumableCategoriesListPage` (CRUD đầy đủ). Mirror `useAssetCategories`.
 */
export function useConsumableCategories(params: GetConsumableCategoriesParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["consumable-categories", "list", params] as const,
    queryFn: async () => {
      const response = await getConsumableCategories(params);
      return unwrapResponse<ConsumableCategory[]>(response);
    },
    placeholderData: (prev) => prev,
    enabled: options?.enabled,
  });
}
