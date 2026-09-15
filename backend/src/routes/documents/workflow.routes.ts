import express from "express";
import {
  createTemplate,
  getTemplates,
  submit,
  approve,
  reject,
  getPendingApprovals,
  getHistory,
  getByDocument,
  getById,
  cancel,
  complete,
  runWorkflowSlaAlerts,
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
  QueryWorkflowHistoryDTO,
} from "../../dto/documents/workflow.dto";
import { IdParamDTO, makeIdParamDTO } from "../../dto/common.dto";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";

const router = express.Router();

// ⚠️ OUTDATED (đánh dấu 2026-09-10, KHÔNG xoá — giữ lại làm dấu vết lịch sử):
// comment gốc bên dưới từng ghi "CHỦ Ý KHÔNG THÊM authorizePermission" — đã
// KHÔNG còn đúng với source hiện tại, mọi route trong file này ĐỀU đã có
// `authorizePermission` (xem P0-1/MODULE_P1_CRITICAL_PLAN.md đã được xử lý ở
// 1 task Security sau đó, không rõ task nào — không tìm thấy task doc cụ thể
// khi rà lại). Role-per-step check (đúng `role` mới được duyệt đúng bước)
// vẫn nằm ở SERVICE layer (`approveStep`/`rejectStep` so khớp `step.role`),
// KHÔNG phải ở middleware route — đúng thiết kế, vì đây là business rule
// động theo TỪNG BƯỚC của TỪNG workflow instance, permission RBAC tĩnh
// không biểu diễn được.
//
// [Nguyên văn cũ, để tham khảo]: "CHỦ ĐÍCH KHÔNG THÊM authorizePermission ở
// file này trong lượt sửa này [...] Task hiện tại CHỈ đảm bảo dữ liệu đi vào
// đúng hình dạng/kiểu; KHÔNG đảm bảo ai được phép gọi các endpoint này."

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

   THỨ TỰ ROUTE quan trọng: "/pending", "/templates" và "/document/:documentId"
   phải khai báo TRƯỚC "/:id" — nếu không, Express sẽ khớp nhầm các path này
   vào route "/:id" (coi "pending"/"templates" là giá trị của :id).
===================================================================== */

// 📌 GET ALL TEMPLATES (đọc-only, bổ sung FE-04) — xem giải thích đầy đủ ở
// `getAllWorkflowTemplatesService` (workflow.service.ts). Dùng chung
// permission `WORKFLOW_VIEW` với "/pending"/"/document/:documentId" bên
// dưới (KHÔNG tạo permission mới — không có permission "xem template"
// riêng trong catalog hiện tại, và hành động "xem template để chọn khi
// submit workflow" thuộc đúng ngữ nghĩa WORKFLOW_VIEW).
router.get(
  "/templates",
  authenticate,
  authorizePermission("WORKFLOW_VIEW"),
  getTemplates,
);

router.get(
  "/pending",
  authenticate,
  authorizePermission("WORKFLOW_VIEW"),
  validateQuery(QueryPendingApprovalsDTO),
  getPendingApprovals,
);

// 📌 MỚI (2026-09-10, user yêu cầu trực tiếp) — "Lịch sử duyệt". PHẢI khai
// TRƯỚC "/:id" (cùng lý do "/pending"/"/templates" ở trên) — nếu không
// Express sẽ khớp nhầm "history" vào route "/:id" (coi "history" là giá
// trị của :id).
router.get(
  "/history",
  authenticate,
  authorizePermission("WORKFLOW_VIEW"),
  validateQuery(QueryWorkflowHistoryDTO),
  getHistory,
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

/**
 * Roadmap B1 (2026-09-15) — chạy tay kiểm tra nhắc/escalate đề xuất trễ hạn
 * duyệt (bình thường chạy tự động qua cron). Mirror đúng
 * "/assets/medical-devices/alerts/run" — POST nên KHÔNG xung đột với
 * "/:id" ở trên (chỉ đăng ký cho GET).
 */
router.post(
  "/sla/run",
  authenticate,
  authorizePermission("WORKFLOW_SLA_ALERTS_TRIGGER"),
  runWorkflowSlaAlerts,
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