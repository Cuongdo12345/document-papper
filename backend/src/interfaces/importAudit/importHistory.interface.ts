import type { Types } from "mongoose";

/**
 * IMPORT HISTORY — audit trail RIÊNG cho tính năng import Excel (không dùng
 * chung `UserAudit` chung của hệ thống — xem lý do chi tiết ở lần build đầu:
 * enum `action` của `UserAudit` cố định, và nhu cầu lưu ở đây cần query lại
 * theo số liệu created/updated/reportsCreated/errors, khó làm nếu nhét vào
 * 1 field Mixed chung).
 *
 * Ghi 1 dòng ở ĐÂY cho MỌI lần gọi `importDocumentsExcel` — kể cả dryRun
 * (đánh dấu qua `mode`) — để trả lời được cả câu hỏi "user đã xem trước file
 * gì trước khi import thật".
 */

export type ImportHistoryMode = "dryRun" | "commit";
export type ImportHistoryStatus = "success" | "partial" | "failed";

export interface IImportHistory {
  importedBy: Types.ObjectId;
  fileName: string;
  mode: ImportHistoryMode;
  status: ImportHistoryStatus;
  totalRows: number;
  created: number;
  updated: number;
  reportsCreated: number;
  errorCount: number;
  /** Cap tối đa 100 lỗi/bản ghi (xem MAX_STORED_ERRORS ở excel.constants.ts) — tránh document phình to bất thường với file lỗi hàng loạt. */
  errors: { row: number; message: string }[];
  createdAt?: Date;
}