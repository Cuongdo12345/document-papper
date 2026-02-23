import { Document, DocumentCategory, DocumentSubType } from "../models/document.model";
import UserAudit from "../models/userAudit.model";
import { generateDocumentCode } from "../shared/utils/generateDocumentCode";
import { DOCUMENT_RULES } from "../shared/constants/documentRules";
import ApiError from "../shared/errors/ApiError";
import { Types } from "mongoose";


// Xây dựng service tạo document mới với các bước:
// 1. Check rule: Kiểm tra xem subtype có hợp lệ không, subtype đó thuộc category nào, có yêu cầu reference không
// 2. Check reference: Nếu subtype yêu cầu reference thì kiểm tra document tham chiếu có tồn tại không, có cùng khoa không, có cùng loại không, nếu có yêu cầu subtype tham chiếu thì kiểm tra subtype của document tham chiếu có đúng không
// 3. Generate code: Sinh documentCode tự động dựa trên category, khoa, năm và số lượng document đã tạo trong năm đó
// 4. Create: Tạo document mới trong database
// 5. Audit: Tạo bản ghi audit cho hành động tạo document   
// Lưu ý: Các lỗi sẽ được throw ra để controller bắt và trả về response phù hợp
// Service này sẽ được controller gọi khi có request tạo document mới, controller sẽ truyền payload đã được validate và đã có thông tin userId vào service này
// Service này sẽ đảm bảo tính toàn vẹn dữ liệu và tuân thủ các quy tắc nghiệp vụ đã định nghĩa trong DOCUMENT_RULES
export const createDocumentService = async (payload: {
  userId: any;
  category: DocumentCategory;
  subType: DocumentSubType;
  title: string;
  department: any;
  referenceTo?: [any];
  meta?: any;
}) => {

  const {
    userId,
    category,
    subType,
    title,
    department,
    referenceTo,
    meta
  } = payload;

  /* ===============================
   * 1. Check rule
   * =============================== */
  const rule = DOCUMENT_RULES[subType];
  if (!rule) throw ApiError.badRequest("Loại giấy không hợp lệ");

  if (rule.category !== category)
    throw ApiError.badRequest("Category không khớp subType");

  /* ===============================
   * 2. Check reference
   * =============================== */
  if (rule.requireReference) {
    if (!referenceTo)
      throw ApiError.badRequest("Loại giấy này bắt buộc phải có biên bản kèm theo");

    // Kiểm tra document tham chiếu có tồn tại, cùng khoa, cùng loại hay không
    const refDoc = await Document.findById(referenceTo)
      .select("_id subType department")
      .lean();
    
    // Nếu không tìm thấy document tham chiếu thì lỗi
    if (!refDoc)
      throw ApiError.notFound("Biên bản tham chiếu không tồn tại");

    // Nếu có yêu cầu subtype tham chiếu thì kiểm tra subtype của document tham chiếu có đúng không
    if (rule.referenceSubType &&
        refDoc.subType !== rule.referenceSubType)
      throw ApiError.badRequest("Biên bản tham chiếu không đúng loại");

    // Kiểm tra document tham chiếu có cùng khoa hay không
    if (department.toString() !== refDoc.department.toString())
      throw ApiError.badRequest("Biên bản tham chiếu không cùng khoa");
  }
  // Nếu không yêu cầu reference mà có referenceTo thì cũng lỗi
  if (!rule.requireReference && referenceTo)
    throw ApiError.badRequest("Loại giấy này không cần biên bản tham chiếu");

  /* ===============================
   * 3. Generate code
   * =============================== */
  const documentCode = await generateDocumentCode(
    category,
    department
  );
  
  // Nếu có referenceTo mà client gửi lên là một mảng thì cũng sẽ chấp nhận, nhưng sẽ convert thành mảng ObjectId để lưu vào database
  let referenceArray: Types.ObjectId[] = [];
  if (referenceTo) {
    if (Array.isArray(referenceTo)) {
      referenceArray = referenceTo.map(
        (id) => new Types.ObjectId(id)
      );
    } else {
      referenceArray = [new Types.ObjectId(referenceTo)];
    }
  }

  /* ===============================
   * 4. Create
   * =============================== */
  const doc = await Document.create({
    documentCode,
    category,
    subType,
    title,
    department,
    createdBy: userId,
    referenceTo: referenceArray,
    meta,
  });

  /* ===============================
   * 5. Audit
   * =============================== */
  await UserAudit.create({
    user: userId,
    action: "CREATE",
    performedBy: userId,
    note: `User tạo mới ${
      category === DocumentCategory.PROPOSAL
        ? "giấy đề xuất"
        : "biên bản"
    }`,
  });

  return doc;
};

/**
 * API GET ALL DOCUMENTS
    Service lấy danh sách document với filter, search, pagination và sorting
    Service này sẽ được controller gọi khi có request lấy danh sách document, controller sẽ truyền query đã được validate vào service này
    Service này sẽ xây dựng filter dựa trên query, hỗ trợ search theo title và documentCode, hỗ trợ phân trang và sắp xếp kết quả
    Kết quả trả về sẽ bao gồm danh sách document đã được populate thông tin department và createdBy, cùng với thông tin phân trang   
    Lưu ý: Các lỗi sẽ được throw ra để controller bắt và trả về response phù hợp
    Service này sẽ đảm bảo tính linh hoạt trong việc truy vấn danh sách document và tối ưu hiệu suất bằng cách sử dụng filter và pagination
 * @param query 
 * @returns 
 */

export const getAllDocumentsService = async (query: any) => {
  const {
    category,
    subType,
    department,
    status,
    createdBy,
    fromDate,
    toDate,
    isActive,
    keyword,
    page = "1",
    limit = "10",
    sortBy = "createdAt",
    order = "desc",
  } = query;

  const filter: any = {};

  /* ===============================
   * ACTIVE FILTER
   * =============================== */
  if (isActive === "false") filter.isActive = false;
  else filter.isActive = true;
  
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

  /* ===============================
   * SEARCH
   * =============================== */
  if (keyword) {
    filter.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { documentCode: { $regex: keyword, $options: "i" } },
    ];
  }

  // Phân trang
  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10), 1), 100);
  const skip = (pageNum - 1) * limitNum;
  
  // Sắp xếp
  const sort: any = {};
  sort[sortBy] = order === "asc" ? 1 : -1;
  
  // Dùng Promise.all để chạy song song 2 query lấy documents và đếm tổng số documents
  const [documents, total] = await Promise.all([
    Document.find(filter)
      .populate("department", "code name")
      .populate("createdBy", "username fullName")
      .populate("referenceTo", "documentCode subType")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),

    Document.countDocuments(filter),
  ]);

  return {
    data: documents,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * 
 * @param id 
 * @returns 
Service lấy chi tiết document theo id
Service này sẽ được controller gọi khi có request lấy chi tiết document, controller sẽ truyền id document vào service này
Service này sẽ tìm document theo id và populate thông tin department, createdBy và referenceTo
Nếu không tìm thấy document nào thì sẽ throw lỗi DOCUMENT_NOT_FOUND để controller bắt và trả về response phù hợp
Nếu tìm thấy thì trả về document đã được populate thông tin  
// Lưu ý: Service này chỉ trả về document nếu isActive là true, nếu isActive là false thì cũng sẽ trả về lỗi DOCUMENT_NOT_FOUND để tránh lộ thông tin document đã bị xóa mềm
// Service này sẽ đảm bảo tính bảo mật và toàn vẹn dữ liệu khi truy xuất chi tiết document
 */
export const getDocumentDetailService = async (id: any) => {

  const document = await Document.findOne({
    _id: id,
    isActive: true,
  })
    .populate("department", "name code")
    .populate("createdBy", "fullName username")
    .populate("referenceTo", "documentCode subType createdBy meta title");

  if (!document)
    throw ApiError.notFound("Không tìm thấy giấy đề xuất / biên bản");

  return document;
};


/**
 * API UPDATE DOCUMENT
 * Mục tiêu:
✅ Chỉ cho update field được phép
✅ Chặn sửa field hệ thống (documentCode, createdBy…)
✅ Chặn đổi reference sau khi tạo
✅ Sẵn sàng rule lock theo status
✅ Không phá logic cũ của bạn

❌ KHÔNG BAO GIỜ CHO UPDATE
   (documentCode, createdBy, referenceTo, category, subType, isActive, deletedAt, deletedBy, createdAt)
⚠️ CÂN NHẮC UPDATE (tuỳ nghiệp vụ)
   department   // thường KHÔNG cho đổi
   status      // chỉ workflow engine sửa
 */

/**
 * Danh sách field được phép update
 */
const DOCUMENT_UPDATE_WHITELIST = [
  "title",
  "meta"
] as const;

export const updateDocumentService = async (payload: {
  id: any;
  userId: any;
  updateData: any;
}) => {

  const { id, userId, updateData } = payload;

  /* ===============================
   * 1. Validate ObjectId
   * =============================== */
  if (!Types.ObjectId.isValid(id))
    throw ApiError.badRequest("ID giấy không hợp lệ");

  /* ===============================
   * 2. Lấy document
   * =============================== */
  const document = await Document.findById(id);

  if (!document || !document.isActive)
    throw ApiError.notFound("Không tìm thấy giấy đề xuất / biên bản");

  /* ===============================
   * 3. STATUS LOCK RULE (enterprise ready)
   * =============================== */
  // nếu bạn muốn bật rule workflow
  // chỉ cho sửa khi DRAFT

//   if (document.status && document.status !== "DRAFT") {
//     throw new Error("DOCUMENT_LOCKED");
//   }

  /* ===============================
   * 4. Build safe update object
   * =============================== */
  const safeUpdate: any = {};

  for (const key of DOCUMENT_UPDATE_WHITELIST) {
    if (key in updateData) {
      safeUpdate[key] = updateData[key];
    }
  }

  /* ===============================
   * 5. Nếu client gửi field cấm → reject
   * =============================== */
  const forbiddenFields = Object.keys(updateData).filter(
    key => !DOCUMENT_UPDATE_WHITELIST.includes(key as any)
  );

  if (forbiddenFields.length > 0) {
    throw ApiError.badRequest("Bạn đang cố sửa field không được phép");
  }

  /* ===============================
   * 6. Apply update
   * =============================== */
  Object.assign(document, safeUpdate);

  document.updatedBy = new Types.ObjectId(userId);
  document.updatedAt = new Date();

  // Audit
  await UserAudit.create({
  user: userId,
  action: "UPDATE",
  performedBy: userId,
  note: `Cập nhật document ${document.documentCode}`,
});

  await document.save();

  return document;
};

/**
 * API DELETE DOCUMENT (soft delete)
 * Mục tiêu:
✅ Soft delete: chỉ update isActive=false, deletedAt, deletedBy
✅ Chặn delete nếu document đã trình ký (nếu có rule này)
✅ Không thực sự xóa dữ liệu để tránh mất mát và dễ khôi phục
✅ Audit đầy đủ hành động delete
❌ KHÔNG BAO GIỜ XÓA DỮ LIỆU THẬT
⚠️ CÂN NHẮC DELETE (tuỳ nghiệp vụ)
   Nếu có rule lock theo status thì cũng sẽ chặn delete nếu status không cho phép
 */

export const deleteDocumentService = async (payload: {
  id: any;
  userId: any;
  role: string;
}) => {
  const { id, userId, role } = payload;

  /* ===============================
   * 1. Validate ID
   * =============================== */
  if (!Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID giấy không hợp lệ");
  }

  /* ===============================
   * 2. Lấy document
   * =============================== */
  const document = await Document.findById(id);

  if (!document || !document.isActive) {
    throw ApiError.notFound("Không tìm thấy giấy đề xuất / biên bản");
  }

  /* ===============================
   * 3. RBAC
   * =============================== */
  if (role !== "ADMIN") {
    throw ApiError.forbidden("Bạn không có quyền xoá tài liệu này");
  }

  /* ===============================
   * 4. Chặn xoá proposal đã có report
   * =============================== */
  // proposal không được xoá nếu có reference nguồn
  if (document.category === DocumentCategory.PROPOSAL) {
  if (document.referenceTo) {
    throw ApiError.badRequest(
      "Không thể xoá đề xuất vì có biên bản nguồn liên quan"
    );
  }
}

  /* ===============================
   * 5. Workflow lock (optional nhưng nên có)
   * =============================== */
//   if (document.status && document.status !== "DRAFT") {
//     throw new Error("DOCUMENT_LOCKED");
//   }

  /* ===============================
   * 6. Soft delete
   * =============================== */
  document.isActive = false;
  document.deletedAt = new Date();
  document.deletedBy = new Types.ObjectId(userId);

  // Audit
  await UserAudit.create({
  user: userId,
  action: "DELETE",
  performedBy: userId,
  note: `Xóa document ${document.documentCode}`,
});

  await document.save();

  return document;
};


/**
 * API GET REPORTS BY PROPOSAL
 * Mục tiêu:
✅ Lấy danh sách biên bản (REPORT) theo giấy đề xuất (PROPOSAL)
✅ Kiểm tra proposal tồn tại và hợp lệ trước khi truy vấn
✅ Trả về thông tin proposal cùng danh sách biên bản liên quan
✅ Hỗ trợ filter, sort biên bản nếu cần
// Lưu ý: API này sẽ trả về lỗi nếu proposal không tồn tại hoặc không hợp lệ, tránh trả về
// thông tin biên bản nếu proposal không hợp lệ
 * @param proposalId 
 * @returns 
 */
export const getReportsByProposalService = async (
  proposalId: any
) => {

  /* ===============================
   * 1. Validate id
   * =============================== */
  if (!Types.ObjectId.isValid(proposalId)) {
    throw ApiError.badRequest("Proposal id không hợp lệ");
  }

  const proposalObjectId = new Types.ObjectId(proposalId);

  /* ===============================
   * 2. Lấy proposal
   * =============================== */
  const proposal = await Document.findOne({
    _id: proposalObjectId,
    category: DocumentCategory.PROPOSAL,
    isActive: true,
  })
    .populate("department", "name code")
    .populate("createdBy", "fullName username")
    .lean();

  if (!proposal) {
    throw ApiError.notFound("Không tìm thấy proposal");
  }

  /* ===============================
   * 3. Lấy reference CHECK_DAMAGE ID
   * =============================== */
  if (!proposal.referenceTo) {
    return {
      proposal,
      reports: [],
      totalReports: 0,
    };
  }

  /* ===============================
   * 4. Query CHECK_DAMAGE
   * =============================== */
  const reports = await Document.find({
    referenceTo: proposalObjectId,
    category: DocumentCategory.REPORT,
    subType: DocumentSubType.CHECK_DAMAGE,
    isActive: true,
  })
    .populate("department", "name code")
    .populate("createdBy", "fullName username")
    .sort({ createdAt: 1 })
    .lean();

  /* ===============================
   * 5. Return
   * =============================== */
  return {
    proposal,
    totalReports: reports.length,
    reports,
  };
};

/**
 * API RESTORE DOCUMENT
 */

interface RestoreDocumentParams {
  documentId: any;
  userId: any;
  isAdmin?: boolean;
}

export const restoreDocumentService = async ({
  documentId,
  userId,
  isAdmin = false,
}: RestoreDocumentParams) => {

  // 1️⃣ Validate ObjectId
  if (!Types.ObjectId.isValid(documentId)) {
    throw ApiError.badRequest("Document ID không hợp lệ");
  }

  // 2️⃣ Tìm document (kể cả đã xoá)
  const document = await Document.findOne({
    _id: documentId,
  }).select("+deletedAt +deletedBy");

  if (!document) {
    throw ApiError.notFound("Không tìm thấy document");
  }

  // 3️⃣ Check đã bị xoá chưa
  if (!document.deletedAt) {
    throw ApiError.badRequest("Document chưa bị xoá");
  }

  /* ===============================
    * 4. Check trạng thái
    *=============================== */
    if (document.isActive) {
      throw ApiError.badRequest("Tài liệu đang ở trạng thái hoạt động");
    }

  // 4️⃣ Check quyền restore
  const isOwner = document.createdBy?.toString() === userId;
  // const sameDepartment = userDepartment && document.department === userDepartment;

  if (!isAdmin && !isOwner) {
    throw ApiError.forbidden("Bạn không có quyền khôi phục document này");
  }

  // 5️⃣ Restore document
  document.deletedAt = undefined;
  document.deletedBy = undefined;
  document.isActive = true;

  await document.save();

  return {
    message: "Khôi phục document thành công",
    data: document,
  };
};