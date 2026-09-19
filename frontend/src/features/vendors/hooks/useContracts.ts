import { useQuery } from "@tanstack/react-query";
import { getContracts } from "@/api/contract.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Contract, GetContractsParams } from "@/types/contract.types";

/** Roadmap B4 — danh sách hợp đồng, phân trang (`ContractsListPage`). */
export function useContracts(params: GetContractsParams) {
  return useQuery({
    queryKey: ["contracts", "list", params] as const,
    queryFn: async () => {
      const response = await getContracts(params);
      return unwrapResponse<Contract[]>(response);
    },
    placeholderData: (prev) => prev,
  });
}
