import { Request, Response, NextFunction } from "express";
import { Document } from "../models/documents/document.model";
import WorkflowInstance from "../models/documents/workflowInstance.model";
import ApiError from "../shared/errors/ApiError";

/**
 * Load document theo `:id` vào `req.resource` — dùng cho nhánh ABAC
 * (`authorizePermission` với `options.enablePolicies`).
 *
 * Sửa #8 (DOCUMENT_SECURITY_ANALYSIS.md, "Thấp" nhưng là dead-code footgun):
 * 1. `throw new Error(...)` → `ApiError.notFound(...)`: trước đây dùng
 *    `Error` thuần, sai convention lỗi toàn hệ thống (mọi nơi khác dùng
 *    `ApiError` để global error handler chuẩn hoá đúng status code) — nếu
 *    middleware này được gắn vào route mà không sửa, lỗi 404 sẽ không được
 *    chuẩn hoá đúng format response.
 * 2. Thêm filter `isActive: true`: trước đây `findById` không lọc, có thể
 *    load được cả document đã soft-delete vào `req.resource`, khiến policy
 *    ABAC (nếu bật) đánh giá nhầm trên dữ liệu đã "xoá".
 *
 * LƯU Ý: middleware này viết ra nhưng CHƯA được gắn vào route nào trong
 * `document.route.ts` (dead middleware, ghi nhận ở mục 3.1,
 * DOCUMENT_SECURITY_ANALYSIS.md) — cần tự gắn vào route cần dùng ABAC theo
 * tài nguyên cụ thể, ví dụ:
 *   router.put("/:id", authenticate,
 *     authorizePermission("DOCUMENT_UPDATE", { enablePolicies: true, resource: "document", action: "update" }),
 *     loadDocument, // ⚠️ phải chạy TRƯỚC authorizePermission nếu muốn req.resource
 *                   //    sẵn sàng cho nhánh ABAC — xem lưu ý thứ tự bên dưới.
 *     updateDocuments);
 *
 * ⚠️ THỨ TỰ MIDDLEWARE QUAN TRỌNG: `authorizePermission` đọc `req.resource`
 * ở nhánh ABAC, nên `loadDocument` PHẢI chạy TRƯỚC `authorizePermission`
 * trong chain, không phải sau như route mẫu thường viết theo thứ tự
 * "authenticate → authorize → business middleware". Đây là điểm dễ nhầm khi
 * tích hợp middleware này — nếu gắn sai thứ tự, `req.resource` vẫn
 * `undefined` giống hệt tình trạng "dead middleware" hiện tại.
 */
export const loadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      isActive: true,
    });

    if (!document) {
      throw ApiError.notFound("Không tìm thấy document");
    }

    // DEV-034 (ABAC — cho phép người duyệt xem document đang chờ CHÍNH HỌ
    // duyệt, bất kể phòng ban): Policy `document-view-detail-same-department`
    // (DEV-009A) chỉ cho xem document CÙNG phòng ban — role duyệt liên phòng
    // ban thật sự (vd `PHONG_VAT_TU_TTB` — thẩm định kỹ thuật cho MỌI khoa,
    // không chỉ khoa của chính họ; nguy cơ này đã được cảnh báo trước ở
    // DEV-009A Mục 2.3/10.6 cho cả `BAN_GIAM_DOC`) bị chặn 403 dù đang là
    // người duyệt bước hiện tại — xác nhận qua báo lỗi thật của user (tài
    // khoản `phongkhth`, role `PHONG_VAT_TU_TTB`, bước 2 "Phòng Vật tư - TTB
    // thẩm định"). Gắn thêm `pendingApproverRole` (role của bước ĐANG chờ
    // duyệt, nếu workflow còn "pending") vào `req.resource` — field KHÔNG có
    // trong schema, chỉ tồn tại trong bộ nhớ cho nhánh ABAC đọc qua Policy
    // `document-view-detail-pending-approver`
    // (`resource.pendingApproverRole === user.role.name`), KHÔNG persist
    // xuống DB. Lấy workflow MỚI NHẤT theo `documentId` (giống
    // `getWorkflowByDocument` ở `workflow.service.ts`, nhưng viết lại trực
    // tiếp ở đây thay vì gọi qua service — hàm đó `throw NotFound` khi không
    // có workflow nào, không phù hợp để dùng trong middleware này vì phần lớn
    // document (REPORT/REFERENCE, hoặc PROPOSAL chưa submit) không có
    // workflow, và đó là trạng thái hợp lệ, không phải lỗi).
    const wf = await WorkflowInstance.findOne({
      documentId: document._id,
      status: "pending",
    }).sort({ createdAt: -1 });

    (document as any).pendingApproverRole = wf ? wf.steps?.[wf.currentStep]?.role ?? null : null;

    // ⚠️ BUG PHÁT HIỆN + FIX (2026-09-10, user báo lỗi thật sau khi dùng tab
    // "Lịch sử duyệt" mới, DEV-038): `pendingApproverRole` ở trên CHỈ khớp
    // khi workflow CÒN "pending" — ngay khi workflow đó kết thúc (duyệt
    // xong/từ chối/huỷ/hoàn tất), field trả về `null` VĨNH VIỄN, khiến 1
    // approver KHÁC phòng ban KHÔNG BAO GIỜ xem lại được document mình đã
    // từng duyệt/từ chối qua "Lịch sử duyệt" — dù chính họ (hoặc role của
    // họ) là người đã xử lý bước đó. Gắn thêm `workflowParticipantRole` —
    // role của người gọi NẾU role đó có mặt ở BẤT KỲ bước nào (mọi trạng
    // thái: đã duyệt/từ chối/huỷ/còn pending), trong BẤT KỲ WorkflowInstance
    // nào từng gắn với document này (không chỉ cái MỚI NHẤT — tài liệu có
    // thể đã submit lại nhiều lần sau khi bị từ chối/huỷ, xem Nâng cấp #1
    // DEV-038 vừa cho phép). Cùng tiêu chí khớp với `getWorkflowHistoryForUser`
    // (`workflow.service.ts`, "Lịch sử duyệt") — đảm bảo bất kỳ dòng nào
    // hiện trong danh sách lịch sử đều bấm "Xem chi tiết" được, không còn
    // link chết. Policy MỚI, CỘNG THÊM (`document-view-detail-workflow-participant-role`,
    // KHÔNG sửa/xoá Policy `pendingApproverRole` cũ — 2 Policy này OR với
    // nhau, xem `authorizePermission.middleware.ts` bước 6).
    const allWorkflowsForDocument = await WorkflowInstance.find({
      documentId: document._id,
    }).select("steps.role");
    const involvedRoles = new Set<string>();
    for (const w of allWorkflowsForDocument) {
      for (const step of w.steps) {
        if (step.role) involvedRoles.add(step.role);
      }
    }
    const callerRole = req.user?.role?.name;
    (document as any).workflowParticipantRole =
      callerRole && involvedRoles.has(callerRole) ? callerRole : null;

    req.resource = document;

    next();
  } catch (error) {
    next(error);
  }
};

