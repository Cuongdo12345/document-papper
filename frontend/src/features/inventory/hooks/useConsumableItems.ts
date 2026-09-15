import { useQuery } from "@tanstack/react-query";
import { getConsumableItems } from "@/api/consumable.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { ConsumableItem, GetConsumableItemsParams } from "@/types/consumable.types";

/** Roadmap B3 — danh sách vật tư, phân trang (`ConsumablesListPage`). */
export function useConsumableItems(params: GetConsumableItemsParams) {
  return useQuery({
    queryKey: ["inventory", "items", params] as const,
    queryFn: async () => {
      const response = await getConsumableItems(params);
      return unwrapResponse<ConsumableItem[]>(response);
    },
    placeholderData: (prev) => prev,
  });
}
