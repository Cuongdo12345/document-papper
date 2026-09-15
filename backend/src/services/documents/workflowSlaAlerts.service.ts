// services/documents/workflowSlaAlerts.service.ts
//
// Roadmap B1 — SLA & nhắc việc cho Workflow (2026-09-15, user chỉ định
// implement). Mirror đúng kiến trúc `assetAlerts.service.ts`/
// `medicalDeviceAlerts.service.ts`: 1 hàm tính "cái gì đang quá hạn" +
// 1 hàm "chạy cảnh báo" (gọi từ cron VÀ từ API trigger tay), có thể expose
// riêng phần TÍNH TOÁN (không side-effect) cho Dashboard đọc lại
// (`services/dashboard/workflowDashboard.service.ts`) mà không phải viết
// lại logic "bước nào đang quá hạn" lần thứ 2.

import WorkflowInstance from "../../models/documents/workflowInstance.model";
import {
  NotificationType,
  NotificationResourceType,
  NotificationPriority,
} from "../../models/notifications/notification.model";
import { notifyUsersByRoleName } from "../notifications/notification.service";

/**
 * SLA mặc định (ngày) khi 1 bước không tự đặt `slaDays` riêng (qua
 * `POST /workflow/templates`) — áp dụng NGAY cho mọi template đã seed sẵn từ
 * trước, không cần sửa dữ liệu để bật tính năng. Chỉnh ở đây nếu cần đổi.
 */
export const DEFAULT_STEP_SLA_DAYS = 3;

/** Role nhận escalation khi 1 bước quá hạn ≥ 2 lần SLA mà vẫn chưa xử lý. */
const ESCALATION_ROLE = "ADMIN";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface OverdueApprovalInfo {
  workflowInstanceId: string;
  documentId: string;
  documentTitle: string;
  documentCode: string;
  stepName: string;
  stepRole: string;
  slaDays: number;
  /** Số ngày ĐANG chờ duyệt ở bước này (tổng, không phải phần vượt SLA). */
  daysPending: number;
  /** Số ngày VƯỢT quá slaDays (0 = vừa chạm ngưỡng). */
  daysOverdue: number;
  stepStartedAt: Date;
  reminderSentAt?: Date;
  escalatedAt?: Date;
}

/**
 * Thời điểm bước `stepIndex` BẮT ĐẦU chờ duyệt — suy ra từ dữ liệu ĐÃ CÓ
 * SẴN, KHÔNG cần thêm field mới trên `WorkflowInstance`:
 *   - Bước 0: `instance.createdAt` (lúc `submitWorkflow` tạo instance).
 *   - Bước N>0: `approvedAt` của bước N-1 (thời điểm bước trước đó được
 *     duyệt — đúng thời điểm bước N trở thành "current", xem `approveStep`).
 * Fallback về `createdAt` nếu vì lý do nào đó bước trước thiếu `approvedAt`
 * (dữ liệu bất thường) — an toàn hơn throw lỗi giữa 1 job chạy nền.
 */
const getStepStartedAt = (instance: any, stepIndex: number): Date => {
  if (stepIndex <= 0) return instance.createdAt;
  return instance.steps[stepIndex - 1]?.approvedAt ?? instance.createdAt;
};

/**
 * 📌 TÍNH TOÁN (KHÔNG side-effect) — toàn bộ WorkflowInstance đang "pending"
 * có bước hiện tại VƯỢT QUÁ slaDays, sắp xếp quá hạn NHIỀU NHẤT trước.
 *
 * Xử lý TRONG BỘ NHỚ sau khi fetch (không dùng aggregation pipeline): ngưỡng
 * quá hạn phụ thuộc `steps[currentStep].slaDays` (field ĐỘNG theo từng
 * instance) + `stepStartedAt` (suy ra từ 1 trong 2 nguồn tuỳ `currentStep`,
 * không phải 1 field cố định) — không biểu diễn được bằng 1 `$match` đơn
 * giản như các dashboard khác (VD `Asset.maintenanceStartedAt <= threshold`).
 * Số lượng WorkflowInstance đang "pending" tại 1 thời điểm dự kiến nhỏ (đề
 * xuất đang chờ duyệt của 1 bệnh viện, không phải triệu bản ghi) — chấp nhận
 * xử lý JS sau khi đã dùng index `{status:1, createdAt:1}` sẵn có để loại
 * bỏ phần lớn document KHÔNG "pending", cùng tinh thần đã áp dụng ở
 * `getPendingApprovalsForRole` (workflow.service.ts).
 */
export const findOverdueWorkflowInstances = async (): Promise<
  { instance: any; info: OverdueApprovalInfo }[]
> => {
  const pendingInstances = await WorkflowInstance.find({ status: "pending" })
    .populate("documentId", "title documentCode isActive")
    .sort({ createdAt: 1 });

  const now = Date.now();
  const results: { instance: any; info: OverdueApprovalInfo }[] = [];

  for (const instance of pendingInstances) {
    // Document có thể đã bị soft-delete/huỷ SAU KHI submit workflow (hiếm) —
    // bỏ qua, không nhắc duyệt cho tài liệu không còn hoạt động.
    const document = instance.documentId as any;
    if (!document || document.isActive === false) continue;

    const step = instance.steps[instance.currentStep];
    if (!step || step.status !== "pending") continue;

    const slaDays = step.slaDays ?? DEFAULT_STEP_SLA_DAYS;
    const stepStartedAt = getStepStartedAt(instance, instance.currentStep);
    const daysPending = (now - stepStartedAt.getTime()) / MS_PER_DAY;

    if (daysPending < slaDays) continue;

    results.push({
      instance,
      info: {
        workflowInstanceId: instance._id.toString(),
        documentId: document._id.toString(),
        documentTitle: document.title,
        documentCode: document.documentCode,
        stepName: step.name ?? "",
        stepRole: step.role ?? "",
        slaDays,
        daysPending: Math.floor(daysPending),
        daysOverdue: Math.floor(daysPending - slaDays),
        stepStartedAt,
        reminderSentAt: step.slaReminderSentAt ?? undefined,
        escalatedAt: step.slaEscalatedAt ?? undefined,
      },
    });
  }

  results.sort((a, b) => b.info.daysOverdue - a.info.daysOverdue);
  return results;
};

/**
 * 📌 CHẠY CẢNH BÁO — dùng cho cron job hằng ngày VÀ API trigger tay.
 *
 * 2 mức, đúng đề xuất roadmap:
 *   1. Vừa vượt SLA (`daysPending >= slaDays`) → nhắc ĐÚNG role của bước đó,
 *      1 LẦN duy nhất (`slaReminderSentAt`).
 *   2. Vượt SLA ≥ 2 LẦN (`daysPending >= 2*slaDays`, tương đương
 *      `daysOverdue >= slaDays`) mà VẪN CHƯA xử lý → escalate lên ADMIN, 1
 *      LẦN duy nhất (`slaEscalatedAt`) — ADMIN có sẵn khả năng "duyệt thay"
 *      (`approveStep(..., isAdmin=true)`, đã có từ DEV-038) nên không cần
 *      thêm hành động mới nào để ADMIN xử lý sau khi được báo.
 *
 * Cả 2 mức xét ĐỘC LẬP trong cùng 1 lần chạy (không bắt buộc phải đã nhắc
 * mới được escalate) — phòng trường hợp cron không chạy được 1 thời gian
 * dài, bước vẫn phải được escalate ngay khi phát hiện, không phải đợi thêm
 * 1 chu kỳ chạy nữa.
 */
export const checkWorkflowSlaService = async () => {
  const overdue = await findOverdueWorkflowInstances();

  let reminded = 0;
  let escalated = 0;

  for (const { instance, info } of overdue) {
    const step = instance.steps[instance.currentStep];
    let changed = false;

    if (!step.slaReminderSentAt) {
      await notifyUsersByRoleName(info.stepRole, {
        type: NotificationType.WORKFLOW_SLA_REMINDER,
        title: "Đề xuất đang chờ duyệt quá hạn",
        message: `Tài liệu "${info.documentTitle}" (${info.documentCode}) đang chờ bạn duyệt ở bước "${info.stepName}" đã ${info.daysPending} ngày, vượt quá ${info.slaDays} ngày quy định — vui lòng xử lý sớm.`,
        resourceType: NotificationResourceType.WORKFLOW_INSTANCE,
        resourceId: instance._id,
        priority: NotificationPriority.HIGH,
        sendEmail: true,
      });
      step.slaReminderSentAt = new Date();
      changed = true;
      reminded++;
    }

    if (info.daysPending >= info.slaDays * 2 && !step.slaEscalatedAt) {
      await notifyUsersByRoleName(ESCALATION_ROLE, {
        type: NotificationType.WORKFLOW_SLA_ESCALATED,
        title: "Đề xuất quá hạn duyệt — cần can thiệp",
        message: `Tài liệu "${info.documentTitle}" (${info.documentCode}) đã quá hạn duyệt ở bước "${info.stepName}" (role "${info.stepRole}") tới ${info.daysPending} ngày (gấp ${(info.daysPending / info.slaDays).toFixed(1)} lần SLA ${info.slaDays} ngày) — đã nhắc nhưng chưa được xử lý. Cân nhắc duyệt/từ chối thay hoặc liên hệ trực tiếp người phụ trách.`,
        resourceType: NotificationResourceType.WORKFLOW_INSTANCE,
        resourceId: instance._id,
        priority: NotificationPriority.HIGH,
        sendEmail: true,
      });
      step.slaEscalatedAt = new Date();
      changed = true;
      escalated++;
    }

    if (changed) await instance.save();
  }

  return { checked: overdue.length, reminded, escalated };
};
