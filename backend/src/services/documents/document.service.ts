import { Types } from "mongoose";
import { generateDocumentCode } from "../../shared/utils/generateDocumentCode";
import ApiError from "../../shared/errors/ApiError";
import UserAudit from "../../models/users/userAudit.model";
import { DocumentSubType } from "../../models/documents/document.model";
import { Asset, AssetStatus } from "../../models/assets/asset.model";
import {
  validateDocumentRule,
  validateReference,
  validateObjectId,
  validateRestorePermission,
} from "./documents.validator";

import {
  buildReferenceArray,
  buildDocumentFilter,
  escapeRegex,
} from "./documents.mapper";
import {
  createDocument,
  getActiveDocumentOrFail,
  findActiveDocument,
  findDocuments,
  countDocuments,
  deleteDocumentsByFilter,
  findProposalById,
  findReportsByProposal,
  countReportsByProposal,
  findDocumentIncludeDeleted,
  findPendingRepairProposalForAsset,
} from "./documents.query";
import { DOCUMENT_UPDATE_WHITELIST } from "./documents.constants";
import type {
  CreateDocumentPayload,
  UpdateDocumentPayload,
  DeleteDocumentPayload,
} from "./documents.types";

import {
  NotificationResourceType,
  NotificationType,
} from "../../models/notifications/notification.model";
import { notifyUsersByDepartment } from "../notifications/notification.service";
import { withTransaction } from "../../shared/utils/withTransaction";

// ✅ KHÔI PHỤC TRANSACTION (MongoDB đã chuyển sang replica set — xem
// `withTransaction.ts`). Các luồng bên dưới được bọc lại
// `withTransaction(...)` quanh 2 write (Document + UserAudit). Logic nghiệp
// vụ (validate, permission, field ghi) giữ NGUYÊN, chỉ thêm session vào
// các write.
//
// ĐÁNH ĐỔI ĐÃ ĐƯỢC GIẢI QUYẾT (trước đây, khi còn standalone không có
// transaction): nếu write thứ 2 (UserAudit hoặc document.save) lỗi SAU KHI
// write đầu đã thành công, sẽ để lại document đã đổi mà thiếu dòng audit
// tương ứng (hoặc ngược lại tuỳ thứ tự). Nay cả 2 write cùng nằm trong 1
// transaction — lỗi ở write nào cũng rollback CẢ HAI, không còn lệch dữ
// liệu nữa.
//
// ⚠️ GIẢ ĐỊNH CẦN XÁC NHẬN: `createDocument` (import từ `documents.query`)
// hiện chưa rõ chữ ký — code dưới đây giả định hàm này nhận `{ session }`
// làm tham số thứ 2 và tự forward xuống `Document.create([...], { session })`
// bên trong. Nếu `documents.query.ts` chưa hỗ trợ tham số này, cần sửa
// `createDocument` trước, nếu không write đó sẽ chạy NGOÀI transaction.

/* ===============================
   CREATE
=============================== */
export const createDocumentService = async (payload: CreateDocumentPayload) => {
  const {
    userId,
    category,
    subType,
    title,
    department,
    referenceTo,
    meta,
    relatedAsset,
  } = payload;

  const rule = validateDocumentRule(category, subType);

  await validateReference({
    rule,
    referenceTo,
    department,
  });

  // 🔗 GIAI ĐOẠN 3 (module Asset) — "Đề xuất sửa chữa" BẮT BUỘC phải gắn
  // với 1 Asset cụ thể, vì đây chính là field dùng để tự động chuyển asset
  // sang `UNDER_MAINTENANCE` khi workflow duyệt xong (xem `workflow.service.ts`).
  // Validate ở đây (KHÔNG chỉ ở DTO) vì đây là ràng buộc PHỤ THUỘC subType
  // — Zod schema không tiện diễn đạt "field X bắt buộc khi field Y = Z" mà
  // không làm rối toàn bộ DTO dùng chung cho mọi loại document.
  if (subType === DocumentSubType.PROPOSE_REPAIR) {
    if (!relatedAsset) {
      throw ApiError.badRequest(
        "Đề xuất sửa chữa (PROPOSE_REPAIR) bắt buộc phải chọn 1 tài sản liên quan (relatedAsset)",
      );
    }

    const asset = await Asset.findOne({ _id: relatedAsset, isActive: true });
    if (!asset) {
      throw ApiError.badRequest(
        "Tài sản (relatedAsset) không tồn tại hoặc đã bị xoá",
      );
    }

    // Không cho tạo đề xuất sửa chữa mới cho asset đã thanh lý/mất — về mặt
    // nghiệp vụ không còn ý nghĩa gì để "sửa" 1 tài sản đã DISPOSED/LOST.
    if (
      asset.status === AssetStatus.DISPOSED ||
      asset.status === AssetStatus.LOST
    ) {
      throw ApiError.badRequest(
        `Không thể tạo đề xuất sửa chữa cho tài sản đang ở trạng thái ${asset.status}`,
      );
    }

    // Chặn tạo TRÙNG đề xuất sửa chữa khi asset đã có 1 đề xuất khác chưa
    // duyệt xong — tránh 2 workflow độc lập cùng tranh nhau đổi trạng thái
    // 1 asset (xem giải thích đầy đủ ở `findPendingRepairProposalForAsset`).
    const pendingProposal =
      await findPendingRepairProposalForAsset(relatedAsset);
    if (pendingProposal) {
      throw ApiError.badRequest(
        `Tài sản này đang có 1 đề xuất sửa chữa khác chưa duyệt xong (mã: ${pendingProposal.documentCode ?? pendingProposal._id})`,
      );
    }
  }

  const documentCode = await generateDocumentCode(category, department);

  const referenceArray = buildReferenceArray(referenceTo);

  // Chuỗi ghi cần transaction: tạo Document + ghi UserAudit "CREATE".
  const doc = await withTransaction(async (session) => {
    const created = await createDocument(
      {
        documentCode,
        category,
        subType,
        title,
        department,
        createdBy: userId,
        referenceTo: referenceArray,
        meta,
        relatedAsset:
                  // ⚠️ GIAI ĐOẠN 3 (đính kèm manual) — MANUAL cũng được phép lưu
                  // relatedAsset (không bắt buộc, khác PROPOSE_REPAIR ở trên).
                  // Trước đây field này bị ép `undefined` cho MỌI subType khác
                  // PROPOSE_REPAIR — nếu không sửa dòng này, client gửi
                  // `relatedAsset` kèm document MANUAL sẽ bị ÂM THẦM BỎ QUA (không
                  // lỗi, nhưng liên kết asset↔manual không bao giờ được lưu).
                  [DocumentSubType.PROPOSE_REPAIR, DocumentSubType.MANUAL].includes(subType)
                    ? relatedAsset
                    : undefined,
        // relatedAsset:
        //   subType === DocumentSubType.PROPOSE_REPAIR ? relatedAsset : undefined,
      },
      session, // ⚠️ xem giả định ở đầu file — cần `createDocument` forward session này
    );

    await UserAudit.create(
      [
        {
          user: userId,
          action: "CREATE",
          performedBy: userId,
          note: `Tạo document`,
        },
      ],
      { session },
    );

    return created;
  });

  // Báo cho các thành viên CÙNG PHÒNG BAN biết có document mới — đây là
  // notification "DOCUMENT_SUBMITTED" (khác với "WORKFLOW_STEP_ASSIGNED" ở
  // `workflow.service.ts`: document này CHƯA CHẮC đi qua workflow duyệt,
  // notification ở đây chỉ mang tính thông tin, không yêu cầu hành động).
  // Không `sendEmail` cho loại này (chỉ in-app) để tránh spam email toàn
  // phòng ban mỗi khi có 1 document mới — khác với workflow assignment
  // (cần hành động gấp nên mới đáng gửi email).
  // CHỦ Ý đặt NGOÀI transaction: đây là side-effect ngoài DB, không thuộc
  // phạm vi transaction MongoDB, và không được phép làm rollback việc tạo
  // document nếu gửi thông báo lỗi.
  notifyUsersByDepartment(
    department,
    {
      createdBy: userId,
      type: NotificationType.DOCUMENT_SUBMITTED,
      title: "Có tài liệu mới",
      message: `Tài liệu "${title}" vừa được tạo trong phòng ban của bạn`,
      resourceType: NotificationResourceType.DOCUMENT,
      resourceId: doc._id,
    },
    userId,
  );

  return doc;
};

/* ===============================
   GET ALL
=============================== */
export const getAllDocumentsService = async (query: any) => {
  const {
    page,
    limit,
    sortBy = "createdAt",
    order = "desc",
    fromDate,
    toDate,
    keyword,
    isActive,
    category,
    subType,
    department,
    workflowStatus,
    createdBy,
    relatedAsset, // 🔗 Giai đoạn 3 (module Asset)
  } = query;

  // Sửa Logic Bug #1: trước đây đọc nhầm `filters.isActive` (luôn `undefined`
  // vì `isActive` đã bị destructure ra khỏi `query` ở trên) khiến
  // `filter.isActive` luôn bị ép `true` bất kể client truyền gì. Nay đọc
  // đúng biến `isActive` đã destructure; mặc định `true` chỉ khi client
  // không truyền field này (đã qua `QueryDocumentDTO`, `isActive` là boolean
  // thật hoặc `undefined`, không còn là string "false").
  const filter: Record<string, any> = {
    isActive: isActive === undefined ? true : isActive,
  };

  // Sửa Missing Validation #1 (Object.assign(filter, filters) — NoSQL
  // injection risk) + Duplicate Logic #2 (build filter riêng lẻ ở
  // deleteDocumentsByMonthService) bằng 1 helper whitelist dùng chung.
  // Đồng thời sửa Logic Bug #2: field đúng là `workflowStatus`, không phải
  // `status` (không tồn tại trong schema).
  Object.assign(
    filter,
    buildDocumentFilter({
      category,
      subType,
      department,
      workflowStatus,
      createdBy,
      relatedAsset,
    }),
  );

  // `fromDate`/`toDate` đã được `QueryDocumentDTO` validate là parse được
  // (Missing Validation #3) trước khi tới đây, nên `new Date(...)` luôn hợp lệ.
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  if (keyword) {
    // Sửa Missing Validation #2: escape ký tự đặc biệt regex trước khi đưa
    // vào `$regex` — chặn rủi ro ReDoS / lỗi regex khi keyword chứa ký tự
    // có nghĩa đặc biệt (vd `.`, `*`, `(`).
    const safeKeyword = escapeRegex(keyword);
    filter.$or = [
      { title: { $regex: safeKeyword, $options: "i" } },
      { documentCode: { $regex: safeKeyword, $options: "i" } },
    ];
  }

  // `page`/`limit` đã được `QueryDocumentDTO` coerce + validate thành number
  // hợp lệ (>=1, limit <=100, có default) trước khi tới service — không còn
  // cần `parseInt`/clamp thủ công (Logic Bug #5, tránh `NaN` lọt vào
  // `.skip()`/`.limit()`). Vẫn giữ 1 lớp phòng thủ tối thiểu phòng khi hàm
  // này được gọi trực tiếp không qua DTO (ví dụ từ nơi khác trong codebase).
  const pageNum = Number.isInteger(page) && page > 0 ? page : 1;
  const limitNum =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 10;
  const skip = (pageNum - 1) * limitNum;

  const sort: Record<string, 1 | -1> = { [sortBy]: order === "asc" ? 1 : -1 };

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
  // Sửa Missing Validation #6: trước đây không validate ObjectId trước khi
  // query, khiến `CastError` từ Mongoose lộ ra thay vì `ApiError.badRequest`
  // chuẩn hoá (khác Update/Delete/Restore đã có check này).
  validateObjectId(id, "Document ID không hợp lệ");

  const doc = await findActiveDocument(id)
    .populate("department", "name code")
    .populate("createdBy", "fullName username")
    // Sửa Duplicate/Inconsistent Logic #3: giới hạn field populate giống List
    // (trước đây Detail lấy full document con, không rõ chủ đích khác biệt).
    .populate("referenceTo", "subType title documentCode");

  if (!doc) throw ApiError.notFound("Không tìm thấy document");

  return doc;
};

/* ===============================
   UPDATE
=============================== */
export const updateDocumentService = async ({
  id,
  userId,
  callerDepartment,
  isAdmin = false,
  updateData,
}: UpdateDocumentPayload) => {
  validateObjectId(id, "ID không hợp lệ");

  // Sửa Duplicate Logic #1: dùng chung helper thay vì lặp lại
  // validate → findDocumentById → check active → throw notFound
  // (giống hệt deleteDocumentService).
  const document = await getActiveDocumentOrFail(id);

  // Sửa Missing Validation #4 (phần 1 — ownership/department): trước đây
  // không kiểm tra gì ngoài permission chung `DOCUMENT_UPDATE` ở route, bất
  // kỳ ai có quyền đó sửa được mọi document của mọi phòng ban. Nay ràng buộc
  // theo department, đồng bộ với "khác khoa" đã có ở Create.
  if (
    !isAdmin &&
    callerDepartment &&
    document.department.toString() !== callerDepartment.toString()
  ) {
    throw ApiError.forbidden("Không có quyền sửa document của phòng ban khác");
  }

  // Sửa Missing Validation #4 (phần 2 — khoá theo workflow): document đã
  // được duyệt xong (`workflowStatus === "approved"`) thì khoá không cho sửa
  // title/meta nữa, trừ admin.
  //
  // 🔗 Bổ sung thêm "completed" (KHÔNG chỉ "approved") — sau khi bổ sung
  // trạng thái `"completed"` (đóng quy trình sau khi việc thực tế đã xong,
  // xem `completeWorkflow` trong `workflow.service.ts`), nếu chỉ check
  // đúng `"approved"` thì 1 document đã chuyển sang `"completed"` sẽ KHÔNG
  // còn khớp điều kiện này nữa — vô tình MỞ KHOÁ lại cho sửa dù đã đóng
  // quy trình hẳn, ngược hoàn toàn với ý định ban đầu của khoá này.
  if (
    !isAdmin &&
    (document.workflowStatus === "approved" ||
      document.workflowStatus === "completed")
  ) {
    throw ApiError.badRequest("Document đã được duyệt, không thể chỉnh sửa");
  }

  const safeUpdate: Record<string, any> = {};

  for (const key of DOCUMENT_UPDATE_WHITELIST) {
    if (key in updateData) safeUpdate[key] = updateData[key];
  }

  const forbidden = Object.keys(updateData).filter(
    (k) => !DOCUMENT_UPDATE_WHITELIST.includes(k as any),
  );

  if (forbidden.length) throw ApiError.badRequest("Field không hợp lệ");

  // Tránh ghi audit "UPDATE" giả khi thực tế không có gì thay đổi (đã nêu ở
  // mục Update — Logic Bug tiềm ẩn).
  const hasRealChange = Object.entries(safeUpdate).some(
    ([k, v]) => JSON.stringify((document as any)[k]) !== JSON.stringify(v),
  );

  if (!hasRealChange) {
    return document;
  }

  Object.assign(document, safeUpdate);
  document.updatedBy = new Types.ObjectId(userId);
  // Bỏ set tay `updatedAt` (Technical Debt #5) — model đã bật
  // `{ timestamps: true }`, Mongoose tự cập nhật field này khi `.save()`.

  // Chuỗi ghi cần transaction: ghi UserAudit "UPDATE" + save Document.
  await withTransaction(async (session) => {
    await UserAudit.create(
      [
        {
          user: userId,
          action: "UPDATE",
          performedBy: userId,
        },
      ],
      { session },
    );

    await document.save({ session });
  });

  return document;
};

/* ===============================
   DELETE
=============================== */
export const deleteDocumentService = async ({
  id,
  userId,
  role,
}: DeleteDocumentPayload) => {
  validateObjectId(id, "ID không hợp lệ");

  const document = await getActiveDocumentOrFail(id);

  if (role !== "ADMIN") throw ApiError.forbidden("Không có quyền");

  // Sửa Missing Validation #5 — lỗ hổng nghiêm trọng nhất module theo phân
  // tích Business: trước đây xoá PROPOSAL mà không kiểm tra còn REPORT nào
  // đang tham chiếu tới nó hay không, để lại dữ liệu mồ côi
  // (`Document.referenceTo` trỏ tới 1 document đã soft-delete). Chỉ áp dụng
  // cho PROPOSAL — REPORT không bị document nào khác tham chiếu ngược.
  // Đây là READ, không cần nằm trong transaction bên dưới.
  if (document.category === "PROPOSAL") {
    const reportCount = await countReportsByProposal(document._id);
    if (reportCount > 0) {
      throw ApiError.badRequest(
        `Không thể xoá: đang có ${reportCount} biên bản tham chiếu tới đề xuất này`,
      );
    }
  }

  document.isActive = false;
  document.deletedAt = new Date();
  document.deletedBy = new Types.ObjectId(userId);

  // Chuỗi ghi cần transaction: ghi UserAudit "DELETE" + save Document
  // (soft-delete).
  await withTransaction(async (session) => {
    await UserAudit.create(
      [
        {
          user: userId,
          action: "DELETE",
          performedBy: userId,
        },
      ],
      { session },
    );

    await document.save({ session });
  });

  return document;
};

/* ===============================
   DELETE many by month
=============================== */
export const deleteDocumentsByMonthService = async (
  month: number,
  year: number,
  filters: any = {},
) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  // Sửa Duplicate Logic #2: dùng chung `buildDocumentFilter` với
  // `getAllDocumentsService` thay vì tự viết lại `if (x) query.x = x`.
  const query: Record<string, any> = {
    createdAt: { $gte: start, $lte: end },
    ...buildDocumentFilter(filters),
  };

  // Chỉ 1 write trên 1 collection (`deleteMany` trên Document) — KHÔNG cần
  // transaction (transaction chỉ có ý nghĩa khi ghi NHIỀU collection cần
  // atomic cùng nhau).
  const result = await deleteDocumentsByFilter(query);

  return {
    deletedCount: result.deletedCount,
  };
};

/* ===============================
   Get report by proposal
=============================== */
export const getReportsByProposalService = async (proposalId: any) => {
  validateObjectId(proposalId, "Proposal id không hợp lệ");

  const proposalObjectId = new Types.ObjectId(proposalId);

  const proposal = await findProposalById(proposalObjectId);

  if (!proposal) {
    throw ApiError.notFound("Không tìm thấy proposal");
  }

  if (!proposal.referenceTo) {
    return {
      proposal,
      reports: [],
      totalReports: 0,
    };
  }

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
  userId?: any;
  isAdmin?: boolean;
}) => {
  validateObjectId(documentId, "Document ID không hợp lệ");

  const document = await findDocumentIncludeDeleted(documentId);

  if (!document) {
    throw ApiError.notFound("Không tìm thấy document");
  }

  if (!document.deletedAt) {
    throw ApiError.badRequest("Document chưa bị xoá");
  }

  if (document.isActive) {
    throw ApiError.badRequest("Tài liệu đang hoạt động");
  }

  validateRestorePermission({
    document,
    userId,
    isAdmin,
  });

  document.deletedAt = undefined;
  document.deletedBy = undefined;
  document.isActive = true;

  // Sửa Missing Validation #8: trước đây Restore là hành động duy nhất
  // trong service không ghi `UserAudit`, tạo lỗ hổng truy vết so với
  // Create/Update/Delete. ĐÃ XÁC NHẬN: enum `action` của `userAudit.model.ts`
  // có sẵn giá trị "RESTORE" (xem model), nên không cần sửa schema.
  // Chuỗi ghi cần transaction: save Document (khôi phục) + ghi UserAudit
  // "RESTORE" — giữ nguyên thứ tự save trước / audit sau như bản gốc, với
  // transaction thì thứ tự không ảnh hưởng tới tính đúng đắn (cả 2 cùng
  // commit hoặc cùng rollback).
  await withTransaction(async (session) => {
    await document.save({ session });

    await UserAudit.create(
      [
        {
          user: userId,
          action: "RESTORE",
          performedBy: userId,
        },
      ],
      { session },
    );
  });

  return {
    message: "Khôi phục document thành công",
    data: document,
  };
};

// import { Types } from "mongoose";
// import { generateDocumentCode } from "../../shared/utils/generateDocumentCode";
// import ApiError from "../../shared/errors/ApiError";
// import UserAudit from "../../models/users/userAudit.model";
// import { DocumentSubType } from "../../models/documents/document.model";
// import { Asset, AssetStatus } from "../../models/assets/asset.model";
// import {
//   validateDocumentRule,
//   validateReference,
//   validateObjectId,
//   validateRestorePermission,
// } from "./documents.validator";

// import { buildReferenceArray, buildDocumentFilter, escapeRegex } from "./documents.mapper";
// import {
//   createDocument,
//   getActiveDocumentOrFail,
//   findActiveDocument,
//   findDocuments,
//   countDocuments,
//   deleteDocumentsByFilter,
//   findProposalById,
//   findReportsByProposal,
//   countReportsByProposal,
//   findDocumentIncludeDeleted,
//   findPendingRepairProposalForAsset,
// } from "./documents.query";
// import { DOCUMENT_UPDATE_WHITELIST } from "./documents.constants";
// import type {
//   CreateDocumentPayload,
//   UpdateDocumentPayload,
//   DeleteDocumentPayload,
// } from "./documents.types";

// import {
//   NotificationResourceType,
//   NotificationType,
// } from "../../models/notifications/notification.model";
// import { notifyUsersByDepartment } from "../notifications/notification.service";

// // ⚠️ BỎ TRANSACTION (yêu cầu — môi trường đang dùng MongoDB standalone, chưa
// // chuyển sang replica set: transaction multi-document không khả dụng trên
// // standalone). Các luồng bên dưới quay lại 2 write riêng biệt (Document +
// // UserAudit), KHÔNG còn bọc `session.withTransaction(...)`. Logic nghiệp vụ
// // (validate, permission, field ghi) giữ NGUYÊN, chỉ bỏ phần session/transaction.
// //
// // ĐÁNH ĐỔI CẦN BIẾT (không phải bug, là lựa chọn có chủ đích): nếu write thứ 2
// // (UserAudit hoặc document.save) lỗi SAU KHI write đầu đã thành công, sẽ
// // KHÔNG tự động rollback — có thể để lại document đã đổi mà thiếu dòng audit
// // tương ứng (hoặc ngược lại tuỳ thứ tự). Nếu sau này chuyển MongoDB sang
// // replica set, có thể khôi phục lại `withTransaction` (đã build sẵn ở bản
// // trước, chỉ cần bọc lại quanh các write này).

// /* ===============================
//    CREATE
// =============================== */
// export const createDocumentService = async (payload: CreateDocumentPayload) => {
//   const { userId, category, subType, title, department, referenceTo, meta, relatedAsset } =
//     payload;

//   const rule = validateDocumentRule(category, subType);

//   await validateReference({
//     rule,
//     referenceTo,
//     department,
//   });

//   // 🔗 GIAI ĐOẠN 3 (module Asset) — "Đề xuất sửa chữa" BẮT BUỘC phải gắn
//   // với 1 Asset cụ thể, vì đây chính là field dùng để tự động chuyển asset
//   // sang `UNDER_MAINTENANCE` khi workflow duyệt xong (xem `workflow.service.ts`).
//   // Validate ở đây (KHÔNG chỉ ở DTO) vì đây là ràng buộc PHỤ THUỘC subType
//   // — Zod schema không tiện diễn đạt "field X bắt buộc khi field Y = Z" mà
//   // không làm rối toàn bộ DTO dùng chung cho mọi loại document.
//   if (subType === DocumentSubType.PROPOSE_REPAIR) {
//     if (!relatedAsset) {
//       throw ApiError.badRequest(
//         "Đề xuất sửa chữa (PROPOSE_REPAIR) bắt buộc phải chọn 1 tài sản liên quan (relatedAsset)",
//       );
//     }

//     const asset = await Asset.findOne({ _id: relatedAsset, isActive: true });
//     if (!asset) {
//       throw ApiError.badRequest("Tài sản (relatedAsset) không tồn tại hoặc đã bị xoá");
//     }

//     // Không cho tạo đề xuất sửa chữa mới cho asset đã thanh lý/mất — về mặt
//     // nghiệp vụ không còn ý nghĩa gì để "sửa" 1 tài sản đã DISPOSED/LOST.
//     if (asset.status === AssetStatus.DISPOSED || asset.status === AssetStatus.LOST) {
//       throw ApiError.badRequest(
//         `Không thể tạo đề xuất sửa chữa cho tài sản đang ở trạng thái ${asset.status}`,
//       );
//     }

//     // Chặn tạo TRÙNG đề xuất sửa chữa khi asset đã có 1 đề xuất khác chưa
//     // duyệt xong — tránh 2 workflow độc lập cùng tranh nhau đổi trạng thái
//     // 1 asset (xem giải thích đầy đủ ở `findPendingRepairProposalForAsset`).
//     const pendingProposal = await findPendingRepairProposalForAsset(relatedAsset);
//     if (pendingProposal) {
//       throw ApiError.badRequest(
//         `Tài sản này đang có 1 đề xuất sửa chữa khác chưa duyệt xong (mã: ${pendingProposal.documentCode ?? pendingProposal._id})`,
//       );
//     }
//   }

//   const documentCode = await generateDocumentCode(category, department);

//   const referenceArray = buildReferenceArray(referenceTo);

//   const doc = await createDocument({
//     documentCode,
//     category,
//     subType,
//     title,
//     department,
//     createdBy: userId,
//     referenceTo: referenceArray,
//     meta,
//     relatedAsset: subType === DocumentSubType.PROPOSE_REPAIR ? relatedAsset : undefined,
//   });

//   await UserAudit.create([
//     {
//       user: userId,
//       action: "CREATE",
//       performedBy: userId,
//       note: `Tạo document`,
//     },
//   ]);

//   // Báo cho các thành viên CÙNG PHÒNG BAN biết có document mới — đây là
//   // notification "DOCUMENT_SUBMITTED" (khác với "WORKFLOW_STEP_ASSIGNED" ở
//   // `workflow.service.ts`: document này CHƯA CHẮC đi qua workflow duyệt,
//   // notification ở đây chỉ mang tính thông tin, không yêu cầu hành động).
//   // Không `sendEmail` cho loại này (chỉ in-app) để tránh spam email toàn
//   // phòng ban mỗi khi có 1 document mới — khác với workflow assignment
//   // (cần hành động gấp nên mới đáng gửi email).
//   notifyUsersByDepartment(
//     department,
//     {
//       createdBy: userId,
//       type: NotificationType.DOCUMENT_SUBMITTED,
//       title: "Có tài liệu mới",
//       message: `Tài liệu "${title}" vừa được tạo trong phòng ban của bạn`,
//       resourceType: NotificationResourceType.DOCUMENT,
//       resourceId: doc._id,
//     },
//     userId,
//   );

//   return doc;
// };

// /* ===============================
//    GET ALL
// =============================== */
// export const getAllDocumentsService = async (query: any) => {
//   const {
//     page,
//     limit,
//     sortBy = "createdAt",
//     order = "desc",
//     fromDate,
//     toDate,
//     keyword,
//     isActive,
//     category,
//     subType,
//     department,
//     workflowStatus,
//     createdBy,
//     relatedAsset, // 🔗 Giai đoạn 3 (module Asset)
//   } = query;

//   // Sửa Logic Bug #1: trước đây đọc nhầm `filters.isActive` (luôn `undefined`
//   // vì `isActive` đã bị destructure ra khỏi `query` ở trên) khiến
//   // `filter.isActive` luôn bị ép `true` bất kể client truyền gì. Nay đọc
//   // đúng biến `isActive` đã destructure; mặc định `true` chỉ khi client
//   // không truyền field này (đã qua `QueryDocumentDTO`, `isActive` là boolean
//   // thật hoặc `undefined`, không còn là string "false").
//   const filter: Record<string, any> = {
//     isActive: isActive === undefined ? true : isActive,
//   };

//   // Sửa Missing Validation #1 (Object.assign(filter, filters) — NoSQL
//   // injection risk) + Duplicate Logic #2 (build filter riêng lẻ ở
//   // deleteDocumentsByMonthService) bằng 1 helper whitelist dùng chung.
//   // Đồng thời sửa Logic Bug #2: field đúng là `workflowStatus`, không phải
//   // `status` (không tồn tại trong schema).
//   Object.assign(
//     filter,
//     buildDocumentFilter({
//       category,
//       subType,
//       department,
//       workflowStatus,
//       createdBy,
//       relatedAsset,
//     }),
//   );

//   // `fromDate`/`toDate` đã được `QueryDocumentDTO` validate là parse được
//   // (Missing Validation #3) trước khi tới đây, nên `new Date(...)` luôn hợp lệ.
//   if (fromDate || toDate) {
//     filter.createdAt = {};
//     if (fromDate) filter.createdAt.$gte = new Date(fromDate);
//     if (toDate) filter.createdAt.$lte = new Date(toDate);
//   }

//   if (keyword) {
//     // Sửa Missing Validation #2: escape ký tự đặc biệt regex trước khi đưa
//     // vào `$regex` — chặn rủi ro ReDoS / lỗi regex khi keyword chứa ký tự
//     // có nghĩa đặc biệt (vd `.`, `*`, `(`).
//     const safeKeyword = escapeRegex(keyword);
//     filter.$or = [
//       { title: { $regex: safeKeyword, $options: "i" } },
//       { documentCode: { $regex: safeKeyword, $options: "i" } },
//     ];
//   }

//   // `page`/`limit` đã được `QueryDocumentDTO` coerce + validate thành number
//   // hợp lệ (>=1, limit <=100, có default) trước khi tới service — không còn
//   // cần `parseInt`/clamp thủ công (Logic Bug #5, tránh `NaN` lọt vào
//   // `.skip()`/`.limit()`). Vẫn giữ 1 lớp phòng thủ tối thiểu phòng khi hàm
//   // này được gọi trực tiếp không qua DTO (ví dụ từ nơi khác trong codebase).
//   const pageNum = Number.isInteger(page) && page > 0 ? page : 1;
//   const limitNum = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 10;
//   const skip = (pageNum - 1) * limitNum;

//   const sort: Record<string, 1 | -1> = { [sortBy]: order === "asc" ? 1 : -1 };

//   const [data, total] = await Promise.all([
//     findDocuments(filter, { skip, limit: limitNum, sort }),
//     countDocuments(filter),
//   ]);

//   return {
//     data,
//     pagination: {
//       page: pageNum,
//       limit: limitNum,
//       total,
//       totalPages: Math.ceil(total / limitNum),
//     },
//   };
// };

// /* ===============================
//    DETAIL
// =============================== */
// export const getDocumentDetailService = async (id: any) => {
//   // Sửa Missing Validation #6: trước đây không validate ObjectId trước khi
//   // query, khiến `CastError` từ Mongoose lộ ra thay vì `ApiError.badRequest`
//   // chuẩn hoá (khác Update/Delete/Restore đã có check này).
//   validateObjectId(id, "Document ID không hợp lệ");

//   const doc = await findActiveDocument(id)
//     .populate("department", "name code")
//     .populate("createdBy", "fullName username")
//     // Sửa Duplicate/Inconsistent Logic #3: giới hạn field populate giống List
//     // (trước đây Detail lấy full document con, không rõ chủ đích khác biệt).
//     .populate("referenceTo", "subType title documentCode");

//   if (!doc) throw ApiError.notFound("Không tìm thấy document");

//   return doc;
// };

// /* ===============================
//    UPDATE
// =============================== */
// export const updateDocumentService = async ({
//   id,
//   userId,
//   callerDepartment,
//   isAdmin = false,
//   updateData,
// }: UpdateDocumentPayload) => {

//   validateObjectId(id, "ID không hợp lệ");

//   // Sửa Duplicate Logic #1: dùng chung helper thay vì lặp lại
//   // validate → findDocumentById → check active → throw notFound
//   // (giống hệt deleteDocumentService).
//   const document = await getActiveDocumentOrFail(id);

//   // Sửa Missing Validation #4 (phần 1 — ownership/department): trước đây
//   // không kiểm tra gì ngoài permission chung `DOCUMENT_UPDATE` ở route, bất
//   // kỳ ai có quyền đó sửa được mọi document của mọi phòng ban. Nay ràng buộc
//   // theo department, đồng bộ với "khác khoa" đã có ở Create.
//   if (
//     !isAdmin &&
//     callerDepartment &&
//     document.department.toString() !== callerDepartment.toString()
//   ) {
//     throw ApiError.forbidden("Không có quyền sửa document của phòng ban khác");
//   }

//   // Sửa Missing Validation #4 (phần 2 — khoá theo workflow): document đã
//   // được duyệt xong (`workflowStatus === "approved"`) thì khoá không cho sửa
//   // title/meta nữa, trừ admin.
//   //
//   // 🔗 Bổ sung thêm "completed" (KHÔNG chỉ "approved") — sau khi bổ sung
//   // trạng thái `"completed"` (đóng quy trình sau khi việc thực tế đã xong,
//   // xem `completeWorkflow` trong `workflow.service.ts`), nếu chỉ check
//   // đúng `"approved"` thì 1 document đã chuyển sang `"completed"` sẽ KHÔNG
//   // còn khớp điều kiện này nữa — vô tình MỞ KHOÁ lại cho sửa dù đã đóng
//   // quy trình hẳn, ngược hoàn toàn với ý định ban đầu của khoá này.
//   if (
//     !isAdmin &&
//     (document.workflowStatus === "approved" || document.workflowStatus === "completed")
//   ) {
//     throw ApiError.badRequest("Document đã được duyệt, không thể chỉnh sửa");
//   }

//   const safeUpdate: Record<string, any> = {};

//   for (const key of DOCUMENT_UPDATE_WHITELIST) {
//     if (key in updateData) safeUpdate[key] = updateData[key];
//   }

//   const forbidden = Object.keys(updateData).filter(
//     (k) => !DOCUMENT_UPDATE_WHITELIST.includes(k as any)
//   );

//   if (forbidden.length)
//     throw ApiError.badRequest("Field không hợp lệ");

//   // Tránh ghi audit "UPDATE" giả khi thực tế không có gì thay đổi (đã nêu ở
//   // mục Update — Logic Bug tiềm ẩn).
//   const hasRealChange = Object.entries(safeUpdate).some(
//     ([k, v]) => JSON.stringify((document as any)[k]) !== JSON.stringify(v)
//   );

//   if (!hasRealChange) {
//     return document;
//   }

//   Object.assign(document, safeUpdate);
//   document.updatedBy = new Types.ObjectId(userId);
//   // Bỏ set tay `updatedAt` (Technical Debt #5) — model đã bật
//   // `{ timestamps: true }`, Mongoose tự cập nhật field này khi `.save()`.

//   await UserAudit.create([
//     {
//       user: userId,
//       action: "UPDATE",
//       performedBy: userId,
//     },
//   ]);

//   await document.save();

//   return document;
// };

// /* ===============================
//    DELETE
// =============================== */
// export const deleteDocumentService = async ({
//   id,
//   userId,
//   role,
// }: DeleteDocumentPayload) => {

//   validateObjectId(id, "ID không hợp lệ");

//   const document = await getActiveDocumentOrFail(id);

//   if (role !== "ADMIN")
//     throw ApiError.forbidden("Không có quyền");

//   // Sửa Missing Validation #5 — lỗ hổng nghiêm trọng nhất module theo phân
//   // tích Business: trước đây xoá PROPOSAL mà không kiểm tra còn REPORT nào
//   // đang tham chiếu tới nó hay không, để lại dữ liệu mồ côi
//   // (`Document.referenceTo` trỏ tới 1 document đã soft-delete). Chỉ áp dụng
//   // cho PROPOSAL — REPORT không bị document nào khác tham chiếu ngược.
//   if (document.category === "PROPOSAL") {
//     const reportCount = await countReportsByProposal(document._id);
//     if (reportCount > 0) {
//       throw ApiError.badRequest(
//         `Không thể xoá: đang có ${reportCount} biên bản tham chiếu tới đề xuất này`
//       );
//     }
//   }

//   document.isActive = false;
//   document.deletedAt = new Date();
//   document.deletedBy = new Types.ObjectId(userId);

//   await UserAudit.create([
//     {
//       user: userId,
//       action: "DELETE",
//       performedBy: userId,
//     },
//   ]);

//   await document.save();

//   return document;
// };

// /* ===============================
//    DELETE many by month
// =============================== */
// export const deleteDocumentsByMonthService = async (
//   month: number,
//   year: number,
//   filters: any = {}
// ) => {

//   const start = new Date(year, month - 1, 1);
//   const end = new Date(year, month, 0, 23, 59, 59);

//   // Sửa Duplicate Logic #2: dùng chung `buildDocumentFilter` với
//   // `getAllDocumentsService` thay vì tự viết lại `if (x) query.x = x`.
//   const query: Record<string, any> = {
//     createdAt: { $gte: start, $lte: end },
//     ...buildDocumentFilter(filters),
//   };

//   const result = await deleteDocumentsByFilter(query);

//   return {
//     deletedCount: result.deletedCount,
//   };
// };

// /* ===============================
//    Get report by proposal
// =============================== */
// export const getReportsByProposalService = async (
//   proposalId: any
// ) => {

//   validateObjectId(proposalId, "Proposal id không hợp lệ");

//   const proposalObjectId = new Types.ObjectId(proposalId);

//   const proposal = await findProposalById(proposalObjectId);

//   if (!proposal) {
//     throw ApiError.notFound("Không tìm thấy proposal");
//   }

//   if (!proposal.referenceTo) {
//     return {
//       proposal,
//       reports: [],
//       totalReports: 0,
//     };
//   }

//   const reports = await findReportsByProposal(proposalObjectId);

//   return {
//     proposal,
//     totalReports: reports.length,
//     reports,
//   };
// };

// /* ===============================
//    Restore documents
// =============================== */
// export const restoreDocumentService = async ({
//   documentId,
//   userId,
//   isAdmin = false,
// }: {
//   documentId: any;
//   userId?: any;
//   isAdmin?: boolean;
// }) => {

//   validateObjectId(documentId, "Document ID không hợp lệ");

//   const document = await findDocumentIncludeDeleted(documentId);

//   if (!document) {
//     throw ApiError.notFound("Không tìm thấy document");
//   }

//   if (!document.deletedAt) {
//     throw ApiError.badRequest("Document chưa bị xoá");
//   }

//   if (document.isActive) {
//     throw ApiError.badRequest("Tài liệu đang hoạt động");
//   }

//   validateRestorePermission({
//     document,
//     userId,
//     isAdmin,
//   });

//   document.deletedAt = undefined;
//   document.deletedBy = undefined;
//   document.isActive = true;

//   await document.save();

//   // Sửa Missing Validation #8: trước đây Restore là hành động duy nhất
//   // trong service không ghi `UserAudit`, tạo lỗ hổng truy vết so với
//   // Create/Update/Delete. LƯU Ý: cần xác nhận enum `action` của model
//   // `UserAudit` đã hỗ trợ giá trị "RESTORE" hay chưa (model chưa nằm
//   // trong phạm vi file được cung cấp ở lượt này).
//   await UserAudit.create([
//     {
//       user: userId,
//       action: "RESTORE",
//       performedBy: userId,
//     },
//   ]);

//   return {
//     message: "Khôi phục document thành công",
//     data: document,
//   };
// };
