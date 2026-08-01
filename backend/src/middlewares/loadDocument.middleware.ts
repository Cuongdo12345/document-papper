import { Request, Response, NextFunction } from "express";
import { Document } from "../models/documents/document.model";
import ApiError from "../shared/errors/ApiError";

/**
 * Load document theo `:id` vào `req.resource` — dùng cho nhánh ABAC
 * (`authorizePermission` với `options.enablePolicies`).
 *
 * Sửa #8 (DOCUMENT_SECURITY_ANALYSIS.md, "Thấp" nhưng là dead-code footgun):
 * 1. `throw new Error(...)` → `ApiError.notFound(...)`: trước đây dùng
 *    `Error` thuần, sai convention lỗi toàn hệ thống (mọi nơi khác dùng
 *    `ApiError` để global error handler chuẩn hoá đúng status code) — nếu
 *    middleware này được gắn vào route mà không sửa, lỗi 404 sẽ không được
 *    chuẩn hoá đúng format response.
 * 2. Thêm filter `isActive: true`: trước đây `findById` không lọc, có thể
 *    load được cả document đã soft-delete vào `req.resource`, khiến policy
 *    ABAC (nếu bật) đánh giá nhầm trên dữ liệu đã "xoá".
 *
 * LƯU Ý: middleware này viết ra nhưng CHƯA được gắn vào route nào trong
 * `document.route.ts` (dead middleware, ghi nhận ở mục 3.1,
 * DOCUMENT_SECURITY_ANALYSIS.md) — cần tự gắn vào route cần dùng ABAC theo
 * tài nguyên cụ thể, ví dụ:
 *   router.put("/:id", authenticate,
 *     authorizePermission("DOCUMENT_UPDATE", { enablePolicies: true, resource: "document", action: "update" }),
 *     loadDocument, // ⚠️ phải chạy TRƯỚC authorizePermission nếu muốn req.resource
 *                   //    sẵn sàng cho nhánh ABAC — xem lưu ý thứ tự bên dưới.
 *     updateDocuments);
 *
 * ⚠️ THỨ TỰ MIDDLEWARE QUAN TRỌNG: `authorizePermission` đọc `req.resource`
 * ở nhánh ABAC, nên `loadDocument` PHẢI chạy TRƯỚC `authorizePermission`
 * trong chain, không phải sau như route mẫu thường viết theo thứ tự
 * "authenticate → authorize → business middleware". Đây là điểm dễ nhầm khi
 * tích hợp middleware này — nếu gắn sai thứ tự, `req.resource` vẫn
 * `undefined` giống hệt tình trạng "dead middleware" hiện tại.
 */
export const loadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      isActive: true,
    });

    if (!document) {
      throw ApiError.notFound("Không tìm thấy document");
    }

    req.resource = document;

    next();
  } catch (error) {
    next(error);
  }
};

