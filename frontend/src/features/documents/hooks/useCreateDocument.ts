import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDocument } from "@/api/documents.api";
import type { CreateDocumentRequest } from "@/types/document.types";

/** Mutation gắn với form (`DocumentCreatePage`) — KHÔNG tự toast lỗi ở đây, component đọc `mutation.error` qua `parseApiError()`. */
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateDocumentRequest) => createDocument(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
    },
  });
}
