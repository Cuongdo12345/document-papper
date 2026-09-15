import { useQuery } from "@tanstack/react-query";
import { getDocumentVersions } from "@/api/documents.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { DocumentVersion } from "@/types/document.types";

/** Roadmap A4 — lịch sử phiên bản nội dung, dùng ở Document Detail. */
export function useDocumentVersions(documentId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["documents", "versions", documentId] as const,
    queryFn: async () => {
      const response = await getDocumentVersions(documentId!);
      return unwrapResponse<DocumentVersion[]>(response).data;
    },
    enabled: !!documentId && enabled,
  });
}
