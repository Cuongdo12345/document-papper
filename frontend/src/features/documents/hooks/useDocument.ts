import { useQuery } from "@tanstack/react-query";
import { getDocumentById } from "@/api/documents.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Document } from "@/types/document.types";

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: ["documents", "detail", id] as const,
    queryFn: async () => {
      const response = await getDocumentById(id!);
      return unwrapResponse<Document>(response).data;
    },
    enabled: !!id,
  });
}
