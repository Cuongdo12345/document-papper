import { useMutation } from "@tanstack/react-query";
import { exportDocumentsExcel } from "@/api/documentExcel.api";
import { parseBlobExportError, triggerBrowserDownload } from "@/utils/downloadBlob";
import { toast } from "@/stores/toastStore";
import type { ExportDocumentsExcelParams } from "@/types/document.types";

/** Nút "Xuất Excel" (`DocumentExcelMenu`) — cùng pattern `useExportAuditLogs`. */
export function useExportDocumentsExcel() {
  return useMutation({
    mutationFn: async (params: ExportDocumentsExcelParams) => {
      const response = await exportDocumentsExcel(params);
      return response.data;
    },
    onSuccess: (blob) => {
      triggerBrowserDownload(blob, `Danh-sach-tai-lieu_${Date.now()}.xlsx`);
    },
    onError: (error) => {
      void parseBlobExportError(error).then((message) => toast.error(message));
    },
  });
}
