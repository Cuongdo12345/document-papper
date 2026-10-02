import { useQuery } from "@tanstack/react-query";
import { getProjectDoc } from "@/api/projectDocs.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { ProjectDoc } from "@/types/projectDocs.types";

/** DEV-075/FE-26 — nội dung 1 tài liệu, chỉ fetch khi có `id` (chọn từ danh sách). */
export function useProjectDoc(id: string | null) {
  return useQuery({
    queryKey: ["project-docs", id] as const,
    queryFn: async () => {
      const response = await getProjectDoc(id as string);
      return unwrapResponse<ProjectDoc>(response).data;
    },
    enabled: id !== null,
    staleTime: 5 * 60_000,
  });
}
