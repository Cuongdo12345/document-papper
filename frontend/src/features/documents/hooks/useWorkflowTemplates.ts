import { useQuery } from "@tanstack/react-query";
import { getWorkflowTemplates } from "@/api/workflow.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { WorkflowTemplate } from "@/types/workflow.types";

/** Dùng cho dropdown chọn template khi "Submit vào workflow" — danh sách nhỏ, không cần pagination. */
export function useWorkflowTemplates() {
  return useQuery({
    queryKey: ["workflows", "templates"] as const,
    queryFn: async () => {
      const response = await getWorkflowTemplates();
      return unwrapResponse<WorkflowTemplate[]>(response).data;
    },
    staleTime: 5 * 60_000,
  });
}
