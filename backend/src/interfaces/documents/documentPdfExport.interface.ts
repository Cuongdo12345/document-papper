import type { Types } from "mongoose";

/**
 * Roadmap B5 (2026-09-18) — 1 bản ghi audit MỖI LẦN PDF chính thức của 1
 * Document được xuất ra. `contentHash`/`signature` là bằng chứng "hệ thống
 * xác nhận dữ liệu (tiêu đề/meta/lịch sử phê duyệt) khớp đúng nội dung đã
 * xuất tại thời điểm này" — xem `shared/utils/pdfSignature.util.ts` cho giới
 * hạn pháp lý (KHÔNG phải chữ ký số CA). CHỈ ghi (không sửa/xoá) — dùng
 * `verifyDocumentPdfExportService` để xác minh lại 1 bản ghi cũ.
 */
export interface IDocumentPdfExport {
  document: Types.ObjectId;
  exportedBy?: Types.ObjectId;
  contentHash: string;
  signature: string;
  algorithm: string;
  createdAt?: Date;
}
