import { useMutation } from "@tanstack/react-query";
import { downloadAssetImportTemplate } from "@/api/assets.api";
import { parseBlobExportError, triggerBrowserDownload } from "@/utils/downloadBlob";
import { toast } from "@/stores/toastStore";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/** Nút "Tải file mẫu" — cùng pattern `useExportAuditLogs`. */
export function useAssetImportTemplate() {
  const { type } = useAssetModule();
  return useMutation({
    mutationFn: async () => (await downloadAssetImportTemplate(type)).data,
    onSuccess: (blob) => triggerBrowserDownload(blob, "Mau-import-tai-san.xlsx"),
    onError: (error) => {
      void parseBlobExportError(error).then((message) => toast.error(message));
    },
  });
}
