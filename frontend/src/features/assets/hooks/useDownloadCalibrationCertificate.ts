import { useMutation } from "@tanstack/react-query";
import { downloadCalibrationCertificate } from "@/api/medicalDevice.api";
import { parseBlobExportError, triggerBrowserDownload } from "@/utils/downloadBlob";
import { toast } from "@/stores/toastStore";
import type { CalibrationRecordItem } from "@/types/medicalDevice.types";

/** Khớp đúng 3 mime-type `certificateUploader` backend cho phép (`medicalDevice.routes.ts`). */
const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/**
 * (A2, roadmap) Nút "Tải chứng nhận" (`CalibrationHistoryList`) — cùng
 * pattern `useDownloadFile` (FE-15). `assetId` truyền riêng (không có sẵn
 * trên `CalibrationRecordItem` — route cần cả 2 id).
 */
export function useDownloadCalibrationCertificate(assetId: string) {
  return useMutation({
    mutationFn: async (record: CalibrationRecordItem) => {
      const response = await downloadCalibrationCertificate(assetId, record._id);
      const ext = EXTENSION_BY_MIME[response.data.type] ?? "bin";
      return { blob: response.data, fileName: `chung-nhan-kiem-dinh-${record._id}.${ext}` };
    },
    onSuccess: ({ blob, fileName }) => {
      triggerBrowserDownload(blob, fileName);
    },
    onError: (error) => {
      void parseBlobExportError(error).then((message) => toast.error(message));
    },
  });
}
