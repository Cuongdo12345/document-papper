import { useQuery } from "@tanstack/react-query";
import { getConsumableItemById } from "@/api/consumable.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { ConsumableItem } from "@/types/consumable.types";

/** Roadmap B3 — chi tiết 1 vật tư (`ConsumableDetailPage`). */
export function useConsumableItemDetail(itemId: string | undefined) {
  return useQuery({
    queryKey: ["inventory", "items", "detail", itemId] as const,
    queryFn: async () => {
      const response = await getConsumableItemById(itemId!);
      return unwrapResponse<ConsumableItem>(response).data;
    },
    enabled: !!itemId,
  });
}
