import { useQuery } from "@tanstack/react-query";
import { getProposalConversion } from "@/api/dashboard.api";
import type { GetProposalConversionParams } from "@/types/dashboard.types";

/**
 * `data` lồng `{items, pagination}` NGAY BÊN TRONG `response.data.data`
 * (KHÁC shape phẳng `{data:[...], pagination}` — xem comment
 * `dashboard.types.ts`) — KHÔNG dùng `unwrapResponse()`, đọc trực tiếp.
 */
export function useProposalConversion(params: GetProposalConversionParams) {
  return useQuery({
    queryKey: ["dashboard", "kpi", "proposal-conversion", params] as const,
    queryFn: async () => {
      const response = await getProposalConversion(params);
      return response.data.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 20_000,
  });
}
