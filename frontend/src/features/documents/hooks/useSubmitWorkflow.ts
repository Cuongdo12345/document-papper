import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitWorkflow } from "@/api/workflow.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { SubmitWorkflowRequest } from "@/types/workflow.types";

/** Quick action (chọn template trong modal nhỏ + xác nhận) — toast trong hook. */
export function useSubmitWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SubmitWorkflowRequest) => submitWorkflow(body),
    onSuccess: (_data, variables) => {
      toast.success("Đã submit vào workflow");
      queryClient.invalidateQueries({ queryKey: ["documents", "detail", variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ["workflows", "byDocument", variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
