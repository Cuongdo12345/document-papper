import { useQuery } from "@tanstack/react-query";
import { getWorkflowHistory } from "@/api/workflow.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { GetWorkflowHistoryParams, WorkflowHistoryItem } from "@/types/workflow.types";

/**
 * "Lịch sử duyệt" (MỚI, 2026-09-10, user yêu cầu trực tiếp) — cùng pattern
 * `usePendingApprovals.ts`, query key riêng `["workflows","history",params]`
 * (KHÔNG dùng chung key `"pending"` — filter `status` khác nhau sẽ cache
 * lẫn lộn nếu gộp chung).
 */
export function useWorkflowHistory(params: GetWorkflowHistoryParams) {
  return useQuery({
    queryKey: ["workflows", "history", params] as const,
    queryFn: async () => {
      const response = await getWorkflowHistory(params);
      return unwrapResponse<WorkflowHistoryItem[]>(response);
    },
    placeholderData: (prev) => prev,
  });
}
