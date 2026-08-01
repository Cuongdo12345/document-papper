// dto/workflow.dto.ts (FILE MỚI)
// Vị trí giả định: src/dto/workflow.dto.ts
//
// Trước đây `workflow.routes.ts`/`workflow.service.ts` không có bất kỳ DTO nào —
// toàn bộ 4 endpoint (createTemplate, submit, approve, reject) nhận `req.body`
// kiểu `any` không qua validate (ghi nhận ở MODULE_P1_CRITICAL_PLAN.md, P0-1 và
// MODULE_REFACTOR_PLAN.md P1.1 — phần DTO). File này chỉ bổ sung lớp validate
// hình dạng dữ liệu (shape/type), KHÔNG xử lý phần authorization/role-per-step
// của P0-1/P1.1 — phần đó thuộc phạm vi Security/Business Logic, nằm ngoài task
// "chỉ sửa DTO/Validation Middleware" hiện tại.
// dto/workflow.dto.ts (FILE MỚI)
// Vị trí giả định: src/dto/workflow.dto.ts
//
// Trước đây `workflow.routes.ts`/`workflow.service.ts` không có bất kỳ DTO nào —
// toàn bộ 4 endpoint (createTemplate, submit, approve, reject) nhận `req.body`
// kiểu `any` không qua validate (ghi nhận ở MODULE_P1_CRITICAL_PLAN.md, P0-1 và
// MODULE_REFACTOR_PLAN.md P1.1 — phần DTO). File này chỉ bổ sung lớp validate
// hình dạng dữ liệu (shape/type), KHÔNG xử lý phần authorization/role-per-step
// của P0-1/P1.1 — phần đó thuộc phạm vi Security/Business Logic, nằm ngoài task
// "chỉ sửa DTO/Validation Middleware" hiện tại.
import { z } from "zod";
import { objectId } from "../common.dto";

export const CreateWorkflowTemplateDTO = z.object({
  name: z.string().min(1),
  steps: z
    .array(
      z.object({
        stepOrder: z.coerce.number().int().min(0),
        name: z.string().min(1),
        // Giữ nguyên kiểu string tự do cho `role` ở lớp DTO này — việc đổi sang
        // ref/enum ràng buộc chặt là thay đổi SCHEMA (`WorkflowTemplate` model),
        // đã ghi nhận riêng ở MODULE_P1_CRITICAL_PLAN.md (P0-1, ý “cân nhắc đổi
        // steps[].role sang ref Role”) — thuộc phạm vi Business Logic/Data Model,
        // không sửa ở đây.
        role: z.string().min(1),
      }),
    )
    .min(1, "Cần ít nhất 1 bước duyệt"),
  isActive: z.boolean().optional(),
});

export const SubmitWorkflowDTO = z.object({
  documentId: objectId("Document ID không hợp lệ"),
  templateId: objectId("Template ID không hợp lệ"),
});

/** Dùng chung cho cả POST /:id/approve và POST /:id/reject — body chỉ có `comment`. */
export const ApproveRejectBodyDTO = z.object({
  comment: z.string().max(1000).optional(),
});

/**
 * 🔗 Bổ sung thêm (không sửa 3 DTO trên) — dùng cho các endpoint mới:
 * GET /pending (hộp thư chờ duyệt), POST /:id/cancel.
 */
export const QueryPendingApprovalsDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
});

export const CancelWorkflowBodyDTO = z.object({
  comment: z.string().max(1000).optional(),
});

/**
 * 🔗 Bổ sung thêm (không sửa 3 DTO trên) — dùng cho POST /:id/complete.
 */
export const CompleteWorkflowBodyDTO = z.object({
  comment: z.string().max(1000).optional(),
});