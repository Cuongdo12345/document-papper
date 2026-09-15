import { useQuery } from "@tanstack/react-query";
import { getWorkflowByDocument } from "@/api/workflow.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { parseApiError } from "@/utils/parseApiError";
import type { WorkflowInstance } from "@/types/workflow.types";

/**
 * `GET /workflows/document/:documentId` — service `getWorkflowByDocument`
 * THROW 404 ("Document này chưa được submit workflow nào") khi document
 * chưa từng submit, KHÔNG trả `null` (đã xác nhận qua source). Query này
 * TẮT retry (404 không phải lỗi tạm thời) và expose `notSubmitted` riêng để
 * component phân biệt "chưa submit" (hiển thị nút Submit) với lỗi thật
 * (hiển thị ErrorState+retry).
 */
export function useDocumentWorkflow(documentId: string | undefined) {
  const query = useQuery({
    queryKey: ["workflows", "byDocument", documentId] as const,
    queryFn: async () => {
      const response = await getWorkflowByDocument(documentId!);
      return unwrapResponse<WorkflowInstance>(response).data;
    },
    enabled: !!documentId,
    retry: false,
  });

  const status = query.error ? parseApiError(query.error).status : undefined;
  const notSubmitted = status === 404;

  return { ...query, notSubmitted };
}
