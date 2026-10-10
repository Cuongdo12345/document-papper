// shared/cron/softwareLicenseAlerts.cron.ts
//
// DEV-116 (tách module Tài sản, GĐ 5) — cron cảnh báo bản quyền phần mềm thuê bao sắp/đã hết hạn.
import cron from "node-cron";
import { runSoftwareLicenseAlertsService } from "../../services/itDevices/softwareLicenseAlerts.service";

/** 08:25 mỗi ngày (giờ Việt Nam) — sau cron hợp đồng (08:20), cùng lý do stagger đã ghi ở `medicalDeviceAlerts.cron.ts`. */
const SOFTWARE_LICENSE_ALERTS_CRON_SCHEDULE = "25 8 * * *";

export const registerSoftwareLicenseAlertsCron = () => {
  cron.schedule(
    SOFTWARE_LICENSE_ALERTS_CRON_SCHEDULE,
    async () => {
      console.log("[cron] Bắt đầu kiểm tra cảnh báo bản quyền phần mềm sắp hết hạn...");
      try {
        const result = await runSoftwareLicenseAlertsService();
        console.log(`[cron] Hoàn tất — kiểm tra ${result.expiring.checked} bản quyền, cảnh báo ${result.expiring.notified}.`);
      } catch (err) {
        console.error("[cron] Lỗi khi chạy kiểm tra cảnh báo bản quyền phần mềm:", err);
      }
    },
    { timezone: "Asia/Ho_Chi_Minh" },
  );

  console.log(`[cron] Đã đăng ký cron cảnh báo bản quyền phần mềm (lịch: "${SOFTWARE_LICENSE_ALERTS_CRON_SCHEDULE}", timezone: Asia/Ho_Chi_Minh).`);
};
