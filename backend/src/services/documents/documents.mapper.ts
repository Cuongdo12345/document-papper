import { Types } from "mongoose";
import ApiError from "../../shared/errors/ApiError";
import { FILTERABLE_DOCUMENT_FIELDS } from "./documents.constants";

/**
 * Chuẩn hoá `referenceTo` thành mảng ObjectId để khớp schema DB
 * (`Document.referenceTo: [ObjectId]`).
 *
 * QUYẾT ĐỊNH NGHIỆP VỤ đã chốt (theo ghi chú để ngỏ ở `documents.dto.ts` +
 * phân tích Business trước): mỗi REPORT chỉ tham chiếu ĐÚNG 1 PROPOSAL (quan
 * hệ 1-1). DB vẫn giữ kiểu mảng (`[ObjectId]`) để không phải migrate schema
 * ngay, nhưng ở tầng application, hàm này CHỈ chấp nhận 1 giá trị đơn hoặc
 * mảng đúng 1 phần tử — nếu nhận mảng nhiều phần tử, throw lỗi rõ ràng thay
 * vì âm thầm xử lý sai (Logic Bug #4 gốc: `validateReference` gọi
 * `Document.findById(referenceTo)` với cả mảng, hành vi không xác định).
 */
export const buildReferenceArray = (referenceTo: any): Types.ObjectId[] => {
  if (!referenceTo) return [];

  if (Array.isArray(referenceTo)) {
    if (referenceTo.length > 1) {
      throw ApiError.badRequest(
        "Chỉ được tham chiếu tối đa 1 document (referenceTo)"
      );
    }
    if (referenceTo.length === 0) return [];
    return [new Types.ObjectId(referenceTo[0])];
  }

  return [new Types.ObjectId(referenceTo)];
};

/**
 * Escape ký tự đặc biệt của regex trước khi đưa vào `$regex` — chặn rủi ro
 * ReDoS / lỗi regex khi `keyword` chứa ký tự có nghĩa đặc biệt trong regex
 * (Missing Validation #2, mục Search).
 */
export const escapeRegex = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Build filter MongoDB cho Document CHỈ từ danh sách field đã whitelist
 * (`FILTERABLE_DOCUMENT_FIELDS`) — thay cho `Object.assign(filter, filters)`
 * (Missing Validation #1 — NoSQL injection risk) và thay cho việc mỗi nơi
 * (`getAllDocumentsService`, `deleteDocumentsByMonthService`) tự viết lại
 * cùng 1 logic filter tương tự (Duplicate Logic #2).
 */
export const buildDocumentFilter = (
  input: Record<string, any>
): Record<string, any> => {
  const filter: Record<string, any> = {};

  for (const field of FILTERABLE_DOCUMENT_FIELDS) {
    const value = input?.[field];
    if (value !== undefined && value !== null && value !== "") {
      filter[field] = value;
    }
  }

  return filter;
};