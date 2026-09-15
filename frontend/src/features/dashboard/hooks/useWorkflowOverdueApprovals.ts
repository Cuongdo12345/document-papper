import { useQuery } from "@tanstack/react-query";
import { getWorkflowOverdueApprovals } from "@/api/dashboard.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { OverdueApprovalItem, GetAlertListParams } from "@/types/dashboard.types";

/** Roadmap B1 (SLA & nhắc việc Workflow) — "Đề xuất trễ hạn". */
export function useWorkflowOverdueApprovals(params: GetAlertListParams) {
  return useQuery({
    queryKey: ["dashboard", "workflow", "overdue-approvals", params] as const,
    queryFn: async () => {
      const response = await getWorkflowOverdueApprovals(params);
      return unwrapResponse<OverdueApprovalItem[]>(response);
    },
    placeholderData: (prev) => prev,
    staleTime: 20_000,
  });
}
