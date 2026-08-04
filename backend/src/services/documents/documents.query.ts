import { Document, DocumentSubType } from "../../models/documents/document.model";
import ApiError from "../../shared/errors/ApiError";
import type { ClientSession } from "mongoose";

export const createDocument = async (data: any, session?: ClientSession) => {
  const [doc] = await Document.create([data], { session });
  return doc;
};

export const findDocumentById = (id: any) => {
  return Document.findById(id);
};

export const findActiveDocument = (id: any) => {
  return Document.findOne({ _id: id, isActive: true });
};

/**
 * 🔗 GIAI ĐOẠN 3 (module Asset) — kiểm tra 1 asset có đang tồn tại đề xuất
 * sửa chữa (`PROPOSE_REPAIR`) nào CHƯA DUYỆT XONG (`workflowStatus: "pending"`)
 * hay không. Dùng để chặn tạo đề xuất sửa chữa TRÙNG LẶP cho cùng 1 asset
 * khi đề xuất trước còn đang chờ duyệt — tránh 2 luồng workflow độc lập
 * cùng tranh nhau đổi trạng thái 1 asset (VD: đề xuất A duyệt xong trước,
 * chuyển asset sang UNDER_MAINTENANCE, rồi đề xuất B duyệt xong sau đó lại
 * cố set UNDER_MAINTENANCE lần nữa — vô nghĩa và dễ gây nhầm lẫn báo cáo).
 */
export const findPendingRepairProposalForAsset = (assetId: any) => {
  return Document.findOne({
    relatedAsset: assetId,
    subType: DocumentSubType.PROPOSE_REPAIR,
    workflowStatus: "pending",
    isActive: true,
  });
};

/**
 * Gộp pattern lặp lại giữa Update/Delete (Duplicate Logic #1):
 * findDocumentById → check `!document || !document.isActive` → throw
 * notFound. Gọi hàm này SAU khi đã `validateObjectId(id)` ở service.
 */
export const getActiveDocumentOrFail = async (id: any) => {
  const document = await findDocumentById(id);

  if (!document || !document.isActive) {
    throw ApiError.notFound("Không tìm thấy");
  }

  return document;
};

export const countDocuments = (filter: any) => {
  return Document.countDocuments(filter);
};

export const findDocuments = (filter: any, options: any) => {
  return Document.find(filter)
    .populate("department", "code name")
    .populate("createdBy", "username fullName")
    // Sửa Duplicate/Inconsistent Logic #3: giới hạn field populate
    // `referenceTo` giống hệt Detail (`getDocumentDetailService`) — trước
    // đây List chỉ lấy `subType`, Detail lấy full document con, không rõ chủ
    // đích. Nay đồng bộ 1 mức chi tiết cho cả 2 API.
    .populate("referenceTo", "subType title documentCode")
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit)
    .lean();
};

/* ===============================
   DELETE MANY BY FILTER
=============================== */
export const deleteDocumentsByFilter = (query: any) => {
  return Document.deleteMany(query);
};

/* ===============================
   FIND PROPOSAL
=============================== */
export const findProposalById = (id: any) => {
  return Document.findOne({
    _id: id,
    category: "PROPOSAL",
    isActive: true,
  })
    .populate("department", "name code")
    .populate("createdBy", "fullName username")
    .lean();
};

/* ===============================
   FIND REPORTS BY PROPOSAL
=============================== */
export const findReportsByProposal = (proposalId: any) => {
  return Document.find({
    referenceTo: proposalId,
    category: "REPORT",
    subType: { $in: ["CHECK_DAMAGE", "CONFIRM_STATUS"] }, // bỏ hardcode 1 giá trị
    isActive: true,
  })
    .populate("department", "name code")
    .populate("createdBy", "fullName username")
    .sort({ createdAt: 1 })
    .lean();
};

/**
 * Đếm số REPORT còn đang active tham chiếu tới 1 PROPOSAL — dùng để chặn xoá
 * PROPOSAL khi vẫn còn REPORT tham chiếu (Missing Validation #5, lỗ hổng
 * nghiêm trọng nhất module theo phân tích Business), tránh để lại dữ liệu mồ
 * côi (`Document.referenceTo` trỏ tới 1 document đã bị soft-delete).
 */
export const countReportsByProposal = (proposalId: any) => {
  return Document.countDocuments({
    referenceTo: proposalId,
    category: "REPORT",
    isActive: true,
  });
};

/* ===============================
   FIND DOCUMENT (INCLUDING DELETED)
=============================== */
export const findDocumentIncludeDeleted = (id: any) => {
  return Document.findOne({ _id: id }).select("+deletedAt +deletedBy");
};

