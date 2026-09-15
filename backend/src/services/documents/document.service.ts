import { Types } from "mongoose";
import { generateDocumentCode } from "../../shared/utils/generateDocumentCode";
import ApiError from "../../shared/errors/ApiError";
import UserAudit from "../../models/users/userAudit.model";
import { DocumentSubType } from "../../models/documents/document.model";
import { DocumentVersion } from "../../models/documents/documentVersion.model";
import { Asset, AssetStatus } from "../../models/assets/asset.model";
import WorkflowInstance from "../../models/documents/workflowInstance.model";
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
  softDeleteDocumentsByFilter,
  findDocumentIdsByFilter,
  findProposalById,
  findReportsByProposal,
  countReportsByProposal,
  findDocumentIncludeDeleted,
  findPendingRepairProposalForAsset,
} from "./documents.query";
import { DOCUMENT_UPDATE_WHITELIST } from "./documents.constants";
import { applyDepartmentFilter, canViewAcrossDepartments, isSameDepartment } from "./documents.scope";
import type {
  CreateDocumentPayload,
  GetAllDocumentsPayload,
  GetReportsByProposalPayload,
  UpdateDocumentPayload,
  DeleteDocumentPayload,
  DeleteDocumentsByMonthPayload,
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

    // ⚠️ SỬA (DEV-045, 2026-09-12 — RV05-07 TOCTOU, ghi nhận từ DEV-025,
    // xác nhận lại ở `docs/30_DEVELOPMENT_COMPLETION_AUDIT.md` Mục 3/9 #2):
    // check "trùng đề xuất sửa chữa" TRƯỚC ĐÂY đọc Ở ĐÂY — TRƯỚC khi vào
    // transaction bên dưới — window TOCTOU (time-of-check-to-time-of-use):
    // 2 request tạo đề xuất đồng thời cho CÙNG 1 asset đều đọc "chưa có đề
    // xuất pending nào" rồi CÙNG được tạo mới → 2 workflow độc lập cùng
    // tranh nhau đổi trạng thái 1 asset khi duyệt xong (đúng hệ quả mà check
    // này sinh ra để ngăn). Cùng họ lỗi với ARCH-21 (đã fix ở
    // `excel.service.ts`, dò trùng Proposal khi import Excel).
    //
    // Nay chuyển hẳn xuống ĐỌC BÊN TRONG `withTransaction` (dùng
    // `findPendingRepairProposalForAsset(relatedAsset, session)`, cùng
    // pattern ARCH-21) — xem code trong callback bên dưới. Đóng lại đúng
    // ĐÂY (không còn check ở ngoài) để tránh double-check thừa/lệch logic.
  }

  const documentCode = await generateDocumentCode(category, department);

  const referenceArray = buildReferenceArray(referenceTo);

  // Chuỗi ghi cần transaction: tạo Document + ghi UserAudit "CREATE".
  const doc = await withTransaction(async (session) => {
    // MỚI (DEV-045, 2026-09-12 — RV05-07 TOCTOU): dò trùng đề xuất sửa chữa
    // NGAY TRONG transaction, đọc qua đúng `session` — xem giải thích đầy đủ
    // ở nhánh validate PROPOSE_REPAIR phía trên. Đặt NGAY ĐẦU callback,
    // TRƯỚC `createDocument`, để throw ở đây rollback toàn bộ transaction
    // (chưa ghi gì) — không lãng phí ghi UserAudit cho 1 lần tạo bị từ chối.
    //
    // ⚠️ Đánh đổi CHỦ Ý: `documentCode` (dòng `generateDocumentCode` phía
    // trên) đã được cấp PHÁT TRƯỚC khi vào đây (áp dụng cho MỌI loại
    // document, không riêng PROPOSE_REPAIR — không di dời để tránh mở rộng
    // phạm vi sửa ra ngoài đúng bug RV05-07). Nếu nhánh dưới đây throw, mã
    // `documentCode` đó bị bỏ phí (tạo khoảng trống trong dãy số) — đây là
    // hệ quả PHỤ chấp nhận được (chỉ ảnh hưởng thẩm mỹ đánh số, KHÔNG ảnh
    // hưởng tính đúng đắn dữ liệu), đổi lại đóng đúng race điều kiện chính
    // (2 đề xuất trùng lặp cho cùng 1 asset).
    if (subType === DocumentSubType.PROPOSE_REPAIR) {
      const pendingProposal = await findPendingRepairProposalForAsset(relatedAsset, session);
      if (pendingProposal) {
        throw ApiError.badRequest(
          `Tài sản này đang có 1 đề xuất sửa chữa khác chưa duyệt xong (mã: ${pendingProposal.documentCode ?? pendingProposal._id})`,
        );
      }
    }

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
export const getAllDocumentsService = async ({
  query,
  callerDepartment,
  isAdmin = false,
  canViewAllDepartments = false,
}: GetAllDocumentsPayload) => {
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

  // DEV-030 (yêu cầu user 2026-09-06): "user nào login vào chỉ được cho phép
  // thấy tài liệu của khoa đó" — trước đây `department` chỉ là 1 filter TUỲ
  // CHỌN do CLIENT tự truyền qua query string; nếu client không truyền, non-
  // admin thấy được document của TẤT CẢ khoa trong danh sách (chỉ `GET /:id`
  // mới bị chặn khác khoa, từ DEV-009A). Nay ÉP CỨNG `filter.department` theo
  // khoa của người gọi cho non-admin, GHI ĐÈ bất kỳ giá trị `department` nào
  // client truyền trong query (không cho non-admin tự chọn xem khoa khác).
  // ADMIN (bypass) giữ nguyên hành vi cũ — vẫn lọc theo `department` query
  // (nếu có) hoặc xem tất cả (nếu không truyền).
  //
  // Fail-closed: nếu non-admin không có `department` (dữ liệu user thiếu
  // field này) thì ép `filter.department = null` — KHÔNG document nào khớp
  // (`department` là `required:true` trong schema, không bao giờ `null`) —
  // thay vì để `filter.department = undefined` (Mongo/Mongoose bỏ qua field
  // `undefined` khi build query, tương đương KHÔNG lọc gì — lộ toàn bộ dữ
  // liệu, ngược lại hoàn toàn với ý định).
  //
  // MỚI (DEV-040, 2026-09-10 — user báo lỗi trực tiếp: đã gán permission cho
  // IT qua UI "Phân quyền" nhưng danh sách vẫn rỗng/chỉ thấy khoa mình).
  // Root cause: nhánh này trước đây CHỈ có 1 lối thoát — `isAdmin` — hoàn
  // toàn KHÔNG đọc permission nào, nên KHÔNG permission nào gán qua UI có
  // thể tác động tới đây. `canViewAllDepartments` (permission
  // `DOCUMENT_VIEW_ALL_DEPARTMENTS`, IT đã được gán — rolePermission.map.ts)
  // là lối thoát THỨ HAI, song song `isAdmin`, KHÔNG thay thế.
  //
  // MỚI (DEV-041, 2026-09-11): logic OR này được RÚT sang
  // `applyDepartmentFilter()` (`documents.scope.ts`) — dùng chung với
  // `getReportsByProposalService` bên dưới, thay vì mỗi hàm tự viết lại
  // (nguyên nhân trực tiếp gây chuỗi 5 bug liên tiếp DEV-030→040, xem
  // DEV-041.md). KHÔNG đổi hành vi so với bản trước.
  applyDepartmentFilter(filter, { isAdmin, canViewAllDepartments, callerDepartment });

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
   VERSION HISTORY (Roadmap A4)
=============================== */
/**
 * 📌 GET — lịch sử nội dung (title/meta) của 1 document, mới nhất trước.
 * CHỈ ĐỌC (không có restore — quyết định đã chốt với user: mục đích thuần
 * kiểm toán, xem lại "trước khi sửa nó viết gì"). KHÔNG bao gồm nội dung
 * HIỆN TẠI (đã có sẵn ở `getDocumentDetailService`) — chỉ các bản ĐÃ BỊ
 * thay thế.
 */
export const getDocumentVersionsService = async (documentId: any) => {
  validateObjectId(documentId, "Document ID không hợp lệ");

  const versions = await DocumentVersion.find({ document: documentId })
    .sort({ versionNumber: -1 })
    .populate("editedBy", "fullName username");

  return versions;
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
  //
  // MỚI (DEV-041, 2026-09-11): phép so sánh "cùng phòng ban" RÚT sang
  // `isSameDepartment()` (`documents.scope.ts`) — dùng chung với 2 hàm XEM ở
  // trên. CỐ TÌNH KHÔNG dùng `canViewAcrossDepartments()`/
  // `canViewAllDepartments` ở đây — permission đó CHỈ áp dụng hành động XEM
  // (xem giải thích ở `documents.scope.ts` + `permission.constant.ts`), sửa
  // document khác khoa vẫn CHỈ dành cho ADMIN, giữ nguyên hành vi cũ. Giữ
  // nguyên thứ tự `callerDepartment &&` — nếu thiếu `callerDepartment`
  // (dữ liệu user thiếu field) thì KHÔNG throw ở đây (khác thiết kế
  // fail-closed của `getAllDocumentsService`) — hành vi CŨ, không đổi.
  if (
    !isAdmin &&
    callerDepartment &&
    !isSameDepartment(document.department, callerDepartment)
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

  // Roadmap A4 (Document versioning, 2026-09-15) — chụp lại nội dung CŨ
  // (title/meta — đúng 2 field DOCUMENT_UPDATE_WHITELIST cho phép sửa qua
  // route này) TRƯỚC KHI bị `Object.assign` ghi đè ngay bên dưới.
  // `editedBy`/`editedAt` lấy từ `document.updatedBy`/`updatedAt` HIỆN TẠI
  // (người/thời điểm đã TẠO RA nội dung sắp bị thay thế) — KHÔNG PHẢI
  // `userId` của lần sửa này (đó là người đóng version cũ lại, không phải
  // người viết ra nó). Fallback `createdBy`/`createdAt` cho lần sửa ĐẦU TIÊN
  // (khi đó `updatedBy`/`updatedAt` chưa từng được set bởi 1 edit thật nào).
  const previousSnapshot = {
    title: document.title,
    meta: document.meta,
    editedBy: document.updatedBy ?? document.createdBy,
    editedAt: document.updatedAt ?? document.createdAt ?? new Date(),
  };

  Object.assign(document, safeUpdate);
  document.updatedBy = new Types.ObjectId(userId);
  // Bỏ set tay `updatedAt` (Technical Debt #5) — model đã bật
  // `{ timestamps: true }`, Mongoose tự cập nhật field này khi `.save()`.

  // Chuỗi ghi cần transaction: DocumentVersion (bản cũ) + UserAudit "UPDATE"
  // + save Document — atomic, không có window nào giữa lúc document đổi và
  // lúc bản cũ được lưu lại (tránh mất lịch sử nếu 1 write giữa chừng lỗi).
  await withTransaction(async (session) => {
    const versionCount = await DocumentVersion.countDocuments({
      document: document._id,
    }).session(session);

    await DocumentVersion.create(
      [
        {
          document: document._id,
          versionNumber: versionCount + 1,
          ...previousSnapshot,
        },
      ],
      { session },
    );

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
  isSystemRole,
}: DeleteDocumentPayload) => {
  validateObjectId(id, "ID không hợp lệ");

  const document = await getActiveDocumentOrFail(id);

  // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12): chỉ còn đọc cờ
  // security identity `isSystemRole`, đã gỡ lưới đỡ literal "ADMIN".
  if (!(isSystemRole === true)) {
    throw ApiError.forbidden("Không có quyền");
  }

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

  // DEV-016/MEDIUM-11 (RV05-06): trước đây soft-delete Document không kiểm
  // tra `workflowStatus` — nếu còn "pending", WorkflowInstance liên quan vẫn
  // hoạt động bình thường (approver vẫn duyệt/từ chối được), kéo theo
  // side-effect đổi Asset thật (`syncAssetOnDocumentApproved`) cho 1 document
  // đã bị ẩn khỏi luồng active thông thường. Chặn xoá, buộc admin tự xử lý
  // workflow (huỷ/chờ duyệt xong) trước khi xoá Document.
  if (document.workflowStatus === "pending") {
    throw ApiError.badRequest(
      "Không thể xoá: document đang có workflow ở trạng thái chờ duyệt (pending) — cần huỷ hoặc chờ workflow xử lý xong trước",
    );
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
   DELETE (SOFT) many by month
=============================== */
export const deleteDocumentsByMonthService = async ({
  month,
  year,
  filters = {},
  userId,
  role,
  isSystemRole,
}: DeleteDocumentsByMonthPayload) => {
  // 🔒 MỚI (DEV-044, 2026-09-12 — Remaining Issue từ DEV-006, xác nhận lại ở
  // `docs/30_DEVELOPMENT_COMPLETION_AUDIT.md` Mục 3/9 #3): trước đây hàm này
  // KHÔNG có guard nào ngoài permission `DOCUMENT_DELETE` ở route — bất kỳ
  // role nào giữ permission đó (hiện tại: ADMIN + IT, sau DEV-041) xoá được
  // HÀNG LOẠT document theo tháng của BẤT KỲ phòng ban nào (client tự truyền
  // `department` filter, không bị ép về khoa mình). Xoá ĐƠN LẺ đã yêu cầu
  // ADMIN thật từ DEV-006 (`deleteDocumentService`) — bulk-delete có blast
  // radius LỚN HƠN nhiều (cả tháng dữ liệu, nhiều phòng ban cùng lúc) nên
  // PHẢI cùng mức bảo vệ, không được lỏng hơn. Dùng ĐÚNG guard/pattern đã có
  // (không sáng chế cơ chế mới).
  // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12): chỉ còn đọc cờ
  // security identity `isSystemRole`, đã gỡ lưới đỡ literal "ADMIN".
  if (!(isSystemRole === true)) {
    throw ApiError.forbidden("Chỉ ADMIN được xoá hàng loạt document theo tháng");
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  // Sửa Duplicate Logic #2: dùng chung `buildDocumentFilter` với
  // `getAllDocumentsService` thay vì tự viết lại `if (x) query.x = x`.
  const query: Record<string, any> = {
    createdAt: { $gte: start, $lte: end },
    ...buildDocumentFilter(filters),
  };

  // DEV-006/IMP-006 (H-06=ISS-02=RV05-05): trước đây `deleteMany` (hard
  // delete) không kiểm tra tham chiếu, để lại dangling reference vĩnh viễn ở
  // WorkflowInstance.documentId/Document.referenceTo/Notification.resourceId.
  // Nay chuyển sang soft-delete (isActive/deletedAt/deletedBy), ĐỒNG BỘ
  // pattern với `deleteDocumentService()` — document vẫn tồn tại trong DB
  // nên WorkflowInstance/Notification KHÔNG còn dangling (populate vẫn trả
  // về document, chỉ `isActive=false` thay vì null).
  //
  // Document.referenceTo vẫn cần xử lý riêng: 1 PROPOSAL còn REPORT active
  // tham chiếu mà bị soft-delete sẽ làm `getReportsByProposalService` báo
  // 404 "Không tìm thấy proposal" (`findProposalById` lọc `isActive:true`)
  // dù REPORT đó vẫn active — đây là breakage luồng nghiệp vụ đang chạy,
  // không chỉ là "dữ liệu mồ côi" ở tầng DB. Loại các PROPOSAL này khỏi
  // batch, dùng lại ĐÚNG điều kiện guard đã có ở `deleteDocumentService`
  // (Missing Validation #5, qua `countReportsByProposal`) để không lệch
  // logic giữa xoá đơn lẻ và xoá hàng loạt.
  const proposalIdsInScope = await findDocumentIdsByFilter({
    ...query,
    category: "PROPOSAL",
  });

  const referencedProposalIds: any[] = [];
  for (const proposalId of proposalIdsInScope) {
    const reportCount = await countReportsByProposal(proposalId);
    if (reportCount > 0) {
      referencedProposalIds.push(proposalId);
    }
  }

  const finalQuery =
    referencedProposalIds.length > 0
      ? { ...query, _id: { $nin: referencedProposalIds } }
      : query;

  // Chỉ 1 write trên 1 collection (`updateMany` trên Document) — KHÔNG cần
  // transaction (transaction chỉ có ý nghĩa khi ghi NHIỀU collection cần
  // atomic cùng nhau).
  const result = await softDeleteDocumentsByFilter(finalQuery, userId);

  return {
    deletedCount: result.modifiedCount,
    // Số PROPOSAL bị loại khỏi batch vì còn REPORT active tham chiếu — minh
    // bạch cho caller biết vì sao deletedCount có thể nhỏ hơn tổng số
    // document khớp filter tháng/năm.
    skippedCount: referencedProposalIds.length,
  };
};

/* ===============================
   Get report by proposal
=============================== */
export const getReportsByProposalService = async ({
  proposalId,
  callerDepartment,
  isAdmin = false,
  callerRole,
  canViewAllDepartments = false,
}: GetReportsByProposalPayload) => {
  validateObjectId(proposalId, "Proposal id không hợp lệ");

  const proposalObjectId = new Types.ObjectId(proposalId);

  const proposal = await findProposalById(proposalObjectId);

  if (!proposal) {
    throw ApiError.notFound("Không tìm thấy proposal");
  }

  // DEV-030 (bổ sung) — đồng bộ rule "chỉ thấy tài liệu cùng khoa" đã áp dụng
  // cho `GET /:id` (DEV-009A) và `GET /documents` (DEV-030): endpoint này là
  // 1 đường đọc Document KHÁC (proposal + reports tham chiếu), nếu không
  // chặn ở đây thì non-admin vẫn đọc được nội dung proposal/report của
  // phòng ban khác chỉ bằng cách biết/đoán `proposalId`, dù đã bị chặn ở
  // 2 endpoint kia — bypass hoàn toàn ý định ban đầu.
  // `proposal.department` đã được `findProposalById` populate thành object
  // `{_id, name, code}` (khác `document.department` raw ObjectId ở nơi
  // khác) — so sánh qua `_id`.
  //
  // ⚠️ BUG PHÁT HIỆN + FIX (2026-09-10, user báo lỗi thật qua tab "Lịch sử
  // duyệt" mới, DEV-038): trước đây rule "cùng khoa" KHÔNG có ngoại lệ nào
  // — khác `GET /:id` (đã có Policy ABAC `pendingApproverRole`/
  // `workflowParticipantRole`, `loadDocument.middleware.ts`), endpoint này
  // chặn CỨNG mọi approver khác phòng ban, dù workflow đang pending HAY đã
  // xong. Thêm đúng 1 ngoại lệ tương đương (đồng bộ với Policy mới ở
  // `loadDocument.middleware.ts`): role người gọi từng có mặt ở BẤT KỲ bước
  // nào (mọi trạng thái) của BẤT KỲ WorkflowInstance nào gắn với proposal
  // này → vẫn cho xem, dù khác phòng ban. CHỦ Ý chỉ query `WorkflowInstance`
  // khi thật sự cần (ADMIN/cùng phòng ban đã đủ điều kiện thì bỏ qua luôn,
  // tránh 1 query DB thừa cho trường hợp phổ biến nhất).
  // MỚI (DEV-041, 2026-09-11): `isSameDepartment`/`canViewAcrossDepartments`
  // RÚT sang `documents.scope.ts` — dùng chung với `getAllDocumentsService`
  // ở trên, thay vì tự viết lại phép so sánh (xem giải thích đầy đủ ở đầu
  // file đó + DEV-041.md Mục 1.3/3.2C). KHÔNG đổi hành vi so với bản trước.
  const sameDepartment = isSameDepartment(proposal.department._id, callerDepartment);

  // MỚI (DEV-040, 2026-09-10) — đồng bộ đúng lối thoát `canViewAllDepartments`
  // vừa thêm ở `getAllDocumentsService` (permission `DOCUMENT_VIEW_ALL_
  // DEPARTMENTS`, IT đã được gán) — không đồng bộ điểm này thì IT thấy được
  // document/list rồi nhưng bấm vào "biên bản liên quan" của 1 proposal khác
  // khoa vẫn 403 (cùng lớp bug DEV-039 vừa gặp, khác trigger).
  if (!canViewAcrossDepartments({ isAdmin, canViewAllDepartments }) && !sameDepartment) {
    const isWorkflowParticipant =
      !!callerRole &&
      (await WorkflowInstance.exists({
        documentId: proposal._id,
        "steps.role": callerRole,
      }));

    if (!isWorkflowParticipant) {
      throw ApiError.forbidden(
        "Không có quyền xem proposal/report của phòng ban khác",
      );
    }
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

