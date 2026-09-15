import { useQuery } from "@tanstack/react-query";
import { getReportsByProposal } from "@/api/documents.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Document } from "@/types/document.types";

/** Danh sách REPORT tham chiếu ngược tới 1 PROPOSAL — chỉ dùng ở Document Detail khi `category==="PROPOSAL"`. */
export function useReportsByProposal(proposalId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["documents", "reports", proposalId] as const,
    queryFn: async () => {
      const response = await getReportsByProposal(proposalId!);
      return unwrapResponse<Document[]>(response).data;
    },
    enabled: !!proposalId && enabled,
  });
}
