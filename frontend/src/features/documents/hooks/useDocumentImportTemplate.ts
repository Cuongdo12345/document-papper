import { useMutation } from "@tanstack/react-query";
import { downloadDocumentImportTemplate } from "@/api/documentExcel.api";
import { parseBlobExportError, triggerBrowserDownload } from "@/utils/downloadBlob";
import { toast } from "@/stores/toastStore";

/** Nút "Tải file mẫu" — cùng pattern `useExportAuditLogs`. */
export function useDocumentImportTemplate() {
  return useMutation({
    mutationFn: async () => (await downloadDocumentImportTemplate()).data,
    onSuccess: (blob) => triggerBrowserDownload(blob, "Mau-import-tai-lieu.xlsx"),
    onError: (error) => {
      void parseBlobExportError(error).then((message) => toast.error(message));
    },
  });
}
