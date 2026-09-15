import { useQuery } from "@tanstack/react-query";
import { getConsumableTransactions } from "@/api/consumable.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { ConsumableTransaction, GetConsumableTransactionsParams } from "@/types/consumable.types";

/** Roadmap B3 — lịch sử giao dịch nhập/xuất theo 1 vật tư, phân trang. */
export function useConsumableTransactions(itemId: string | undefined, params: GetConsumableTransactionsParams) {
  return useQuery({
    queryKey: ["inventory", "items", itemId, "transactions", params] as const,
    queryFn: async () => {
      const response = await getConsumableTransactions(itemId!, params);
      return unwrapResponse<ConsumableTransaction[]>(response);
    },
    enabled: !!itemId,
    placeholderData: (prev) => prev,
  });
}
