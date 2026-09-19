import { useQuery } from "@tanstack/react-query";
import { getConsumableRequests } from "@/api/consumable.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { ConsumableRequest, GetConsumableRequestsParams } from "@/types/consumable.types";

/** Roadmap B8 (DEV-067) — danh sách đề xuất/dự trù vật tư, phân trang (`ConsumableRequestsListPage`). */
export function useConsumableRequests(params: GetConsumableRequestsParams) {
  return useQuery({
    queryKey: ["inventory", "requests", params] as const,
    queryFn: async () => {
      const response = await getConsumableRequests(params);
      return unwrapResponse<ConsumableRequest[]>(response);
    },
    placeholderData: (prev) => prev,
  });
}
