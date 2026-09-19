import { useQuery } from "@tanstack/react-query";
import { getContractById } from "@/api/contract.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Contract } from "@/types/contract.types";

/** Roadmap B4 — chi tiết 1 hợp đồng. */
export function useContractDetail(contractId: string | undefined) {
  return useQuery({
    queryKey: ["contracts", "detail", contractId] as const,
    queryFn: async () => {
      const response = await getContractById(contractId!);
      return unwrapResponse<Contract>(response).data;
    },
    enabled: !!contractId,
  });
}
