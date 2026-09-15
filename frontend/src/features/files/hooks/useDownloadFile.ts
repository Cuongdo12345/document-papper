import { useMutation } from "@tanstack/react-query";
import { downloadFile } from "@/api/files.api";
import { parseBlobExportError, triggerBrowserDownload } from "@/utils/downloadBlob";
import { toast } from "@/stores/toastStore";
import type { UploadedFile } from "@/types/file.types";

/** Nút "Tải xuống" (`FilesListPage`) — cùng pattern `useExportAuditLogs`. */
export function useDownloadFile() {
  return useMutation({
    mutationFn: async (file: UploadedFile) => {
      const response = await downloadFile(file._id);
      return { blob: response.data, fileName: file.fileName };
    },
    onSuccess: ({ blob, fileName }) => {
      triggerBrowserDownload(blob, fileName);
    },
    onError: (error) => {
      void parseBlobExportError(error).then((message) => toast.error(message));
    },
  });
}
