// shared/cron/weeklyReport.cron.ts
//
// Roadmap B7 (2026-09-18) — đăng ký cron job gửi báo cáo tuần. Mirror ĐÚNG
// cấu trúc `contractAlerts.cron.ts`. KHÁC mọi cron job khác trong hệ thống
// (đều chạy HÀNG NGÀY) — đây là job ĐẦU TIÊN chạy theo TUẦN.

import cron from "node-cron";
import { sendWeeklyReportsService } from "../../services/dashboard/weeklyReport.service";

/**
 * Giờ chạy: 08:30 sáng thứ Hai hàng tuần (giờ server) — SAU mọi cron hàng
 * ngày khác (08:00→08:20), cùng lý do stagger đã giải thích ở
 * `contractAlerts.cron.ts`. Cron expression "30 8 * * 1" = phút 30, giờ 8,
 * mọi ngày trong tháng, mọi tháng, thứ 1 (1 = Thứ Hai trong node-cron).
 */
const WEEKLY_REPORT_CRON_SCHEDULE = "30 8 * * 1";

export const registerWeeklyReportCron = () => {
  cron.schedule(
    WEEKLY_REPORT_CRON_SCHEDULE,
    async () => {
      console.log("[cron] Bắt đầu gửi báo cáo tuần...");
      try {
        const result = await sendWeeklyReportsService();
        console.log(
          `[cron] Hoàn tất báo cáo tuần — đã gửi ${result.sent}, lỗi ${result.failed}, bỏ qua ${result.skipped}.`,
        );
      } catch (err) {
        // KHÔNG throw — cùng lý do đã giải thích ở assetAlerts.cron.ts:
        // 1 lần cron lỗi không được làm crash cả server.
        console.error("[cron] Lỗi khi gửi báo cáo tuần:", err);
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    },
  );

  console.log(
    `[cron] Đã đăng ký cron báo cáo tuần (lịch: "${WEEKLY_REPORT_CRON_SCHEDULE}", timezone: Asia/Ho_Chi_Minh).`,
  );
};
