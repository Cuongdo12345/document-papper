import { useMutation } from "@tanstack/react-query";
import { exportAuditLogs } from "@/api/audit.api";
import { parseBlobExportError, triggerBrowserDownload } from "@/utils/downloadBlob";
import { toast } from "@/stores/toastStore";
import type { ExportAuditLogsParams } from "@/types/audit.types";

/**
 * Nút "Xuất Excel/CSV" (`AuditLogsPage`) — KHÔNG phải mutation đổi dữ liệu
 * server, chỉ tận dụng `useMutation` để có sẵn `isPending`/xử lý lỗi có cấu
 * trúc (cùng tinh thần dùng mutation cho action không-CRUD như
 * `useDeleteDocumentsByMonth`).
 *
 * [FE-15] `parseBlobExportError`/`triggerBrowserDownload` chuyển sang
 * `utils/downloadBlob.ts` (dùng chung với Document/Asset Excel export) —
 * hành vi giữ NGUYÊN, chỉ đổi nơi định nghĩa.
 */
export function useExportAuditLogs() {
  return useMutation({
    mutationFn: async (params: ExportAuditLogsParams) => {
      const response = await exportAuditLogs(params);
      return { blob: response.data, format: params.format ?? "xlsx" };
    },
    onSuccess: ({ blob, format }) => {
      triggerBrowserDownload(blob, `Audit-log_${Date.now()}.${format}`);
    },
    onError: (error) => {
      void parseBlobExportError(error).then((message) => toast.error(message));
    },
  });
}
