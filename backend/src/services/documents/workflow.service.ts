import WorkflowTemplate from "../../models/documents/workflowTemplate.model";
import WorkflowInstance from "../../models/documents/workflowInstance.model";
import { Document, DocumentSubType } from "../../models/documents/document.model";
import ApiError from "../../shared/errors/ApiError";
import {
  startAssetMaintenanceService,
  resolveAssetMaintenanceService,
} from "../assets/assetDevice/assetMaintenance.service";
import type { RepairOutcome } from "../assets/assetDevice/assetMaintenance.service";
import {
  NotificationPriority,
  NotificationResourceType,
  NotificationType,
} from "../../models/notifications/notification.model";
import {
  createNotification,
  notifyUsersByRoleName,
} from "../notifications/notification.service";
import { withTransaction } from "../../shared/utils/withTransaction";

/**
 * ✅ KHÔI PHỤC TRANSACTION (MongoDB đã chuyển sang replica set — xem
 * `withTransaction.ts`). Các chuỗi ghi nhiều collection (WorkflowInstance +
 * Document) bên dưới được bọc lại `withTransaction(...)`.
 *
 * ĐÁNH ĐỔI ĐÃ ĐƯỢC GIẢI QUYẾT (trước đây, khi còn standalone không có
 * transaction): nếu write thứ 2 (update Document) thất bại SAU KHI write
 * thứ 1 (tạo WorkflowInstance / save WorkflowInstance) đã thành công, 2
 * collection sẽ LỆCH TRẠNG THÁI VĨNH VIỄN — không có rollback tự động. Nay
 * cả 2 write cùng nằm trong 1 transaction nên sẽ cùng rollback nếu 1 trong
 * 2 lỗi.
 *
 * Toàn bộ logic nghiệp vụ khác (validate role, chặn thao tác trên workflow
 * đã kết thúc, check step tồn tại...) giữ NGUYÊN 100%, không đổi gì — chỉ
 * thêm session vào các write, và các side-effect (notification, đồng bộ
 * Asset) vẫn nằm NGOÀI transaction như thiết kế gốc.
 */

export const createWorkflowTemplate = async (data: any) => {
  return await WorkflowTemplate.create(data);
};

/**
 * 🔗 GIAI ĐOẠN 3 (module Asset) — gọi khi 1 Document duyệt xong TOÀN BỘ
 * workflow (`workflowStatus: "approved"`). Chỉ 2 subType liên quan tới
 * Asset mới cần xử lý:
 *
 *   - `PROPOSE_REPAIR`  → asset (theo `document.relatedAsset`) chuyển sang
 *     `UNDER_MAINTENANCE`.
 *   - `CONFIRM_STATUS`  → tìm document `PROPOSE_REPAIR` gốc qua
 *     `document.referenceTo`, lấy `relatedAsset` của nó, rồi dựa vào
 *     `document.meta.repairResult` ("REPAIRED" | "UNREPAIRABLE") để đưa
 *     asset quay lại `IN_USE` hoặc chuyển sang `DISPOSED`.
 *
 * CHỦ Ý bọc try/catch, KHÔNG throw ra ngoài: Document/Workflow là nghiệp
 * vụ CHÍNH của hệ thống, Asset chỉ là module MỞ RỘNG — nếu đồng bộ Asset
 * thất bại (VD: asset đã bị xoá, sai trạng thái do ai đó thao tác thủ
 * công song song), TUYỆT ĐỐI không được làm hỏng/rollback việc duyệt
 * document (hành động nghiệp vụ chính đã hợp lệ và nên được giữ nguyên).
 * Lỗi chỉ log lại để admin biết cần đối chiếu/xử lý tay.
 *
 * ⚠️ Với transaction đã khôi phục ở `approveStep`: hàm này CHỦ Ý được gọi
 * NGOÀI transaction đó (SAU KHI đã commit xong) — xem chi tiết ở
 * `approveStep` bên dưới, đúng theo mục 3 của tài liệu phân tích.
 */
const syncAssetOnDocumentApproved = async (document: any, actorUserId: any) => {
  try {
    if (document.subType === DocumentSubType.PROPOSE_REPAIR) {
      if (!document.relatedAsset) return; // document cũ tạo trước Giai đoạn 3, không có asset liên kết

      await startAssetMaintenanceService(document.relatedAsset, actorUserId);
      return;
    }

    if (document.subType === DocumentSubType.CONFIRM_STATUS) {
      const proposalId = document.referenceTo?.[0];
      if (!proposalId) return;

      const proposalDoc = await Document.findOne({
        _id: proposalId,
        subType: DocumentSubType.PROPOSE_REPAIR,
      });
      if (!proposalDoc?.relatedAsset) return;

      // Quy ước `meta.repairResult` (xem `document.model.ts` — `meta` là
      // Mixed nên không ràng buộc được ở tầng schema): "UNREPAIRABLE" thì
      // thanh lý, còn lại (kể cả thiếu field) mặc định coi là sửa xong —
      // an toàn hơn cho nghiệp vụ (asset quay lại phục vụ thay vì bị thanh
      // lý nhầm chỉ vì thiếu 1 field không bắt buộc).
      const outcome: RepairOutcome =
        document.meta?.repairResult === "UNREPAIRABLE"
          ? "UNREPAIRABLE"
          : "REPAIRED";

      await resolveAssetMaintenanceService(
        proposalDoc.relatedAsset,
        outcome,
        actorUserId,
      );
    }
  } catch (err) {
    console.error(
      `[Asset Sync] Lỗi đồng bộ trạng thái Asset khi duyệt Document "${document._id}" (subType=${document.subType}):`,
      err,
    );
  }
};

export const submitWorkflow = async (documentId: any, templateId: any) => {
  const template = await WorkflowTemplate.findById(templateId);
  // Sửa Technical Debt #6: dùng `ApiError` thay vì `new Error()` thuần —
  // trước đây lỗi này rơi vào nhánh 500 mặc định của global error handler
  // thay vì đúng 404 (một khi `workflow.controller.ts` được bọc `catchAsync`
  // — xem ghi chú ở DOCUMENT_ERROR_ANALYSIS.md, nằm ngoài phạm vi file này).
  if (!template) throw ApiError.notFound("Workflow template not found");

  const steps = template.steps.map((step) => ({
    ...step.toObject(),
    status: "pending",
  }));

  // Chuỗi ghi cần transaction: tạo WorkflowInstance + update Document
  // (gắn `workflowInstanceId`/`workflowStatus`).
  const workflow = await withTransaction(async (session) => {
    const [wf] = await WorkflowInstance.create(
      [
        {
          documentId,
          templateId,
          steps,
          currentStep: 0,
        },
      ],
      { session },
    );
    
    await Document.findByIdAndUpdate(
      documentId,
      {
        workflowInstanceId: wf._id,
        workflowStatus: "pending",
      },
      { session },
    );

    return wf;
  });

  // Báo cho tất cả user có role trùng với step đầu tiên — họ là người cần
  // hành động (duyệt/từ chối) tiếp theo. Không dùng `steps[0].approvedBy`
  // (chưa có giá trị lúc này) mà dùng `steps[0].role` để tìm đúng nhóm người
  // nhận, giống cách `approveStep` đối chiếu role ở dưới.
  // CHỦ Ý nằm NGOÀI transaction: đây là side-effect ngoài DB, không thuộc
  // phạm vi transaction MongoDB.
  const firstStep = workflow.steps[0];
  if (firstStep?.role) {
    notifyUsersByRoleName(firstStep.role, {
      type: NotificationType.WORKFLOW_STEP_ASSIGNED,
      title: "Có tài liệu cần duyệt",
      message: `Tài liệu cần bạn duyệt ở bước "${firstStep.name ?? firstStep.role}"`,
      resourceType: NotificationResourceType.WORKFLOW_INSTANCE,
      resourceId: workflow._id,
      sendEmail: true,
    });
  }

  return workflow;
};

/**
 * Sửa Missing Validation #9 (nghiêm trọng nhất module Workflow): trước đây
 * `approveStep` nhận `userId` nhưng không dùng để kiểm tra quyền — bất kỳ
 * user đăng nhập nào cũng approve được bất kỳ step nào, không cần đúng vai
 * trò `step.role`. Nay bắt buộc truyền thêm `role` của người gọi, so khớp
 * với `step.role` trước khi cho phép thao tác.
 *
 * BREAKING CHANGE: đổi chữ ký hàm (thêm tham số `role`) — `workflow.controller.ts`
 * cần cập nhật để truyền `req.user.role.name` (hoặc tương đương) vào đây.
 */
export const approveStep = async (
  workflowId: any,
  userId: any,
  role: string,
  comment?: string,
) => {
  const wf = await WorkflowInstance.findById(workflowId);
  if (!wf) throw ApiError.notFound("Workflow not found");

  // Sửa Logic Bug #7: chặn thao tác tiếp trên workflow đã kết thúc
  // (approved/rejected) — trước đây 1 workflow đã "rejected" vẫn có thể bị
  // gọi approveStep tiếp, "hồi sinh" sang approved ngoài ý muốn.
  if (wf.status !== "pending") {
    throw ApiError.badRequest(
      `Workflow đã ở trạng thái "${wf.status}", không thể xử lý tiếp`,
    );
  }

  const step = wf.steps[wf.currentStep];
  if (!step) throw ApiError.badRequest("Invalid step");

  if (step.role && step.role !== role) {
    throw ApiError.forbidden(`Chỉ role "${step.role}" mới được duyệt bước này`);
  }

  step.status = "approved";
  step.approvedBy = userId;
  step.comment = comment;
  step.approvedAt = new Date();

  const isLastStep = wf.currentStep + 1 >= wf.steps.length;

  if (!isLastStep) {
    wf.currentStep += 1;
  } else {
    wf.status = "approved";
  }

  let document: any = null;

  // Chuỗi ghi cần transaction: save WorkflowInstance + (nếu là bước cuối)
  // update Document sang `workflowStatus: "approved"`.
  await withTransaction(async (session) => {
    await wf.save({ session });

    if (isLastStep) {
      document = await Document.findByIdAndUpdate(
        wf.documentId,
        { workflowStatus: "approved" },
        { new: true, session },
      );
    }
  });

  if (isLastStep) {
    // 🔗 GIAI ĐOẠN 3 — đồng bộ trạng thái Asset (nếu document này liên quan
    // tới PROPOSE_REPAIR/CONFIRM_STATUS). Xem giải thích đầy đủ ở
    // `syncAssetOnDocumentApproved`. CHỦ Ý gọi SAU KHI transaction phía
    // trên đã commit xong — nếu người tạo document xem lại ngay khi nhận
    // thông báo, trạng thái asset đã được cập nhật xong, và lỗi đồng bộ
    // Asset (nếu có) sẽ không làm rollback việc duyệt Document đã chắc
    // chắn thành công.
    if (document) {
      await syncAssetOnDocumentApproved(document, userId);
    }

    // Duyệt xong TOÀN BỘ workflow — báo cho người tạo document biết kết quả
    // cuối cùng. Dùng `document?.createdBy` (optional) vì schema Document
    // không bắt buộc field này (xem `document.model.ts` — `createdBy` không
    // `required: true`) — bỏ qua thay vì throw nếu thiếu.
    if (document?.createdBy) {
      createNotification({
        recipient: document.createdBy,
        createdBy: userId,
        type: NotificationType.WORKFLOW_APPROVED,
        title: "Tài liệu đã được duyệt",
        message: `Tài liệu "${document.title}" đã được duyệt toàn bộ workflow`,
        resourceType: NotificationResourceType.DOCUMENT,
        resourceId: document._id,
      });
    }
  } else {
    // Còn bước tiếp theo — báo cho nhóm role phụ trách bước kế.
    const nextStep = wf.steps[wf.currentStep];
    if (nextStep?.role) {
      notifyUsersByRoleName(nextStep.role, {
        createdBy: userId,
        type: NotificationType.WORKFLOW_STEP_ASSIGNED,
        title: "Có tài liệu cần duyệt",
        message: `Tài liệu cần bạn duyệt ở bước "${nextStep.name ?? nextStep.role}"`,
        resourceType: NotificationResourceType.WORKFLOW_INSTANCE,
        resourceId: wf._id,
        sendEmail: true,
      });
    }
  }

  return wf;
};

/**
 * BREAKING CHANGE: đổi chữ ký hàm (thêm tham số `role`) — cùng lý do như
 * `approveStep`.
 */
export const rejectStep = async (
  workflowId: any,
  userId: any,
  role: string,
  comment?: string,
) => {
  const wf = await WorkflowInstance.findById(workflowId);
  if (!wf) throw ApiError.notFound("Workflow not found");

  if (wf.status !== "pending") {
    throw ApiError.badRequest(
      `Workflow đã ở trạng thái "${wf.status}", không thể xử lý tiếp`,
    );
  }

  const step = wf.steps[wf.currentStep];
  // Sửa Logic Bug #6: `rejectStep` trước đây thiếu check `step` tồn tại
  // (khác `approveStep` đã có) — nếu `currentStep` vượt bound, dòng gán field
  // tiếp theo sẽ throw `TypeError` runtime không được catch.
  if (!step) throw ApiError.badRequest("Invalid step");

  if (step.role && step.role !== role) {
    throw ApiError.forbidden(
      `Chỉ role "${step.role}" mới được từ chối bước này`,
    );
  }

  step.status = "rejected";
  step.approvedBy = userId;
  step.comment = comment;
  step.approvedAt = new Date();

  wf.status = "rejected";

  let document: any = null;

  // Chuỗi ghi cần transaction: save WorkflowInstance + update Document
  // sang `workflowStatus: "rejected"`.
  await withTransaction(async (session) => {
    await wf.save({ session });

    document = await Document.findByIdAndUpdate(
      wf.documentId,
      { workflowStatus: "rejected" },
      { new: true, session },
    );
  });

  if (document?.createdBy) {
    createNotification({
      recipient: document.createdBy,
      createdBy: userId,
      type: NotificationType.WORKFLOW_REJECTED,
      title: "Tài liệu bị từ chối",
      message: comment
        ? `Tài liệu "${document.title}" bị từ chối: ${comment}`
        : `Tài liệu "${document.title}" bị từ chối`,
      resourceType: NotificationResourceType.DOCUMENT,
      resourceId: document._id,
      priority: NotificationPriority.HIGH,
    });
  }

  return wf;
};

/* =====================================================================
   BỔ SUNG THÊM (thuần additive — KHÔNG sửa 4 hàm gốc phía trên)

   Lý do bổ sung: 4 hàm gốc (createWorkflowTemplate/submitWorkflow/
   approveStep/rejectStep) chỉ đủ để "vận hành" 1 workflow, nhưng thiếu 3
   khả năng cơ bản mà bất kỳ hệ thống duyệt nào cũng cần:
     1. Xem lại chi tiết 1 workflow instance (đã duyệt tới đâu, ai duyệt).
     2. "Hộp thư chờ duyệt" — người có quyền duyệt tự tra được việc nào
        đang chờ mình, thay vì chỉ biết qua Notification.
     3. Huỷ workflow submit nhầm KHI CHƯA có ai duyệt bước nào — quan
        trọng với module Asset (Giai đoạn 3): nếu không có cách huỷ, 1
        đề xuất sửa chữa (PROPOSE_REPAIR) tạo nhầm sẽ kẹt vĩnh viễn ở
        workflowStatus="pending", chặn không cho tạo đề xuất mới cho asset
        đó (`findPendingRepairProposalForAsset`), cho tới khi có ai đó có
        quyền duyệt bấm reject giúp.
===================================================================== */

/**
 * 📌 GET BY ID — xem chi tiết 1 workflow instance, kèm tên template và
 * người đã duyệt từng bước (populate).
 */
export const getWorkflowById = async (workflowId: any) => {
  const wf = await WorkflowInstance.findById(workflowId)
    .populate("templateId", "name")
    .populate("steps.approvedBy", "username fullName");

  if (!wf) throw ApiError.notFound("Workflow not found");

  return wf;
};

/**
 * 📌 GET BY DOCUMENT — tìm workflow instance gắn với 1 document. Hữu ích
 * khi chỉ có `documentId` trong tay (VD từ `GET /api/documents?relatedAsset=`)
 * và cần biết đang duyệt tới đâu, mà không nhớ `workflowInstanceId`.
 *
 * Trả về workflow MỚI NHẤT nếu document từng được submit nhiều lần (VD:
 * submit lần đầu bị huỷ, rồi submit lại lần 2 với template khác) — sắp
 * xếp theo `createdAt` giảm dần.
 */
export const getWorkflowByDocument = async (documentId: any) => {
  const wf = await WorkflowInstance.findOne({ documentId })
    .sort({ createdAt: -1 })
    .populate("templateId", "name")
    .populate("steps.approvedBy", "username fullName");

  if (!wf) throw ApiError.notFound("Document này chưa được submit workflow nào");

  return wf;
};

/**
 * 📌 GET PENDING APPROVALS (hộp thư chờ duyệt) — danh sách workflow đang
 * ở trạng thái "pending" VÀ bước hiện tại (`steps[currentStep]`) khớp với
 * `role` của người gọi. Đây chính là danh sách "việc đang chờ TÔI duyệt".
 *
 * Dùng `$expr` + `$arrayElemAt` để so khớp `steps[currentStep].role` ngay
 * trong query MongoDB (không load hết rồi filter ở Node) — hiệu quả hơn
 * khi số lượng workflow instance lớn.
 *
 * Chỉ READ, không cần transaction.
 */
export const getPendingApprovalsForRole = async (
  role: string,
  query: any = {},
) => {
  const { page = 1, limit = 10 } = query;
  const pageNumber = Math.max(parseInt(page, 10), 1);
  const pageSize = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNumber - 1) * pageSize;

  const filter = {
    status: "pending",
    $expr: {
      $eq: [{ $arrayElemAt: ["$steps.role", "$currentStep"] }, role],
    },
  };

  const [data, total] = await Promise.all([
    WorkflowInstance.find(filter)
      .populate("documentId", "documentCode title subType")
      .populate("templateId", "name")
      .sort({ createdAt: 1 }) // cũ nhất trước — ưu tiên xử lý việc chờ lâu nhất
      .skip(skip)
      .limit(pageSize),
    WorkflowInstance.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 📌 CANCEL — huỷ workflow do CHÍNH người tạo document rút lại, CHỈ khi
 * CHƯA có ai duyệt bước nào (`currentStep === 0` và bước đó còn "pending").
 * Nếu đã có bước nào được duyệt, không cho huỷ nữa (phải đi tiếp hoặc chờ
 * approver từ chối) — tránh việc người tạo "lật kèo" sau khi quy trình đã
 * bắt đầu chạy thật.
 *
 * Set `status: "cancelled"` (giá trị enum MỚI, bổ sung thêm — xem
 * `workflowInstance.model.ts`) — KHÔNG dùng lại "rejected" để giữ phân
 * biệt rõ "bị approver từ chối" và "người tạo tự rút lại".
 */
export const cancelWorkflow = async (
  workflowId: any,
  userId: any,
  comment?: string,
) => {
  const wf = await WorkflowInstance.findById(workflowId);
  if (!wf) throw ApiError.notFound("Workflow not found");

  if (wf.status !== "pending") {
    throw ApiError.badRequest(
      `Workflow đã ở trạng thái "${wf.status}", không thể huỷ`,
    );
  }

  if (wf.currentStep !== 0 || wf.steps[0]?.status !== "pending") {
    throw ApiError.badRequest(
      "Chỉ có thể huỷ workflow khi CHƯA có bước nào được duyệt — workflow này đã có tiến triển, không thể huỷ nữa",
    );
  }

  const document = await Document.findById(wf.documentId);
  if (!document) throw ApiError.notFound("Document not found");

  // CHỈ người tạo document mới được huỷ — không phải approver, không phải
  // admin (nếu cần cho admin huỷ hộ, nên đi qua route riêng có check
  // quyền rõ ràng, không gộp chung vào đây).
  if (String(document.createdBy) !== String(userId)) {
    throw ApiError.forbidden("Chỉ người tạo tài liệu mới được huỷ workflow này");
  }

  wf.status = "cancelled";
  wf.steps[0].status = "cancelled";
  wf.steps[0].comment = comment || "Huỷ bởi người tạo tài liệu";
  wf.steps[0].approvedAt = new Date();

  // Chuỗi ghi cần transaction: save WorkflowInstance + update Document
  // sang `workflowStatus: "cancelled"`.
  await withTransaction(async (session) => {
    await wf.save({ session });

    await Document.findByIdAndUpdate(
      wf.documentId,
      { workflowStatus: "cancelled" },
      { session },
    );
  });

  return wf;
};

/**
 * 📌 COMPLETE — đánh dấu CÔNG VIỆC THỰC TẾ đã hoàn tất, sau khi workflow đã
 * `"approved"` (duyệt xong toàn bộ các bước). KHÁC với `"approved"`:
 * `"approved"` chỉ có nghĩa là ĐÃ ĐƯỢC CHO PHÉP thực hiện (VD: đề xuất mua
 * sắm được duyệt chi tiền), CHƯA chắc việc đó đã làm xong ngoài thực tế
 * (VD: chưa mua hàng/nhận hàng). `complete` là bước đóng hẳn quy trình sau
 * khi việc thực tế đã xong.
 *
 * Điều kiện: workflow phải đang ở đúng trạng thái `"approved"` — không cho
 * complete 1 workflow còn `"pending"`/đã `"rejected"`/`"cancelled"` (không
 * có ý nghĩa gì để "hoàn tất" 1 việc còn chưa được duyệt hoặc đã bị huỷ).
 *
 * Người thực hiện: CHỈ người tạo document — cùng nguyên tắc với
 * `cancelWorkflow` (người yêu cầu ban đầu là người xác nhận đã nhận được
 * kết quả, không phải approver hay ai khác).
 */
export const completeWorkflow = async (
  workflowId: any,
  userId: any,
  comment?: string,
) => {
  const wf = await WorkflowInstance.findById(workflowId);
  if (!wf) throw ApiError.notFound("Workflow not found");

  if (wf.status !== "approved") {
    throw ApiError.badRequest(
      `Chỉ có thể đánh dấu hoàn tất khi workflow đã "approved" (hiện tại: "${wf.status}")`,
    );
  }

  const document = await Document.findById(wf.documentId);
  if (!document) throw ApiError.notFound("Document not found");

  if (String(document.createdBy) !== String(userId)) {
    throw ApiError.forbidden(
      "Chỉ người tạo tài liệu mới được đánh dấu hoàn tất workflow này",
    );
  }

  wf.status = "completed";

  // Chuỗi ghi cần transaction: save WorkflowInstance + update Document
  // sang `workflowStatus: "completed"`.
  await withTransaction(async (session) => {
    await wf.save({ session });

    await Document.findByIdAndUpdate(
      wf.documentId,
      { workflowStatus: "completed" },
      { session },
    );
  });

  // Không cần đụng tới `wf.steps` — các bước đã "approved" từ trước, việc
  // "complete" là hành động Ở CẤP WORKFLOW/DOCUMENT, không phải thêm 1 bước
  // duyệt mới. `comment` (nếu có) chỉ mang tính ghi chú, lưu tạm ở response
  // trả về chứ không có chỗ lưu cố định trong schema hiện tại (không có
  // field "completionComment" — nếu cần lưu lại, đây là điểm mở rộng sau).
  return { ...wf.toObject(), completionComment: comment };
};

// import WorkflowTemplate from "../../models/documents/workflowTemplate.model";
// import WorkflowInstance from "../../models/documents/workflowInstance.model";
// import { Document, DocumentSubType } from "../../models/documents/document.model";
// import ApiError from "../../shared/errors/ApiError";
// import {
//   startAssetMaintenanceService,
//   resolveAssetMaintenanceService,
// } from "../assets/assetMaintenance.service";
// import type { RepairOutcome } from "../assets/assetMaintenance.service";
// import {
//   NotificationPriority,
//   NotificationResourceType,
//   NotificationType,
// } from "../../models/notifications/notification.model";
// import {
//   createNotification,
//   notifyUsersByRoleName,
// } from "../notifications/notification.service";

// /**
//  * ⚠️ SỬA (theo yêu cầu): BỎ `withTransaction` — các chuỗi ghi nhiều
//  * collection (WorkflowInstance + Document) giờ chạy tuần tự KHÔNG có
//  * transaction bọc ngoài, giống bản gốc trước khi sửa "Technical Debt #7".
//  *
//  * ⚠️ ĐÁNH ĐỔI CẦN BIẾT: nếu write thứ 2 (update Document) thất bại SAU KHI
//  * write thứ 1 (tạo WorkflowInstance / save WorkflowInstance) đã thành công,
//  * 2 collection sẽ LỆCH TRẠNG THÁI VĨNH VIỄN — không có rollback tự động nữa
//  * (đây chính xác là bug mà `withTransaction` từng được thêm vào để sửa).
//  * Toàn bộ logic nghiệp vụ khác (validate role, chặn thao tác trên workflow
//  * đã kết thúc, check step tồn tại...) giữ NGUYÊN 100%, không đổi gì.
//  */

// export const createWorkflowTemplate = async (data: any) => {
//   return await WorkflowTemplate.create(data);
// };

// /**
//  * 🔗 GIAI ĐOẠN 3 (module Asset) — gọi khi 1 Document duyệt xong TOÀN BỘ
//  * workflow (`workflowStatus: "approved"`). Chỉ 2 subType liên quan tới
//  * Asset mới cần xử lý:
//  *
//  *   - `PROPOSE_REPAIR`  → asset (theo `document.relatedAsset`) chuyển sang
//  *     `UNDER_MAINTENANCE`.
//  *   - `CONFIRM_STATUS`  → tìm document `PROPOSE_REPAIR` gốc qua
//  *     `document.referenceTo`, lấy `relatedAsset` của nó, rồi dựa vào
//  *     `document.meta.repairResult` ("REPAIRED" | "UNREPAIRABLE") để đưa
//  *     asset quay lại `IN_USE` hoặc chuyển sang `DISPOSED`.
//  *
//  * CHỦ Ý bọc try/catch, KHÔNG throw ra ngoài: Document/Workflow là nghiệp
//  * vụ CHÍNH của hệ thống, Asset chỉ là module MỞ RỘNG — nếu đồng bộ Asset
//  * thất bại (VD: asset đã bị xoá, sai trạng thái do ai đó thao tác thủ
//  * công song song), TUYỆT ĐỐI không được làm hỏng/rollback việc duyệt
//  * document (hành động nghiệp vụ chính đã hợp lệ và nên được giữ nguyên).
//  * Lỗi chỉ log lại để admin biết cần đối chiếu/xử lý tay.
//  */
// const syncAssetOnDocumentApproved = async (document: any, actorUserId: any) => {
//   try {
//     if (document.subType === DocumentSubType.PROPOSE_REPAIR) {
//       if (!document.relatedAsset) return; // document cũ tạo trước Giai đoạn 3, không có asset liên kết

//       await startAssetMaintenanceService(document.relatedAsset, actorUserId);
//       return;
//     }

//     if (document.subType === DocumentSubType.CONFIRM_STATUS) {
//       const proposalId = document.referenceTo?.[0];
//       if (!proposalId) return;

//       const proposalDoc = await Document.findOne({
//         _id: proposalId,
//         subType: DocumentSubType.PROPOSE_REPAIR,
//       });
//       if (!proposalDoc?.relatedAsset) return;

//       // Quy ước `meta.repairResult` (xem `document.model.ts` — `meta` là
//       // Mixed nên không ràng buộc được ở tầng schema): "UNREPAIRABLE" thì
//       // thanh lý, còn lại (kể cả thiếu field) mặc định coi là sửa xong —
//       // an toàn hơn cho nghiệp vụ (asset quay lại phục vụ thay vì bị thanh
//       // lý nhầm chỉ vì thiếu 1 field không bắt buộc).
//       const outcome: RepairOutcome =
//         document.meta?.repairResult === "UNREPAIRABLE"
//           ? "UNREPAIRABLE"
//           : "REPAIRED";

//       await resolveAssetMaintenanceService(
//         proposalDoc.relatedAsset,
//         outcome,
//         actorUserId,
//       );
//     }
//   } catch (err) {
//     console.error(
//       `[Asset Sync] Lỗi đồng bộ trạng thái Asset khi duyệt Document "${document._id}" (subType=${document.subType}):`,
//       err,
//     );
//   }
// };

// export const submitWorkflow = async (documentId: any, templateId: any) => {
//   const template = await WorkflowTemplate.findById(templateId);
//   // Sửa Technical Debt #6: dùng `ApiError` thay vì `new Error()` thuần —
//   // trước đây lỗi này rơi vào nhánh 500 mặc định của global error handler
//   // thay vì đúng 404 (một khi `workflow.controller.ts` được bọc `catchAsync`
//   // — xem ghi chú ở DOCUMENT_ERROR_ANALYSIS.md, nằm ngoài phạm vi file này).
//   if (!template) throw ApiError.notFound("Workflow template not found");

//   const steps = template.steps.map((step) => ({
//     ...step.toObject(),
//     status: "pending",
//   }));

//   const workflow = await WorkflowInstance.create({
//     documentId,
//     templateId,
//     steps,
//     currentStep: 0,
//   });

//   await Document.findByIdAndUpdate(documentId, {
//     workflowInstanceId: workflow._id,
//     workflowStatus: "pending",
//   });

//   // Báo cho tất cả user có role trùng với step đầu tiên — họ là người cần
//   // hành động (duyệt/từ chối) tiếp theo. Không dùng `steps[0].approvedBy`
//   // (chưa có giá trị lúc này) mà dùng `steps[0].role` để tìm đúng nhóm người
//   // nhận, giống cách `approveStep` đối chiếu role ở dưới.
//   const firstStep = workflow.steps[0];
//   if (firstStep?.role) {
//     notifyUsersByRoleName(firstStep.role, {
//       type: NotificationType.WORKFLOW_STEP_ASSIGNED,
//       title: "Có tài liệu cần duyệt",
//       message: `Tài liệu cần bạn duyệt ở bước "${firstStep.name ?? firstStep.role}"`,
//       resourceType: NotificationResourceType.WORKFLOW_INSTANCE,
//       resourceId: workflow._id,
//       sendEmail: true,
//     });
//   }

//   return workflow;
// };

// /**
//  * Sửa Missing Validation #9 (nghiêm trọng nhất module Workflow): trước đây
//  * `approveStep` nhận `userId` nhưng không dùng để kiểm tra quyền — bất kỳ
//  * user đăng nhập nào cũng approve được bất kỳ step nào, không cần đúng vai
//  * trò `step.role`. Nay bắt buộc truyền thêm `role` của người gọi, so khớp
//  * với `step.role` trước khi cho phép thao tác.
//  *
//  * BREAKING CHANGE: đổi chữ ký hàm (thêm tham số `role`) — `workflow.controller.ts`
//  * cần cập nhật để truyền `req.user.role.name` (hoặc tương đương) vào đây.
//  */
// export const approveStep = async (
//   workflowId: any,
//   userId: any,
//   role: string,
//   comment?: string,
// ) => {
//   const wf = await WorkflowInstance.findById(workflowId);
//   if (!wf) throw ApiError.notFound("Workflow not found");

//   // Sửa Logic Bug #7: chặn thao tác tiếp trên workflow đã kết thúc
//   // (approved/rejected) — trước đây 1 workflow đã "rejected" vẫn có thể bị
//   // gọi approveStep tiếp, "hồi sinh" sang approved ngoài ý muốn.
//   if (wf.status !== "pending") {
//     throw ApiError.badRequest(
//       `Workflow đã ở trạng thái "${wf.status}", không thể xử lý tiếp`,
//     );
//   }

//   const step = wf.steps[wf.currentStep];
//   if (!step) throw ApiError.badRequest("Invalid step");

//   if (step.role && step.role !== role) {
//     throw ApiError.forbidden(`Chỉ role "${step.role}" mới được duyệt bước này`);
//   }

//   step.status = "approved";
//   step.approvedBy = userId;
//   step.comment = comment;
//   step.approvedAt = new Date();

//   const isLastStep = wf.currentStep + 1 >= wf.steps.length;

//   if (!isLastStep) {
//     wf.currentStep += 1;
//   } else {
//     wf.status = "approved";
//   }

//   await wf.save();

//   if (isLastStep) {
//     const document = await Document.findByIdAndUpdate(
//       wf.documentId,
//       { workflowStatus: "approved" },
//       { new: true },
//     );

//     // 🔗 GIAI ĐOẠN 3 — đồng bộ trạng thái Asset (nếu document này liên quan
//     // tới PROPOSE_REPAIR/CONFIRM_STATUS). Xem giải thích đầy đủ ở
//     // `syncAssetOnDocumentApproved`. Đặt TRƯỚC đoạn notification bên dưới
//     // để nếu người tạo document xem lại ngay khi nhận thông báo, trạng thái
//     // asset đã được cập nhật xong.
//     if (document) {
//       await syncAssetOnDocumentApproved(document, userId);
//     }

//     // Duyệt xong TOÀN BỘ workflow — báo cho người tạo document biết kết quả
//     // cuối cùng. Dùng `document?.createdBy` (optional) vì schema Document
//     // không bắt buộc field này (xem `document.model.ts` — `createdBy` không
//     // `required: true`) — bỏ qua thay vì throw nếu thiếu.
//     if (document?.createdBy) {
//       createNotification({
//         recipient: document.createdBy,
//         createdBy: userId,
//         type: NotificationType.WORKFLOW_APPROVED,
//         title: "Tài liệu đã được duyệt",
//         message: `Tài liệu "${document.title}" đã được duyệt toàn bộ workflow`,
//         resourceType: NotificationResourceType.DOCUMENT,
//         resourceId: document._id,
//       });
//     }
//   } else {
//     // Còn bước tiếp theo — báo cho nhóm role phụ trách bước kế.
//     const nextStep = wf.steps[wf.currentStep];
//     if (nextStep?.role) {
//       notifyUsersByRoleName(nextStep.role, {
//         createdBy: userId,
//         type: NotificationType.WORKFLOW_STEP_ASSIGNED,
//         title: "Có tài liệu cần duyệt",
//         message: `Tài liệu cần bạn duyệt ở bước "${nextStep.name ?? nextStep.role}"`,
//         resourceType: NotificationResourceType.WORKFLOW_INSTANCE,
//         resourceId: wf._id,
//         sendEmail: true,
//       });
//     }
//   }

//   return wf;
// };

// /**
//  * BREAKING CHANGE: đổi chữ ký hàm (thêm tham số `role`) — cùng lý do như
//  * `approveStep`.
//  */
// export const rejectStep = async (
//   workflowId: any,
//   userId: any,
//   role: string,
//   comment?: string,
// ) => {
//   const wf = await WorkflowInstance.findById(workflowId);
//   if (!wf) throw ApiError.notFound("Workflow not found");

//   if (wf.status !== "pending") {
//     throw ApiError.badRequest(
//       `Workflow đã ở trạng thái "${wf.status}", không thể xử lý tiếp`,
//     );
//   }

//   const step = wf.steps[wf.currentStep];
//   // Sửa Logic Bug #6: `rejectStep` trước đây thiếu check `step` tồn tại
//   // (khác `approveStep` đã có) — nếu `currentStep` vượt bound, dòng gán field
//   // tiếp theo sẽ throw `TypeError` runtime không được catch.
//   if (!step) throw ApiError.badRequest("Invalid step");

//   if (step.role && step.role !== role) {
//     throw ApiError.forbidden(
//       `Chỉ role "${step.role}" mới được từ chối bước này`,
//     );
//   }

//   step.status = "rejected";
//   step.approvedBy = userId;
//   step.comment = comment;
//   step.approvedAt = new Date();

//   wf.status = "rejected";

//   await wf.save();

//   const document = await Document.findByIdAndUpdate(
//     wf.documentId,
//     { workflowStatus: "rejected" },
//     { new: true },
//   );

//   if (document?.createdBy) {
//     createNotification({
//       recipient: document.createdBy,
//       createdBy: userId,
//       type: NotificationType.WORKFLOW_REJECTED,
//       title: "Tài liệu bị từ chối",
//       message: comment
//         ? `Tài liệu "${document.title}" bị từ chối: ${comment}`
//         : `Tài liệu "${document.title}" bị từ chối`,
//       resourceType: NotificationResourceType.DOCUMENT,
//       resourceId: document._id,
//       priority: NotificationPriority.HIGH,
//     });
//   }

//   return wf;
// };

// /* =====================================================================
//    BỔ SUNG THÊM (thuần additive — KHÔNG sửa 4 hàm gốc phía trên)

//    Lý do bổ sung: 4 hàm gốc (createWorkflowTemplate/submitWorkflow/
//    approveStep/rejectStep) chỉ đủ để "vận hành" 1 workflow, nhưng thiếu 3
//    khả năng cơ bản mà bất kỳ hệ thống duyệt nào cũng cần:
//      1. Xem lại chi tiết 1 workflow instance (đã duyệt tới đâu, ai duyệt).
//      2. "Hộp thư chờ duyệt" — người có quyền duyệt tự tra được việc nào
//         đang chờ mình, thay vì chỉ biết qua Notification.
//      3. Huỷ workflow submit nhầm KHI CHƯA có ai duyệt bước nào — quan
//         trọng với module Asset (Giai đoạn 3): nếu không có cách huỷ, 1
//         đề xuất sửa chữa (PROPOSE_REPAIR) tạo nhầm sẽ kẹt vĩnh viễn ở
//         workflowStatus="pending", chặn không cho tạo đề xuất mới cho asset
//         đó (`findPendingRepairProposalForAsset`), cho tới khi có ai đó có
//         quyền duyệt bấm reject giúp.
// ===================================================================== */

// /**
//  * 📌 GET BY ID — xem chi tiết 1 workflow instance, kèm tên template và
//  * người đã duyệt từng bước (populate).
//  */
// export const getWorkflowById = async (workflowId: any) => {
//   const wf = await WorkflowInstance.findById(workflowId)
//     .populate("templateId", "name")
//     .populate("steps.approvedBy", "username fullName");

//   if (!wf) throw ApiError.notFound("Workflow not found");

//   return wf;
// };

// /**
//  * 📌 GET BY DOCUMENT — tìm workflow instance gắn với 1 document. Hữu ích
//  * khi chỉ có `documentId` trong tay (VD từ `GET /api/documents?relatedAsset=`)
//  * và cần biết đang duyệt tới đâu, mà không nhớ `workflowInstanceId`.
//  *
//  * Trả về workflow MỚI NHẤT nếu document từng được submit nhiều lần (VD:
//  * submit lần đầu bị huỷ, rồi submit lại lần 2 với template khác) — sắp
//  * xếp theo `createdAt` giảm dần.
//  */
// export const getWorkflowByDocument = async (documentId: any) => {
//   const wf = await WorkflowInstance.findOne({ documentId })
//     .sort({ createdAt: -1 })
//     .populate("templateId", "name")
//     .populate("steps.approvedBy", "username fullName");

//   if (!wf) throw ApiError.notFound("Document này chưa được submit workflow nào");

//   return wf;
// };

// /**
//  * 📌 GET PENDING APPROVALS (hộp thư chờ duyệt) — danh sách workflow đang
//  * ở trạng thái "pending" VÀ bước hiện tại (`steps[currentStep]`) khớp với
//  * `role` của người gọi. Đây chính là danh sách "việc đang chờ TÔI duyệt".
//  *
//  * Dùng `$expr` + `$arrayElemAt` để so khớp `steps[currentStep].role` ngay
//  * trong query MongoDB (không load hết rồi filter ở Node) — hiệu quả hơn
//  * khi số lượng workflow instance lớn.
//  */
// export const getPendingApprovalsForRole = async (
//   role: string,
//   query: any = {},
// ) => {
//   const { page = 1, limit = 10 } = query;
//   const pageNumber = Math.max(parseInt(page, 10), 1);
//   const pageSize = Math.max(parseInt(limit, 10), 1);
//   const skip = (pageNumber - 1) * pageSize;

//   const filter = {
//     status: "pending",
//     $expr: {
//       $eq: [{ $arrayElemAt: ["$steps.role", "$currentStep"] }, role],
//     },
//   };

//   const [data, total] = await Promise.all([
//     WorkflowInstance.find(filter)
//       .populate("documentId", "documentCode title subType")
//       .populate("templateId", "name")
//       .sort({ createdAt: 1 }) // cũ nhất trước — ưu tiên xử lý việc chờ lâu nhất
//       .skip(skip)
//       .limit(pageSize),
//     WorkflowInstance.countDocuments(filter),
//   ]);

//   return {
//     data,
//     pagination: {
//       page: pageNumber,
//       limit: pageSize,
//       total,
//       totalPages: Math.ceil(total / pageSize),
//     },
//   };
// };

// /**
//  * 📌 CANCEL — huỷ workflow do CHÍNH người tạo document rút lại, CHỈ khi
//  * CHƯA có ai duyệt bước nào (`currentStep === 0` và bước đó còn "pending").
//  * Nếu đã có bước nào được duyệt, không cho huỷ nữa (phải đi tiếp hoặc chờ
//  * approver từ chối) — tránh việc người tạo "lật kèo" sau khi quy trình đã
//  * bắt đầu chạy thật.
//  *
//  * Set `status: "cancelled"` (giá trị enum MỚI, bổ sung thêm — xem
//  * `workflowInstance.model.ts`) — KHÔNG dùng lại "rejected" để giữ phân
//  * biệt rõ "bị approver từ chối" và "người tạo tự rút lại".
//  */
// export const cancelWorkflow = async (
//   workflowId: any,
//   userId: any,
//   comment?: string,
// ) => {
//   const wf = await WorkflowInstance.findById(workflowId);
//   if (!wf) throw ApiError.notFound("Workflow not found");

//   if (wf.status !== "pending") {
//     throw ApiError.badRequest(
//       `Workflow đã ở trạng thái "${wf.status}", không thể huỷ`,
//     );
//   }

//   if (wf.currentStep !== 0 || wf.steps[0]?.status !== "pending") {
//     throw ApiError.badRequest(
//       "Chỉ có thể huỷ workflow khi CHƯA có bước nào được duyệt — workflow này đã có tiến triển, không thể huỷ nữa",
//     );
//   }

//   const document = await Document.findById(wf.documentId);
//   if (!document) throw ApiError.notFound("Document not found");

//   // CHỈ người tạo document mới được huỷ — không phải approver, không phải
//   // admin (nếu cần cho admin huỷ hộ, nên đi qua route riêng có check
//   // quyền rõ ràng, không gộp chung vào đây).
//   if (String(document.createdBy) !== String(userId)) {
//     throw ApiError.forbidden("Chỉ người tạo tài liệu mới được huỷ workflow này");
//   }

//   wf.status = "cancelled";
//   wf.steps[0].status = "cancelled";
//   wf.steps[0].comment = comment || "Huỷ bởi người tạo tài liệu";
//   wf.steps[0].approvedAt = new Date();
//   await wf.save();

//   await Document.findByIdAndUpdate(wf.documentId, { workflowStatus: "cancelled" });

//   return wf;
// };

// /**
//  * 📌 COMPLETE — đánh dấu CÔNG VIỆC THỰC TẾ đã hoàn tất, sau khi workflow đã
//  * `"approved"` (duyệt xong toàn bộ các bước). KHÁC với `"approved"`:
//  * `"approved"` chỉ có nghĩa là ĐÃ ĐƯỢC CHO PHÉP thực hiện (VD: đề xuất mua
//  * sắm được duyệt chi tiền), CHƯA chắc việc đó đã làm xong ngoài thực tế
//  * (VD: chưa mua hàng/nhận hàng). `complete` là bước đóng hẳn quy trình sau
//  * khi việc thực tế đã xong.
//  *
//  * Điều kiện: workflow phải đang ở đúng trạng thái `"approved"` — không cho
//  * complete 1 workflow còn `"pending"`/đã `"rejected"`/`"cancelled"` (không
//  * có ý nghĩa gì để "hoàn tất" 1 việc còn chưa được duyệt hoặc đã bị huỷ).
//  *
//  * Người thực hiện: CHỈ người tạo document — cùng nguyên tắc với
//  * `cancelWorkflow` (người yêu cầu ban đầu là người xác nhận đã nhận được
//  * kết quả, không phải approver hay ai khác).
//  */
// export const completeWorkflow = async (
//   workflowId: any,
//   userId: any,
//   comment?: string,
// ) => {
//   const wf = await WorkflowInstance.findById(workflowId);
//   if (!wf) throw ApiError.notFound("Workflow not found");

//   if (wf.status !== "approved") {
//     throw ApiError.badRequest(
//       `Chỉ có thể đánh dấu hoàn tất khi workflow đã "approved" (hiện tại: "${wf.status}")`,
//     );
//   }

//   const document = await Document.findById(wf.documentId);
//   if (!document) throw ApiError.notFound("Document not found");

//   if (String(document.createdBy) !== String(userId)) {
//     throw ApiError.forbidden(
//       "Chỉ người tạo tài liệu mới được đánh dấu hoàn tất workflow này",
//     );
//   }

//   wf.status = "completed";
//   await wf.save();

//   await Document.findByIdAndUpdate(wf.documentId, { workflowStatus: "completed" });

//   // Không cần đụng tới `wf.steps` — các bước đã "approved" từ trước, việc
//   // "complete" là hành động Ở CẤP WORKFLOW/DOCUMENT, không phải thêm 1 bước
//   // duyệt mới. `comment` (nếu có) chỉ mang tính ghi chú, lưu tạm ở response
//   // trả về chứ không có chỗ lưu cố định trong schema hiện tại (không có
//   // field "completionComment" — nếu cần lưu lại, đây là điểm mở rộng sau).
//   return { ...wf.toObject(), completionComment: comment };
// };