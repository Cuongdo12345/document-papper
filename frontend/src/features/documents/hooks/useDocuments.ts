import { useQuery } from "@tanstack/react-query";
import { getDocuments } from "@/api/documents.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Document, GetDocumentsParams } from "@/types/document.types";

/** STATE_MAPPING.md: `["documents","list",params]` — filter/sort/pagination đưa vào query key. */
export function useDocuments(params: GetDocumentsParams) {
  return useQuery({
    queryKey: ["documents", "list", params] as const,
    queryFn: async () => {
      const response = await getDocuments(params);
      return unwrapResponse<Document[]>(response);
    },
    placeholderData: (prev) => prev,
  });
}
