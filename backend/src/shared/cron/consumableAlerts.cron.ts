// shared/cron/consumableAlerts.cron.ts
//
// Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15) — đăng ký cron job chạy
// `runConsumableAlertsService` mỗi ngày. Mirror đúng cấu trúc
// `assetAlerts.cron.ts`/`workflowSlaAlerts.cron.ts`.

import cron from "node-cron";
import { runConsumableAlertsService } from "../../services/inventory/consumableAlerts.service";

/**
 * Giờ chạy: 08:15 sáng mỗi ngày (giờ server) — SAU cron Asset (08:00),
 * Medical Device (08:05), Workflow SLA (08:10) 5 phút, cùng lý do stagger
 * đã giải thích ở `medicalDeviceAlerts.cron.ts`.
 */
const CONSUMABLE_ALERTS_CRON_SCHEDULE = "15 8 * * *";

export const registerConsumableAlertsCron = () => {
  cron.schedule(
    CONSUMABLE_ALERTS_CRON_SCHEDULE,
    async () => {
      console.log("[cron] Bắt đầu kiểm tra cảnh báo tồn kho thấp...");
      try {
        const result = await runConsumableAlertsService();
        console.log(
          `[cron] Hoàn tất — kiểm tra ${result.lowStock.checked} vật tư, cảnh báo ${result.lowStock.notified}.`,
        );
      } catch (err) {
        // KHÔNG throw — cùng lý do đã giải thích ở assetAlerts.cron.ts:
        // 1 lần cron lỗi không được làm crash cả server.
        console.error("[cron] Lỗi khi chạy kiểm tra cảnh báo tồn kho thấp:", err);
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    },
  );

  console.log(
    `[cron] Đã đăng ký cron cảnh báo tồn kho thấp (lịch: "${CONSUMABLE_ALERTS_CRON_SCHEDULE}", timezone: Asia/Ho_Chi_Minh).`,
  );
};
