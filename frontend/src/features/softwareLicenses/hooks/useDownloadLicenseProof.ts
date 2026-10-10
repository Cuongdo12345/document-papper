import { useMutation } from "@tanstack/react-query";
import { downloadSoftwareLicenseProofFile } from "@/api/softwareLicense.api";
import { parseBlobExportError, triggerBrowserDownload } from "@/utils/downloadBlob";
import { toast } from "@/stores/toastStore";

/** Khớp 3 mime-type `proofUploader` backend cho phép (`softwareLicense.routes.ts`). */
const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function useDownloadLicenseProof() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await downloadSoftwareLicenseProofFile(id);
      const ext = EXTENSION_BY_MIME[response.data.type] ?? "bin";
      return { blob: response.data, fileName: `chung-tu-ban-quyen-${id}.${ext}` };
    },
    onSuccess: ({ blob, fileName }) => triggerBrowserDownload(blob, fileName),
    onError: (error) => {
      void parseBlobExportError(error).then((message) => toast.error(message));
    },
  });
}
