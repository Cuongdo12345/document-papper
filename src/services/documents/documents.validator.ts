import { DOCUMENT_RULES } from "../../shared/constants/documentRules";
import ApiError from "../../shared/errors/ApiError";
import { Document, DocumentCategory, DocumentSubType } from "../../models/document.model";
import { Types } from "mongoose";
import { DOCUMENT_WORKFLOW, STATUS_PERMISSION, DocumentStatus } from "../../shared/constants/workflow-docs";

export const validateDocumentRule = (category: DocumentCategory, subType: DocumentSubType) => {
  const rule = DOCUMENT_RULES[subType];

  if (!rule) throw ApiError.badRequest("Loại giấy không hợp lệ");

  if (rule.category !== category)
    throw ApiError.badRequest("Category không khớp subType");

  return rule;
};

export const validateReference = async ({
  rule,
  referenceTo,
  department,
}: any) => {

  if (rule.requireReference) {
    if (!referenceTo)
      throw ApiError.badRequest("Bắt buộc có biên bản tham chiếu");

    const refDoc = await Document.findById(referenceTo)
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

export const validateRestorePermission = ({
  document,
  userId,
  isAdmin,
}: any) => {
  const isOwner = document.createdBy?.toString() === userId;

  if (!isAdmin && !isOwner) {
    throw ApiError.forbidden("Bạn không có quyền khôi phục document này");
  }
};

//=================================
//Phần xử lý validate workflow docs check 
//=================================
/**
 * Phần trạng thái workflows
 * @param current 
 * @param next 
 */
export const validateStatusTransition = (
  current: DocumentStatus,
  next: DocumentStatus
) => {
  const allowed = DOCUMENT_WORKFLOW[current];

  if (!allowed.includes(next)) {
    throw ApiError.badRequest(
      `Không thể chuyển trạng thái từ ${current} → ${next}`
    );
  }
};

/**
 * Phần check quyền 
 * @param next 
 * @param role 
 */
export const validateStatusPermission = (
  next: DocumentStatus,
  role: string
) => {
  const roles = STATUS_PERMISSION[next];

  if (!roles.includes(role)) {
    throw ApiError.forbidden("Không có quyền thực hiện hành động này");
  }
};
