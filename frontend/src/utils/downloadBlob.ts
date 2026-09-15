import axios from "axios";
import { parseApiError } from "@/utils/parseApiError";

/**
 * Tách ra từ `useExportAuditLogs.ts` (FE-11) — dùng chung cho MỌI mutation
 * tải file nhị phân qua axios (`responseType:"blob"`): Audit export, Document
 * Excel export/template, Asset Excel export/template. Trước FE-15 chỉ có 1
 * chỗ dùng nên để local trong hook đó là hợp lý; nay có thêm ≥4 chỗ dùng
 * giống hệt — tách theo CLAUDE.md Mục 11 (existing implementation trước khi
 * viết mới) để tránh lặp lại đúng logic 5 lần.
 */

/**
 * Đọc message lỗi khi request set `responseType:"blob"` — axios KHÔNG tự
 * parse JSON dù response lỗi thật (400/403...) vẫn có `Content-Type:
 * application/json` từ backend, vì `responseType` áp dụng cho MỌI response
 * (kể cả lỗi), không riêng response thành công. `parseApiError()` giả định
 * `response.data` đã là object JS nên đọc nhầm `Blob` → rơi vào fallback
 * chung chung. Đọc thủ công `Blob.text()` rồi `JSON.parse` trước, chỉ
 * fallback về `parseApiError` thường nếu không phải JSON hợp lệ.
 */
export async function parseBlobExportError(err: unknown): Promise<string> {
  if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
    try {
      const text = await err.response.data.text();
      const json = JSON.parse(text) as { message?: string };
      if (typeof json.message === "string") return json.message;
    } catch {
      // Không phải JSON hợp lệ (vd lỗi network/HTML lỗi 5xx từ proxy) — rơi xuống fallback bên dưới.
    }
  }
  return parseApiError(err).message;
}

/**
 * Kích hoạt tải file từ 1 Blob đã có sẵn trong bộ nhớ — `fileName` PHẢI
 * truyền đủ đuôi file (vd `"Danh-sach-tai-lieu.xlsx"`). Backend tự đặt tên
 * file qua header `Content-Disposition` nhưng FE tự đặt tên khi tải để
 * không phải đọc lại header (cần `Access-Control-Expose-Headers` riêng mới
 * đọc được `Content-Disposition` qua JS, backend hiện chưa cấu hình).
 */
export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
