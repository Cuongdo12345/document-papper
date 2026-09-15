import { useQuery } from "@tanstack/react-query";
import { getImportHistory } from "@/api/documentExcel.api";
import type { GetImportHistoryParams } from "@/types/importHistory.types";

/**
 * DÙNG CHUNG cho Document VÀ Asset — `ImportHistory` là 1 collection duy
 * nhất ghi bởi cả 2 domain (xem `types/importHistory.types.ts`), endpoint
 * chỉ mount ở router Document (`/export/import-history`) — `features/assets`
 * import thẳng hook này thay vì tạo bản sao.
 */
export function useImportHistory(params: GetImportHistoryParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["import-history", "list", params] as const,
    queryFn: async () => {
      const response = await getImportHistory(params);
      return response.data.data;
    },
    enabled: options?.enabled,
    placeholderData: (prev) => prev,
  });
}
