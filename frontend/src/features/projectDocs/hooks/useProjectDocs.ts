import { useQuery } from "@tanstack/react-query";
import { getProjectDocs } from "@/api/projectDocs.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { ProjectDocSummary } from "@/types/projectDocs.types";

/** DEV-075/FE-26 — danh sách 12 tài liệu, gần như không đổi trong 1 phiên làm việc. */
export function useProjectDocs() {
  return useQuery({
    queryKey: ["project-docs"] as const,
    queryFn: async () => {
      const response = await getProjectDocs();
      return unwrapResponse<ProjectDocSummary[]>(response).data;
    },
    staleTime: 5 * 60_000,
  });
}
