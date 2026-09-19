// shared/cron/contractAlerts.cron.ts
//
// Roadmap B4 (Quản lý nhà cung cấp & hợp đồng bảo trì, 2026-09-16) — đăng ký
// cron job chạy `runContractAlertsService` mỗi ngày. Mirror đúng cấu trúc
// `assetAlerts.cron.ts`/`consumableAlerts.cron.ts`.

import cron from "node-cron";
import { runContractAlertsService } from "../../services/vendors/contractAlerts.service";

/**
 * Giờ chạy: 08:20 sáng mỗi ngày (giờ server) — SAU cron Asset (08:00),
 * Medical Device (08:05), Workflow SLA (08:10), Consumable (08:15) 5 phút,
 * cùng lý do stagger đã giải thích ở `medicalDeviceAlerts.cron.ts`.
 */
const CONTRACT_ALERTS_CRON_SCHEDULE = "20 8 * * *";

export const registerContractAlertsCron = () => {
  cron.schedule(
    CONTRACT_ALERTS_CRON_SCHEDULE,
    async () => {
      console.log("[cron] Bắt đầu kiểm tra cảnh báo hợp đồng sắp hết hạn...");
      try {
        const result = await runContractAlertsService();
        console.log(
          `[cron] Hoàn tất — kiểm tra ${result.expiring.checked} hợp đồng, cảnh báo ${result.expiring.notified}.`,
        );
      } catch (err) {
        // KHÔNG throw — cùng lý do đã giải thích ở assetAlerts.cron.ts:
        // 1 lần cron lỗi không được làm crash cả server.
        console.error("[cron] Lỗi khi chạy kiểm tra cảnh báo hợp đồng sắp hết hạn:", err);
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    },
  );

  console.log(
    `[cron] Đã đăng ký cron cảnh báo hợp đồng sắp hết hạn (lịch: "${CONTRACT_ALERTS_CRON_SCHEDULE}", timezone: Asia/Ho_Chi_Minh).`,
  );
};
