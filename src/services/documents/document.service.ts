import { Types } from "mongoose";
import { generateDocumentCode } from "../../shared/utils/generateDocumentCode";
import ApiError from "../../shared/errors/ApiError";
import UserAudit from "../../models/users/userAudit.model";
import {
  validateDocumentRule,
  validateReference,
  validateObjectId,
  validateRestorePermission 
} from "./documents.validator";

import { buildReferenceArray } from "./documents.mapper";
import {
  createDocument,
  findDocumentById,
  findActiveDocument,
  findDocuments,
  countDocuments,
  deleteDocumentsByFilter,
  findProposalById,
  findReportsByProposal,
  findDocumentIncludeDeleted
} from "./documents.query";
// import { validateStatusTransition, validateStatusPermission,} from "../documents/documents.validator";
import { DOCUMENT_UPDATE_WHITELIST } from "./documents.constants";
// import { DocumentStatus } from "../../shared/constants/workflow-docs";

/* ===============================
   CREATE
=============================== */
export const createDocumentService = async (payload: any) => {
  const { userId, category, subType, title, department, referenceTo, meta } = payload;

  const rule = validateDocumentRule(category, subType);

  await validateReference({
    rule,
    referenceTo,
    department,
  });

  const documentCode = await generateDocumentCode(category, department);

  const referenceArray = buildReferenceArray(referenceTo);

  const doc = await createDocument({
    documentCode,
    category,
    subType,
    title,
    department,
    createdBy: userId,
    referenceTo: referenceArray,
    meta,
  });

  await UserAudit.create({
    user: userId,
    action: "CREATE",
    performedBy: userId,
    note: `Tạo document`,
  });

  return doc;
};

/* ===============================
   GET ALL
=============================== */
export const getAllDocumentsService = async (query: any) => {
  const {
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    order = "desc",
    fromDate,
    toDate,
    keyword,
    isActive,
    category,
    subType,
    department,
    status,
    createdBy,
    ...filters
  } = query;

  const filter: any = {};

  filter.isActive = filters.isActive === "false" ? false : true;

  // Các filter khác
  if (category) filter.category = category;
  if (subType) filter.subType = subType;
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (createdBy) filter.createdBy = createdBy;
  
  // Filter theo khoảng thời gian tạo document
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  Object.assign(filter, filters);

  if (keyword) {
    filter.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { documentCode: { $regex: keyword, $options: "i" } },
    ];
  }

  const pageNum = Math.max(parseInt(page), 1);
  const limitNum = Math.min(Math.max(parseInt(limit), 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const sort: any = {};
  sort[sortBy] = order === "asc" ? 1 : -1;

  const [data, total] = await Promise.all([
    findDocuments(filter, { skip, limit: limitNum, sort }),
    countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/* ===============================
   DETAIL
=============================== */
export const getDocumentDetailService = async (id: any) => {
  const doc = await findActiveDocument(id)
    .populate("department", "name code")
    .populate("createdBy", "fullName username")
    .populate("referenceTo");

  if (!doc) throw ApiError.notFound("Không tìm thấy document");

  return doc;
};

/* ===============================
   UPDATE
=============================== */
export const updateDocumentService = async ({
  id,
  userId,
  updateData,
}: any) => {

  if (!Types.ObjectId.isValid(id))
    throw ApiError.badRequest("ID không hợp lệ");

  const document = await findDocumentById(id);

  if (!document || !document.isActive)
    throw ApiError.notFound("Không tìm thấy");

  const safeUpdate: any = {};

  for (const key of DOCUMENT_UPDATE_WHITELIST) {
    if (key in updateData) safeUpdate[key] = updateData[key];
  }

  const forbidden = Object.keys(updateData).filter(
    (k) => !DOCUMENT_UPDATE_WHITELIST.includes(k as any)
  );

  if (forbidden.length)
    throw ApiError.badRequest("Field không hợp lệ");

  Object.assign(document, safeUpdate);

  document.updatedBy = new Types.ObjectId(userId);
  document.updatedAt = new Date();

  await UserAudit.create({
    user: userId,
    action: "UPDATE",
    performedBy: userId,
  });

  await document.save();

  return document;
};

/* ===============================
   DELETE
=============================== */
export const deleteDocumentService = async ({
  id,
  userId,
  role,
}: any) => {

  if (!Types.ObjectId.isValid(id))
    throw ApiError.badRequest("ID không hợp lệ");

  const document = await findDocumentById(id);

  if (!document || !document.isActive)
    throw ApiError.notFound("Không tìm thấy");

  if (role !== "ADMIN")
    throw ApiError.forbidden("Không có quyền");

  document.isActive = false;
  document.deletedAt = new Date();
  document.deletedBy = new Types.ObjectId(userId);

  await UserAudit.create({
    user: userId,
    action: "DELETE",
    performedBy: userId,
  });

  await document.save();

  return document;
};

/* ===============================
   DELETE many by month
=============================== */
export const deleteDocumentsByMonthService = async (
  month: number,
  year: number,
  filters: any = {}
) => {

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const query: any = {
    createdAt: {
      $gte: start,
      $lte: end,
    },
  };

  if (filters.category) query.category = filters.category;
  if (filters.subType) query.subType = filters.subType;
  if (filters.department) query.department = filters.department;

  const result = await deleteDocumentsByFilter(query);

  return {
    deletedCount: result.deletedCount,
  };
};

/* ===============================
   Get report by proposal
=============================== */
export const getReportsByProposalService = async (
  proposalId: any
) => {

  /* ===============================
   * 1. Validate ID
   * =============================== */
  validateObjectId(proposalId, "Proposal id không hợp lệ");

  const proposalObjectId = new Types.ObjectId(proposalId);

  /* ===============================
   * 2. Get proposal
   * =============================== */
  const proposal = await findProposalById(proposalObjectId);

  if (!proposal) {
    throw ApiError.notFound("Không tìm thấy proposal");
  }

  /* ===============================
   * 3. Nếu không có reference
   * =============================== */
  if (!proposal.referenceTo) {
    return {
      proposal,
      reports: [],
      totalReports: 0,
    };
  }

  /* ===============================
   * 4. Get reports
   * =============================== */
  const reports = await findReportsByProposal(proposalObjectId);

  return {
    proposal,
    totalReports: reports.length,
    reports,
  };
};

/* ===============================
   Restore documents
=============================== */
export const restoreDocumentService = async ({
  documentId,
  userId,
  isAdmin = false,
}: {
  documentId: any;
  userId: any;
  isAdmin?: boolean;
}) => {

  /* ===============================
   * 1. Validate ID
   * =============================== */
  validateObjectId(documentId, "Document ID không hợp lệ");

  /* ===============================
   * 2. Find document (include deleted)
   * =============================== */
  const document = await findDocumentIncludeDeleted(documentId);

  if (!document) {
    throw ApiError.notFound("Không tìm thấy document");
  }

  /* ===============================
   * 3. Check deleted
   * =============================== */
  if (!document.deletedAt) {
    throw ApiError.badRequest("Document chưa bị xoá");
  }

  if (document.isActive) {
    throw ApiError.badRequest("Tài liệu đang hoạt động");
  }

  /* ===============================
   * 4. Permission
   * =============================== */
  validateRestorePermission({
    document,
    userId,
    isAdmin,
  });

  /* ===============================
   * 5. Restore
   * =============================== */
  document.deletedAt = undefined;
  document.deletedBy = undefined;
  document.isActive = true;

  await document.save();

  return {
    message: "Khôi phục document thành công",
    data: document,
  };
};


 /* ===============================
   * Update workflow doc
   * =============================== */

// export const updateStatusService = async (
//   documentId: any,
//   nextStatus: DocumentStatus,
//   user: any,
//   userId: any
// ) => {
//   const doc = await Document.findById(documentId);

//   if (!doc) {
//     throw ApiError.notFound("Document không tồn tại");
//   }

//   // ❌ Lock nếu đã DONE
//   if (doc.repairStatus === "DONE") {
//     throw ApiError.badRequest("Document đã hoàn thành, không thể cập nhật");
//   }

//   // ✅ Validate flow
//   validateStatusTransition(doc.repairStatus, nextStatus as any);

//   // ✅ Validate permission
//   validateStatusPermission(nextStatus as any, user.role);

//   const oldStatus = doc.repairStatus;

//   // ✅ Update trực tiếp
//     doc.repairStatus = nextStatus;
//     doc.updatedBy = user._id;

//    await doc.save();

//   // ⚠️ Audit log (không có transaction)
//   await UserAudit.create({
//     user: doc._id,
//     action: "UPDATE",
//     note: oldStatus,
//     // to: nextStatus,
//     performedBy: userId,
//   });

//   return doc;
// };
