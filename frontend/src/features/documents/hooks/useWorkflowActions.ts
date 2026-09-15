import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { approveWorkflow, cancelWorkflow, completeWorkflow, rejectWorkflow } from "@/api/workflow.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { WorkflowActionRequest } from "@/types/workflow.types";

/**
 * FE-05 — 4 action Duyệt/Từ chối/Huỷ/Hoàn tất (roadmap Mục 11). Gộp chung 1
 * file (khác quy ước 1-hook/file phổ biến ở domain này) vì cả 4 dùng CHUNG
 * 1 shape mutation (`{id, comment?, documentId?}` → `{message}`) và CHUNG 1
 * chiến lược invalidate — tách riêng sẽ lặp lại nguyên khối logic 4 lần.
 *
 * `documentId` OPTIONAL trong biến mutate: 2 nơi gọi các hook này có ngữ
 * cảnh khác nhau — `DocumentDetailPage` biết sẵn `documentId` (invalidate
 * đúng cache `workflows/byDocument/:id` + `documents/detail/:id`),
 * `PendingApprovalsPage` (hộp thư chờ duyệt) chỉ có `workflowId` trong tay
 * tại điểm gọi nhanh — invalidate rộng `["workflows","pending"]` +
 * `["documents","list"]` vẫn đủ đúng cho cả 2 trường hợp (React Query
 * invalidate theo PREFIX, không cần khớp tuyệt đối params/query).
 */
interface WorkflowActionVariables extends WorkflowActionRequest {
  id: string;
  documentId?: string;
}

function invalidateAfterAction(queryClient: QueryClient, documentId: string | undefined) {
  queryClient.invalidateQueries({ queryKey: ["workflows", "pending"] });
  queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
  if (documentId) {
    queryClient.invalidateQueries({ queryKey: ["workflows", "byDocument", documentId] });
    queryClient.invalidateQueries({ queryKey: ["documents", "detail", documentId] });
  }
}

export function useApproveWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: WorkflowActionVariables) => approveWorkflow(id, { comment }),
    onSuccess: (_data, variables) => {
      toast.success("Đã duyệt bước này");
      invalidateAfterAction(queryClient, variables.documentId);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useRejectWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: WorkflowActionVariables) => rejectWorkflow(id, { comment }),
    onSuccess: (_data, variables) => {
      toast.success("Đã từ chối workflow");
      invalidateAfterAction(queryClient, variables.documentId);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useCancelWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: WorkflowActionVariables) => cancelWorkflow(id, { comment }),
    onSuccess: (_data, variables) => {
      toast.success("Đã huỷ workflow");
      invalidateAfterAction(queryClient, variables.documentId);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useCompleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: WorkflowActionVariables) => completeWorkflow(id, { comment }),
    onSuccess: (_data, variables) => {
      toast.success("Đã đánh dấu hoàn tất workflow");
      invalidateAfterAction(queryClient, variables.documentId);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
