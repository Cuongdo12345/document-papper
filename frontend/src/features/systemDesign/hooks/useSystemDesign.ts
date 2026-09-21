import { useQuery } from "@tanstack/react-query";
import { getSystemDesign } from "@/api/systemDesign.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { SystemDesignData } from "@/types/systemDesign.types";

/**
 * DEV-073/FE-24 — schema backend hầu như không đổi trong 1 phiên làm việc,
 * `staleTime` dài để không refetch mỗi lần quay lại trang (khác các trang
 * CRUD danh sách cần dữ liệu tươi).
 */
export function useSystemDesign() {
  return useQuery({
    queryKey: ["system-design"] as const,
    queryFn: async () => {
      const response = await getSystemDesign();
      return unwrapResponse<SystemDesignData>(response).data;
    },
    staleTime: 5 * 60_000,
  });
}
