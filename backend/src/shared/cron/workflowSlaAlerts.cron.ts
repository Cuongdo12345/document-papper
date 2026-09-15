// shared/cron/workflowSlaAlerts.cron.ts
//
// Roadmap B1 (SLA & nhắc việc Workflow, 2026-09-15) — đăng ký cron job chạy
// `checkWorkflowSlaService` mỗi ngày. Mirror đúng cấu trúc
// `assetAlerts.cron.ts`/`medicalDeviceAlerts.cron.ts`.

import cron from "node-cron";
import { checkWorkflowSlaService } from "../../services/documents/workflowSlaAlerts.service";

/**
 * Giờ chạy: 08:10 sáng mỗi ngày (giờ server) — SAU cron Asset (08:00) và
 * Medical Device (08:05) 5 phút, cùng lý do stagger đã giải thích ở
 * `medicalDeviceAlerts.cron.ts` (tránh nhiều cron ghi Notification/gửi email
 * đồng thời lúc hệ thống vừa khởi động ca hành chính).
 */
const WORKFLOW_SLA_ALERTS_CRON_SCHEDULE = "10 8 * * *";

export const registerWorkflowSlaAlertsCron = () => {
  cron.schedule(
    WORKFLOW_SLA_ALERTS_CRON_SCHEDULE,
    async () => {
      console.log("[cron] Bắt đầu kiểm tra SLA duyệt Workflow...");
      try {
        const result = await checkWorkflowSlaService();
        console.log(
          `[cron] Hoàn tất — kiểm tra ${result.checked} bước quá hạn, nhắc ${result.reminded}, escalate ${result.escalated}.`,
        );
      } catch (err) {
        // KHÔNG throw — cùng lý do đã giải thích ở assetAlerts.cron.ts:
        // 1 lần cron lỗi không được làm crash cả server.
        console.error("[cron] Lỗi khi chạy kiểm tra SLA duyệt Workflow:", err);
      }
    },
    {
      // QUAN TRỌNG: chỉ định rõ timezone — cùng lý do đã giải thích ở
      // assetAlerts.cron.ts (tránh lệch giờ khi server chạy UTC).
      timezone: "Asia/Ho_Chi_Minh",
    },
  );

  console.log(
    `[cron] Đã đăng ký cron SLA duyệt Workflow (lịch: "${WORKFLOW_SLA_ALERTS_CRON_SCHEDULE}", timezone: Asia/Ho_Chi_Minh).`,
  );
};
