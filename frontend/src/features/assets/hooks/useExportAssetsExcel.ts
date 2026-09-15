import { useMutation } from "@tanstack/react-query";
import { exportAssetsExcel } from "@/api/assets.api";
import { parseBlobExportError, triggerBrowserDownload } from "@/utils/downloadBlob";
import { toast } from "@/stores/toastStore";
import type { ExportAssetsExcelParams } from "@/types/asset.types";

/** Nút "Xuất Excel" (`AssetExcelMenu`) — cùng pattern `useExportAuditLogs`. */
export function useExportAssetsExcel() {
  return useMutation({
    mutationFn: async (params: ExportAssetsExcelParams) => (await exportAssetsExcel(params)).data,
    onSuccess: (blob) => triggerBrowserDownload(blob, `Danh-sach-tai-san_${Date.now()}.xlsx`),
    onError: (error) => {
      void parseBlobExportError(error).then((message) => toast.error(message));
    },
  });
}
