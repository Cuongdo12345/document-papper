import { useMutation } from "@tanstack/react-query";
import { downloadAssetImportTemplate } from "@/api/assets.api";
import { parseBlobExportError, triggerBrowserDownload } from "@/utils/downloadBlob";
import { toast } from "@/stores/toastStore";

/** Nút "Tải file mẫu" — cùng pattern `useExportAuditLogs`. */
export function useAssetImportTemplate() {
  return useMutation({
    mutationFn: async () => (await downloadAssetImportTemplate()).data,
    onSuccess: (blob) => triggerBrowserDownload(blob, "Mau-import-tai-san.xlsx"),
    onError: (error) => {
      void parseBlobExportError(error).then((message) => toast.error(message));
    },
  });
}
