import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "@/api/audit.api";
import type { GetAuditLogsParams } from "@/types/audit.types";

/** List phân trang cho `AuditLogsPage`. KHÔNG qua `unwrapResponse()` (xem `audit.api.ts` — response không bọc `{message, data}`), đọc thẳng `response.data`. */
export function useAuditLogs(params: GetAuditLogsParams) {
  return useQuery({
    queryKey: ["audit-logs", "list", params] as const,
    queryFn: async () => {
      const response = await getAuditLogs(params);
      return response.data;
    },
    placeholderData: (prev) => prev,
  });
}
