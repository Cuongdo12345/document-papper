import { DOCUMENT_RULES } from "../../shared/constants/documentRules";
import ApiError from "../../shared/errors/ApiError";
import { Document, DocumentCategory, DocumentSubType } from "../../models/documents/document.model";
import { Types } from "mongoose";

export const validateDocumentRule = (category: DocumentCategory, subType: DocumentSubType) => {
  const rule = DOCUMENT_RULES[subType];

  if (!rule) throw ApiError.badRequest("Loại giấy không hợp lệ");

  if (rule.category !== category)
    throw ApiError.badRequest("Category không khớp subType");

  return rule;
};

/**
 * Sửa Logic Bug #4: trước đây nếu `referenceTo` là mảng nhiều phần tử,
 * `Document.findById(referenceTo)` nhận cả mảng làm tham số → hành vi không
 * xác định (lỗi cast hoặc không match). Theo quyết định nghiệp vụ 1-1 (xem
 * `documents.mapper.ts`), hàm này giờ luôn chuẩn hoá `referenceTo` về đúng 1
 * ID đơn trước khi query — nếu tầng trên lỡ truyền mảng nhiều phần tử, throw
 * lỗi rõ ràng thay vì để `findById` xử lý sai âm thầm.
 */
export const validateReference = async ({
  rule,
  referenceTo,
  department,
}: any) => {

  if (rule.requireReference) {
    if (!referenceTo)
      throw ApiError.badRequest("Bắt buộc có biên bản tham chiếu");

    let refId = referenceTo;

    if (Array.isArray(refId)) {
      if (refId.length !== 1) {
        throw ApiError.badRequest(
          "referenceTo chỉ được tham chiếu đúng 1 document"
        );
      }
      refId = refId[0];
    }

    if (!Types.ObjectId.isValid(refId)) {
      throw ApiError.badRequest("referenceTo không hợp lệ");
    }

    const refDoc = await Document.findById(refId)
      .select("_id subType department")
      .lean();

    if (!refDoc)
      throw ApiError.notFound("Biên bản tham chiếu không tồn tại");

    if (
      rule.referenceSubType &&
      refDoc.subType !== rule.referenceSubType
    )
      throw ApiError.badRequest("Sai loại reference");

    if (department.toString() !== refDoc.department.toString())
      throw ApiError.badRequest("Khác khoa");
  }

  if (!rule.requireReference && referenceTo)
    throw ApiError.badRequest("Không cần reference");
};

export const validateObjectId = (id: any, message = "ID không hợp lệ") => {
  if (!Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest(message);
  }
};

/**
 * Sửa Logic Bug #3: trước đây so `document.createdBy?.toString()` (string)
 * với `userId` (thường là ObjectId nếu controller truyền `req.user!._id`
 * không convert) bằng `===` → luôn `false`, owner không bao giờ được coi là
 * chủ sở hữu, restore luôn thất bại cho user thường. Ép cả 2 vế về string
 * trước khi so sánh để không phụ thuộc kiểu dữ liệu tầng gọi truyền vào.
 */
export const validateRestorePermission = ({
  document,
  userId,
  isAdmin,
}: any) => {
  const isOwner =
    !!document.createdBy &&
    userId !== undefined &&
    userId !== null &&
    document.createdBy.toString() === userId.toString();

  if (!isAdmin && !isOwner) {
    throw ApiError.forbidden("Bạn không có quyền khôi phục document này");
  }
};

