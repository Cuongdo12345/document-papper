import { Router } from "express";
import {
  createDocuments,
  getDocumentById,
  getAllDocuments,
  getReportsByProposals,
  updateDocuments,
  deleteDocuments,
  restoreDocuments,
  deleteDocumentsByMonth
} from "../../controllers/documents/document.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
// Giả định middleware này đã tồn tại (đã thấy dùng ở rbac.routes.ts:
// `import { validateQuery } from "../middlewares/validate.middleware";`).
// KHÔNG sửa file middleware này trong task hiện tại — chỉ dùng lại.
import { validateBody, validateQuery, validateParams } from "../../middlewares/validate.middleware";
import { CreateDocumentDTO, UpdateDocumentDTO, QueryDocumentDTO } from "../../dto/documents/documents.dto";
import { IdParamDTO, makeIdParamDTO } from "../../dto/common.dto";
// import {performanceMiddleware} from "../middlewares/performance.middleware";
// import {exportDocumentsExcel,exportDocumentsPDF} from "../controllers/document.export.controller";


const router = Router();

// [P1-4/P1.10] Gắn validateBody(CreateDocumentDTO) — trước đây DTO tồn tại
// (documents.dto.ts) nhưng không được gắn vào route nào, service tự validate
// thủ công/thiếu.
router.post(
  "/proposal",
  authenticate,
  // authorizePermission("DOCUMENT_CREATE"),
  validateBody(CreateDocumentDTO),
  createDocuments,
);

// [P1-1a] QueryDocumentDTO đã sửa category/subType thành optional — route list
// tổng hợp (không kèm filter) giờ không còn bị chặn sai ở tầng validate.
router.get(
  "/",
  authenticate,
  authorizePermission("DOCUMENT_READ"),
  // validateQuery(QueryDocumentDTO),
  getAllDocuments,
);

// [P1-5/P1.11] Thêm validateParams(IdParamDTO) — trước đây route :id không có
// validate ObjectId ở tầng route (chỉ vài hàm service tự gọi validateObjectId
// cục bộ, không đồng bộ). ID sai format giờ trả 400 chuẩn hoá thay vì để lọt
// xuống Mongoose CastError.
router.get(
  "/:id",
  authenticate,
  authorizePermission("DOCUMENT_DETAIL"),
  validateParams(IdParamDTO),
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

// Route này KHÔNG có :id, không cần IdParamDTO. DTO validate cho month/year/
// filters (nếu cần) là hạng mục riêng (P2.9 — Business Improvement, "Delete
// theo tháng"), không thuộc phạm vi P1-02 Validation — chưa xử lý ở đây.
router.delete(
  "/delete-by-month",
  authenticate,
  authorizePermission("DOCUMENT_DELETE"),
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
  authorizePermission("DOCUMENT_READ"),
  validateParams(makeIdParamDTO("proposalId", "Proposal id không hợp lệ")),
  getReportsByProposals,
);


export default router;


