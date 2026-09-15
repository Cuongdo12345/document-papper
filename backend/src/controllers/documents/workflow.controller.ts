import * as service from "../../services/documents/workflow.service";
import { checkWorkflowSlaService } from "../../services/documents/workflowSlaAlerts.service";
import { Request, Response } from "express";
import { catchAsync } from "../../shared/utils/catchAsync";

/**
 * Sửa lỗi Critical (DOCUMENT_ERROR_ANALYSIS.md, mục 1.2 / 7-#1): trước đây
 * toàn bộ handler trong file này KHÔNG được bọc `catchAsync` — nếu service
 * throw lỗi (kể cả lỗi hợp lệ như "template not found"), Express 4 không tự
 * bắt được rejected promise trong route handler, request có thể treo tới
 * timeout hoặc trong trường hợp xấu crash tiến trình qua `unhandledRejection`.
 * Nay bọc `catchAsync` cho cả 4 handler, đúng pattern đã dùng nhất quán ở
 * `document.controller.ts`.
 */


export const createTemplate = catchAsync(async (req: Request, res: Response) => {
  const data = await service.createWorkflowTemplate(req.body);

  res.status(201).json({
    success: true,
    message: "Tạo workflow template thành công",
    data,
  });
});

/**
 * 📌 GET ALL TEMPLATES (đọc-only) — xem giải thích đầy đủ ở
 * `getAllWorkflowTemplatesService` (workflow.service.ts). Bổ sung riêng cho
 * FE-04, KHÔNG đổi `createTemplate` phía trên.
 */
export const getTemplates = catchAsync(async (req: Request, res: Response) => {
  const data = await service.getAllWorkflowTemplatesService();

  res.json({
    success: true,
    message: "Lấy danh sách workflow template thành công",
    data,
  });
});

export const submit = catchAsync(async (req: Request, res: Response) => {
  const { documentId, templateId } = req.body;

  const wf = await service.submitWorkflow(documentId, templateId);

  res.json({
    success: true,
    message: "Submit workflow thành công",
    data: wf,
  });
});

export const approve = catchAsync(async (req: Request, res: Response) => {
  // Sửa 2 lỗi cùng lúc:
  // 1. `req.user!.id` → `req.user!._id`: `auth.middleware.ts` gắn field
  //    `_id` vào `req.user` (không có field `id`) — trước đây dòng này luôn
  //    truyền `undefined` làm `userId`, khiến `step.approvedBy` bị ghi sai.
  // 2. Bổ sung tham số `role` (BREAKING CHANGE ở `workflow.service.ts` —
  //    xem MODULE_P1_SECURITY_PLAN.md #3): `approveStep` giờ bắt buộc biết
  //    role người gọi để so khớp với `step.role`, chặn việc bất kỳ user nào
  //    cũng approve được mọi step.
  // 3. NÂNG CẤP (2026-09-10, DEV-038 đề xuất #2): truyền thêm `isAdmin` —
  //    ADMIN được phép "duyệt thay" bước không khớp role của chính họ, xem
  //    giải thích đầy đủ ở `approveStep` (workflow.service.ts).
  // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12): chỉ còn đọc cờ
  // security identity `isSystemRole`, đã gỡ lưới đỡ literal "ADMIN".
  const isAdmin = req.user?.role?.isSystemRole === true;

  const wf = await service.approveStep(
    req.params.id,
    req.user!._id,
    req.user!.role.name,
    req.body.comment,
    isAdmin,
  );

  res.json({
    success: true,
    message: "Duyệt workflow thành công",
    data: wf,
  });
});

// Sửa 2 lỗi cùng lúc (xem ghi chú ở `approve`):
export const reject = catchAsync(async (req: Request, res: Response) => {
  // Cùng lỗi + nâng cấp như `approve` — xem ghi chú ở trên.
  // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12): chỉ còn đọc cờ
  // security identity `isSystemRole`, đã gỡ lưới đỡ literal "ADMIN".
  const isAdmin = req.user?.role?.isSystemRole === true;

  const wf = await service.rejectStep(
    req.params.id,
    req.user!._id,
    req.user!.role.name,
    req.body.comment,
    isAdmin,
  );

  res.json({
    success: true,
    message: "Từ chối workflow thành công",
    data: wf,
  });
});

/* =====================================================================
   BỔ SUNG THÊM (thuần additive) — xem giải thích đầy đủ ở workflow.service.ts
===================================================================== */
// Lấy chi tiết workflow theo id
export const getById = catchAsync(async (req: Request, res: Response) => {
  const wf = await service.getWorkflowById(req.params.id);

  res.json({
    success: true,
    message: "Lấy chi tiết workflow thành công",
    data: wf,
  });
});

// 
export const getByDocument = catchAsync(async (req: Request, res: Response) => {
  const wf = await service.getWorkflowByDocument(req.params.documentId);

  res.json({
    success: true,
    message: "Lấy workflow theo document thành công",
    data: wf,
  });
});

// Lấy danh sách workflow đang chờ duyệt cho role của user hiện tại
export const getPendingApprovals = catchAsync(async (req: Request, res: Response) => {
  const result = await service.getPendingApprovalsForRole(
    req.user!.role.name,
    req.query,
  );

  res.json({
    success: true,
    message: "Lấy danh sách chờ duyệt thành công",
    ...result,
  });
});

// 📌 MỚI (2026-09-10) — "Lịch sử duyệt", xem giải thích đầy đủ ở
// `getWorkflowHistoryForUser` (workflow.service.ts).
export const getHistory = catchAsync(async (req: Request, res: Response) => {
  // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12): chỉ còn đọc cờ
  // security identity `isSystemRole`, đã gỡ lưới đỡ literal "ADMIN".
  const isAdmin = req.user?.role?.isSystemRole === true;

  const result = await service.getWorkflowHistoryForUser(
    { role: req.user!.role.name, isAdmin },
    req.query,
  );

  res.json({
    success: true,
    message: "Lấy lịch sử duyệt thành công",
    ...result,
  });
});

// Huỷ workflow (BREAKING CHANGE ở `workflow.service.ts` — xem MODULE_P1_SECURITY_PLAN.md #3):
export const cancel = catchAsync(async (req: Request, res: Response) => {
  const wf = await service.cancelWorkflow(
    req.params.id,
    req.user!._id,
    req.body.comment,
  );

  res.json({
    success: true,
    message: "Huỷ workflow thành công",
    data: wf,
  });
});

export const complete = catchAsync(async (req: Request, res: Response) => {
  const wf = await service.completeWorkflow(
    req.params.id,
    req.user!._id,
    req.body.comment,
  );

  res.json({
    success: true,
    message: "Đánh dấu hoàn tất workflow thành công",
    data: wf,
  });
});

/**
 * Roadmap B1 — chạy tay kiểm tra nhắc/escalate đề xuất trễ hạn duyệt (bình
 * thường chạy tự động qua cron, endpoint này để test/demo thủ công — mirror
 * đúng `runMedicalDeviceAlerts`/`runAssetAlerts`).
 */
export const runWorkflowSlaAlerts = catchAsync(async (req: Request, res: Response) => {
  const result = await checkWorkflowSlaService();

  res.json({
    success: true,
    message: "Chạy kiểm tra SLA workflow thành công",
    data: result,
  });
});

