import { useQuery } from "@tanstack/react-query";
import { getPendingApprovals } from "@/api/workflow.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { GetPendingApprovalsParams, WorkflowPendingItem } from "@/types/workflow.types";

/** "Hộp thư chờ duyệt" — STATE_MAPPING.md pattern: `["workflows","pending",params]`, filter/pagination vào query key. */
export function usePendingApprovals(params: GetPendingApprovalsParams) {
  return useQuery({
    queryKey: ["workflows", "pending", params] as const,
    queryFn: async () => {
      const response = await getPendingApprovals(params);
      return unwrapResponse<WorkflowPendingItem[]>(response);
    },
    placeholderData: (prev) => prev,
  });
}
