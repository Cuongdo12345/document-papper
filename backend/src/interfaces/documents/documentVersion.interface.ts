import type { Types } from "mongoose";

/**
 * Roadmap A4 (Document versioning) — snapshot nội dung Document TRƯỚC mỗi
 * lần bị ghi đè bởi `updateDocumentService`. Chỉ lưu 2 field thực sự đổi
 * được qua PUT (`title`/`meta`, xem `DOCUMENT_UPDATE_WHITELIST`) — KHÔNG
 * snapshot toàn bộ Document (workflowStatus/assignment/... không đổi qua
 * đường này, xem giải thích trong `document.service.ts`).
 *
 * `editedBy`/`editedAt` = người/thời điểm đã TẠO RA nội dung này (tức
 * `document.updatedBy`/`document.updatedAt` NGAY TRƯỚC lần ghi đè hiện tại,
 * KHÔNG PHẢI người đang thực hiện lần sửa mới) — mỗi bản ghi versions trả
 * lời đúng câu hỏi "nội dung NÀY do ai viết, khi nào, và có hiệu lực tới
 * khi nào" (suy ra từ `createdAt` của chính version record — thời điểm nó
 * bị thay thế).
 */
export interface IDocumentVersion {
  document: Types.ObjectId; // ref Document
  /** 1-based, tăng dần theo thời gian cho từng document (KHÔNG dùng chung giữa các document khác nhau). */
  versionNumber: number;
  title: string;
  meta: Record<string, any>;
  editedBy?: Types.ObjectId; // ref User — có thể thiếu nếu dữ liệu cũ/hệ thống tạo không có actor
  editedAt: Date;
  createdAt?: Date; // tự động (timestamps) — thời điểm version này bị THAY THẾ (đóng băng lại)
}
