// shared/cron/medicalDeviceAlerts.cron.ts
//
// GIAI ĐOẠN 3 (module Quản lý Thiết bị Y tế) — đăng ký cron job chạy
// `runMedicalDeviceAlertsService` mỗi ngày. Mirror đúng cấu trúc
// `assetAlerts.cron.ts` — file này CHỦ Ý CHỈ lo đúng 1 việc (định nghĩa +
// đăng ký cron của chính module này), không giữ hàm tổng `registerCronJobs()`
// — xem `shared/cron/index.ts` để biết nơi đăng ký toàn bộ cron hệ thống.

import cron from "node-cron";
import { runMedicalDeviceAlertsService } from "../../services/assets/medicalDevice/medicalDeviceAlerts.service";

/**
 * Giờ chạy: 08:05 sáng mỗi ngày (giờ server) — chạy SAU cron cảnh báo Asset
 * (08:00) 5 phút để tránh 2 cron cùng ghi Notification/gửi email đồng thời
 * lúc hệ thống vừa khởi động ca hành chính, dù về mặt kỹ thuật 2 cron job
 * độc lập, không tranh chấp dữ liệu với nhau (khác collection).
 */
const MEDICAL_DEVICE_ALERTS_CRON_SCHEDULE = "5 8 * * *";

export const registerMedicalDeviceAlertsCron = () => {
  cron.schedule(
    MEDICAL_DEVICE_ALERTS_CRON_SCHEDULE,
    async () => {
      console.log("[cron] Bắt đầu kiểm tra cảnh báo kiểm định Thiết bị Y tế...");
      try {
        const result = await runMedicalDeviceAlertsService();
        console.log(
          `[cron] Hoàn tất — kiểm định: kiểm tra ${result.calibration.checked}, gửi ${result.calibration.notified}.`,
        );
      } catch (err) {
        // KHÔNG throw — cùng lý do đã giải thích ở assetAlerts.cron.ts:
        // 1 lần cron lỗi không được làm crash cả server.
        console.error("[cron] Lỗi khi chạy cảnh báo kiểm định Thiết bị Y tế:", err);
      }
    },
    {
      // QUAN TRỌNG: chỉ định rõ timezone — cùng lý do đã giải thích ở
      // assetAlerts.cron.ts (tránh lệch giờ khi server chạy UTC).
      timezone: "Asia/Ho_Chi_Minh",
    },
  );

  console.log(
    `[cron] Đã đăng ký cron cảnh báo kiểm định Thiết bị Y tế (lịch: "${MEDICAL_DEVICE_ALERTS_CRON_SCHEDULE}", timezone: Asia/Ho_Chi_Minh).`,
  );
};
