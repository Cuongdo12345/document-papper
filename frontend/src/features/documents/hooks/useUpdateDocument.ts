import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDocument } from "@/api/documents.api";
import type { UpdateDocumentRequest } from "@/types/document.types";

/** Mutation gắn với form (`DocumentEditModal`) — KHÔNG tự toast lỗi, component đọc `mutation.error` qua `parseApiError()`. */
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDocumentRequest }) => updateDocument(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
      queryClient.invalidateQueries({ queryKey: ["documents", "detail", variables.id] });
    },
  });
}
