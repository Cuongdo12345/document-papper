import { useMutation } from "@tanstack/react-query";
import { exportDocumentPdf } from "@/api/documents.api";
import { parseBlobExportError, triggerBrowserDownload } from "@/utils/downloadBlob";
import { toast } from "@/stores/toastStore";

/**
 * [MỚI 2026-09-18, DEV-064 — Roadmap B5] Nút "Xuất PDF" (`DocumentDetailPage`)
 * — cùng cách dùng `useMutation` cho action tải file nhị phân như
 * `useExportAuditLogs.ts` (không phải mutation đổi dữ liệu server, chỉ tận
 * dụng `isPending`/xử lý lỗi có cấu trúc sẵn).
 */
export function useExportDocumentPdf() {
  return useMutation({
    mutationFn: async ({ id, documentCode }: { id: string; documentCode: string }) => {
      const response = await exportDocumentPdf(id);
      return { blob: response.data, fileName: `${documentCode || id}.pdf` };
    },
    onSuccess: ({ blob, fileName }) => {
      triggerBrowserDownload(blob, fileName);
    },
    onError: (error) => {
      void parseBlobExportError(error).then((message) => toast.error(message));
    },
  });
}
