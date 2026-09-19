import { Router } from "express";
import {
  createDocuments,
  getDocumentById,
  getAllDocuments,
  getReportsByProposals,
  updateDocuments,
  deleteDocuments,
  restoreDocuments,
  deleteDocumentsByMonth,
  getDocumentVersions,
  bulkDeleteDocuments,
  bulkRestoreDocuments
} from "../../controllers/documents/document.controller";
import { exportDocumentPdf, verifyDocumentPdfExport } from "../../controllers/documents/documentPdf.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { loadDocument } from "../../middlewares/loadDocument.middleware";
// Giả định middleware này đã tồn tại (đã thấy dùng ở rbac.routes.ts:
// `import { validateQuery } from "../middlewares/validate.middleware";`).
// KHÔNG sửa file middleware này trong task hiện tại — chỉ dùng lại.
import { validateBody, validateQuery, validateParams } from "../../middlewares/validate.middleware";
import { CreateDocumentDTO, UpdateDocumentDTO, QueryDocumentDTO, DeleteDocumentsByMonthDTO } from "../../dto/documents/documents.dto";
import { IdParamDTO, makeIdParamDTO, BulkIdsDTO } from "../../dto/common.dto";
// import {performanceMiddleware} from "../middlewares/performance.middleware";
// import {exportDocumentsExcel,exportDocumentsPDF} from "../controllers/document.export.controller";


const router = Router();

// [P1-4/P1.10] Gắn validateBody(CreateDocumentDTO) — trước đây DTO tồn tại
// (documents.dto.ts) nhưng không được gắn vào route nào, service tự validate
// thủ công/thiếu.
router.post(
  "/proposal",
  authenticate,
  authorizePermission("DOCUMENT_CREATE"),
  validateBody(CreateDocumentDTO),
  createDocuments,
);

// [P1-1a] QueryDocumentDTO đã sửa category/subType thành optional — route list
// tổng hợp (không kèm filter) giờ không còn bị chặn sai ở tầng validate.
router.get(
  "/",
  authenticate,
  authorizePermission("DOCUMENT_VIEW"),
  validateQuery(QueryDocumentDTO),
  getAllDocuments,
);

// [MỚI 2026-09-17, DEV-061] Batch Action Bar danh sách Document — PHẢI đăng
// ký TRƯỚC "GET/DELETE /:id" (static path). Permission khớp đúng single-item
// tương ứng (DOCUMENT_DELETE cho xoá, DOCUMENT_UPDATE cho khôi phục) — guard
// ADMIN-only của xoá (isSystemRole) và ADMIN-hoặc-owner của khôi phục vẫn áp
// dụng bên trong `deleteDocumentService`/`restoreDocumentService` (tái dùng
// nguyên vẹn qua `bulkDeleteDocumentService`/`bulkRestoreDocumentService`).
router.post(
  "/bulk-delete",
  authenticate,
  authorizePermission("DOCUMENT_DELETE"),
  validateBody(BulkIdsDTO),
  bulkDeleteDocuments,
);

router.post(
  "/bulk-restore",
  authenticate,
  authorizePermission("DOCUMENT_UPDATE"),
  validateBody(BulkIdsDTO),
  bulkRestoreDocuments,
);

// [P1-5/P1.11] Thêm validateParams(IdParamDTO) — trước đây route :id không có
// validate ObjectId ở tầng route (chỉ vài hàm service tự gọi validateObjectId
// cục bộ, không đồng bộ). ID sai format giờ trả 400 chuẩn hoá thay vì để lọt
// xuống Mongoose CastError.
//
// DEV-009A (ABAC — department-scoping): kích hoạt nhánh Policy cho route này.
// `DOCUMENT_VIEW_DETAIL` đã bị BỎ khỏi 5 role thường (rolePermission.map.ts:
// IT/USER/TRUONG_KHOA/DIEU_DUONG_TRUONG/BAN_GIAM_DOC) — non-ADMIN giờ CHỈ
// xem được document CÙNG phòng ban qua Policy
// "document-view-detail-same-department" (`resource.department ===
// user.department`). ADMIN vẫn bypass toàn bộ (bước 2 authorizePermission).
//
// THỨ TỰ MIDDLEWARE CỐ Ý: `validateParams` chạy TRƯỚC `loadDocument` (khác
// ví dụ trong doc-comment của `loadDocument.middleware.ts`) — nếu để
// `loadDocument` chạy trước, 1 `:id` sai format (không phải ObjectId hợp lệ)
// sẽ rơi thẳng xuống Mongoose `CastError` chưa chuẩn hoá (regression so với
// hành vi 400 sạch hiện có) TRƯỚC KHI `validateParams` kịp bắt. `loadDocument`
// PHẢI chạy TRƯỚC `authorizePermission` (yêu cầu bắt buộc để `req.resource`
// sẵn sàng cho nhánh ABAC — xem `loadDocument.middleware.ts`).
// DEV-040 (2026-09-10, user báo lỗi: "muốn IT được xem tài liệu tất cả các
// khoa"): `authorizePermission` nhận MẢNG 2 permission — bước 4 middleware
// dùng `.some()` (mặc định `requireAll` không bật) nên có 1 trong 2 là đủ
// pass ngay, KHÔNG cần rơi xuống ABAC Policy (bước 6) nữa.
// `DOCUMENT_VIEW_ALL_DEPARTMENTS` (IT đã được gán, rolePermission.map.ts) là
// permission RIÊNG chỉ dùng để bypass department-scoping cho hành động XEM —
// không thay thế `DOCUMENT_VIEW_DETAIL` cho role nào khác.
router.get(
  "/:id",
  authenticate,
  validateParams(IdParamDTO),
  loadDocument,
  authorizePermission(["DOCUMENT_VIEW_DETAIL", "DOCUMENT_VIEW_ALL_DEPARTMENTS"], {
    enablePolicies: true,
    resource: "document",
    action: "view_detail",
  }),
  getDocumentById,
);

router.put(
  "/:id",
  authenticate,
  authorizePermission("DOCUMENT_UPDATE"),
  validateParams(IdParamDTO),
  validateBody(UpdateDocumentDTO),
  updateDocuments,
);

// Roadmap A4 (2026-09-15, user chỉ định implement) — "Lịch sử phiên bản tài
// liệu". CHỦ Ý dùng ĐÚNG guard ABAC của "GET /:id" (department-scoping qua
// Policy `document-view-detail-same-department`) — lịch sử phiên bản lộ ra
// title/meta CŨ, cùng loại dữ liệu nhạy cảm như nội dung hiện tại, nên phải
// bị chặn giống hệt (xem thêm được nội dung hiện tại thì mới xem được nội
// dung cũ, không có ngoại lệ). 2 segment path ("/:id/versions") nên không
// xung đột thứ tự route với "/:id" (GET/PUT/DELETE) — cùng nguyên tắc đã
// dùng cho "/:proposalId/reports" phía dưới.
router.get(
  "/:id/versions",
  authenticate,
  validateParams(IdParamDTO),
  loadDocument,
  authorizePermission(["DOCUMENT_VIEW_DETAIL", "DOCUMENT_VIEW_ALL_DEPARTMENTS"], {
    enablePolicies: true,
    resource: "document",
    action: "view_detail",
  }),
  getDocumentVersions,
);

// Roadmap B5 (2026-09-18) — xuất PDF chính thức (kèm bảng phê duyệt + "ký
// nội bộ", xem documentPdf.service.ts). Dùng ĐÚNG guard của "GET /:id/versions"
// ở trên — PDF chỉ là bản render khác của CÙNG dữ liệu chi tiết, không có lý
// do phân quyền khác đi (ai xem được chi tiết thì xuất được PDF của chính nó).
router.get(
  "/:id/export-pdf",
  authenticate,
  validateParams(IdParamDTO),
  loadDocument,
  authorizePermission(["DOCUMENT_VIEW_DETAIL", "DOCUMENT_VIEW_ALL_DEPARTMENTS"], {
    enablePolicies: true,
    resource: "document",
    action: "view_detail",
  }),
  exportDocumentPdf,
);

// Roadmap B5 — xác minh 1 bản ghi "đã xuất PDF" (KHÔNG lộ nội dung Document,
// chỉ valid/exportedBy/exportedAt) — gate bằng DOCUMENT_VIEW (permission RỘNG
// nhất, mọi role thao tác Document đều có), không cần ABAC department-scoping
// vì không trả nội dung tài liệu.
router.get(
  "/pdf-exports/:exportId/verify",
  authenticate,
  authorizePermission("DOCUMENT_VIEW"),
  validateParams(makeIdParamDTO("exportId", "Mã xác thực không hợp lệ")),
  verifyDocumentPdfExport,
);

// Route này KHÔNG có :id, không cần IdParamDTO.
// DEV-021/SEC-12: trước đây route này KHÔNG có validateBody nào — controller
// chỉ tự check `!month || !year` (falsy), không ép kiểu/giới hạn khoảng giá
// trị. Thêm `DeleteDocumentsByMonthDTO`.
router.delete(
  "/delete-by-month",
  authenticate,
  authorizePermission("DOCUMENT_DELETE"),
  validateBody(DeleteDocumentsByMonthDTO),
  deleteDocumentsByMonth,
);

router.delete(
  "/:id",
  authenticate,
  authorizePermission("DOCUMENT_DELETE"),
  validateParams(IdParamDTO),
  deleteDocuments,
);

router.patch(
  "/restore/:id",
  authenticate,
  authorizePermission("DOCUMENT_UPDATE"),
  validateParams(IdParamDTO),
  restoreDocuments,
);

// Param tên "proposalId" (không phải "id" mặc định) → dùng makeIdParamDTO để
// validate đúng tên field, cùng logic ObjectId với IdParamDTO.
router.get(
  "/:proposalId/reports",
  authenticate,
  authorizePermission("DOCUMENT_VIEW"),
  validateParams(makeIdParamDTO("proposalId", "Proposal id không hợp lệ")),
  getReportsByProposals,
);


export default router;


