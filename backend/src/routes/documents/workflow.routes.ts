import express from "express";
import {
  createTemplate,
  submit,
  approve,
  reject,
  getPendingApprovals,
  getByDocument,
  getById,
  cancel,
  complete
} from "../../controllers/documents/workflow.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import {
  CreateWorkflowTemplateDTO,
  SubmitWorkflowDTO,
  ApproveRejectBodyDTO,
  QueryPendingApprovalsDTO,
  CancelWorkflowBodyDTO,
  CompleteWorkflowBodyDTO,
} from "../../dto/documents/workflow.dto";
import { IdParamDTO, makeIdParamDTO } from "../../dto/common.dto";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";

const router = express.Router();

// ⚠️ CHỦ ĐÍCH KHÔNG THÊM `authorizePermission` ở file này trong lượt sửa này.
// Việc thiếu authorization + role-per-step check (P0-1 trong
// MODULE_P1_CRITICAL_PLAN.md, P1.1 trong MODULE_REFACTOR_PLAN.md) là lỗ hổng
// Security/Business Logic nghiêm trọng đã được ghi nhận riêng — thuộc phạm vi
// 1 task khác ("P1-01 Security" hoặc tương đương), không phải "P1-02
// Validation". Task hiện tại CHỈ đảm bảo dữ liệu đi vào đúng hình dạng/kiểu;
// KHÔNG đảm bảo ai được phép gọi các endpoint này — điểm này vẫn còn hở sau
// khi áp dụng các thay đổi trong file này, cần task riêng xử lý tiếp.

router.post(
  "/templates",
  authenticate,
  authorizePermission("WORKFLOW_TEMPLATE_CREATE"),
  validateBody(CreateWorkflowTemplateDTO),
  createTemplate,
);

router.post(
  "/submit",
  authenticate,
  authorizePermission("WORKFLOW_SUBMIT"),
  validateBody(SubmitWorkflowDTO),
  submit,
);

router.post(
  "/:id/approve",
  authenticate,
  authorizePermission("WORKFLOW_APPROVE"),
  validateParams(IdParamDTO),
  validateBody(ApproveRejectBodyDTO),
  approve,
);

router.post(
  "/:id/reject",
  authenticate,
  authorizePermission("WORKFLOW_REJECT"),
  validateParams(IdParamDTO),
  validateBody(ApproveRejectBodyDTO),
  reject,
);

/* =====================================================================
   BỔ SUNG THÊM (thuần additive) — xem giải thích ở workflow.service.ts.
   ⚠️ Giữ nguyên tinh thần "chưa thêm authorizePermission" của file này
   (xem comment đầu file) — các route mới cũng CHƯA gắn permission riêng,
   thuộc cùng phạm vi task Security còn để ngỏ.

   THỨ TỰ ROUTE quan trọng: "/pending" và "/document/:documentId" phải
   khai báo TRƯỚC "/:id" — nếu không, Express sẽ khớp nhầm "/pending" vào
   route "/:id" (coi "pending" là giá trị của :id).
===================================================================== */

router.get(
  "/pending",
  authenticate,
  authorizePermission("WORKFLOW_VIEW"),
  // validateQuery(QueryPendingApprovalsDTO),
  getPendingApprovals,
);

router.get(
  "/document/:documentId",
  authenticate,
  authorizePermission("WORKFLOW_VIEW"),
  validateParams(makeIdParamDTO("documentId", "Document ID không hợp lệ")),
  getByDocument,
);

router.get(
  "/:id",
  authenticate,
  authorizePermission("WORKFLOW_VIEW"),
  validateParams(IdParamDTO),
  getById,
);

router.post(
  "/:id/cancel",
  authenticate,
  authorizePermission("WORKFLOW_CANCEL"),
  validateParams(IdParamDTO),
  validateBody(CancelWorkflowBodyDTO),
  cancel,
);

router.post(
  "/:id/complete",
  authenticate,
  authorizePermission("WORKFLOW_COMPLETE"),
  validateParams(IdParamDTO),
  validateBody(CompleteWorkflowBodyDTO),
  complete,
);

export default router;