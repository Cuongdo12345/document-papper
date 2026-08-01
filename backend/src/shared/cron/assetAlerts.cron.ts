// shared/cron/assetAlerts.cron.ts
//
// GIAI ĐOẠN 4 — đăng ký cron job chạy `runAssetAlertsService` mỗi ngày.
//
// Đây là cron job ĐẦU TIÊN của project (chưa có `node-cron` trước đó) —
// nên file này CHỦ Ý đứng riêng, không gộp vào bất kỳ file khởi động nào
// khác, để nếu sau này cần thêm cron job khác (VD dọn Notification cũ,
// đóng kỳ báo cáo tháng...) thì chỉ cần thêm 1 file `*.cron.ts` mới cạnh
// đây và import vào `registerCronJobs()`, không phải sửa lại file này.

import cron from "node-cron";
import { runAssetAlertsService } from "../../services/assets/assetAlerts.service";

/**
 * Giờ chạy: 08:00 sáng mỗi ngày (giờ server). Chọn 08:00 vì đây là giờ bắt
 * đầu ca hành chính — nhân viên IT sẽ thấy notification/email ngay khi vào
 * làm, không phải cảnh báo giữa đêm không ai xử lý kịp.
 *
 * Đổi lịch chạy: sửa chuỗi cron bên dưới (cú pháp chuẩn 5 field: phút giờ
 * ngày-trong-tháng tháng ngày-trong-tuần).
 */
const ASSET_ALERTS_CRON_SCHEDULE = "0 8 * * *";

export const registerAssetAlertsCron = () => {
  cron.schedule(
    ASSET_ALERTS_CRON_SCHEDULE,
    async () => {
      console.log("[cron] Bắt đầu kiểm tra cảnh báo bảo hành/bảo trì Asset...");
      try {
        const result = await runAssetAlertsService();
        console.log(
          `[cron] Hoàn tất — bảo hành: kiểm tra ${result.warranty.checked}, gửi ${result.warranty.notified}; ` +
            `bảo trì quá hạn: kiểm tra ${result.maintenance.checked}, gửi ${result.maintenance.notified}.`,
        );
      } catch (err) {
        // KHÔNG throw — 1 lần cron chạy lỗi không được làm crash cả server
        // (cron chạy nền, không có request/response nào để trả lỗi về).
        console.error("[cron] Lỗi khi chạy cảnh báo Asset:", err);
      }
    },
    {
      // QUAN TRỌNG: chỉ định rõ timezone — nếu không, node-cron dùng giờ hệ
      // điều hành của server. Nhiều môi trường cloud (VD container Docker
      // mặc định) chạy giờ UTC, khi đó "0 8 * * *" sẽ chạy lúc 8h UTC =
      // 15h chiều giờ Việt Nam (UTC+7), SAI hoàn toàn so với ý định "8h
      // sáng đầu giờ hành chính". Ép cứng timezone để đảm bảo đúng giờ dù
      // server host ở đâu.
      timezone: "Asia/Ho_Chi_Minh",
    },
  );

  console.log(
    `[cron] Đã đăng ký cron cảnh báo bảo hành/bảo trì Asset (lịch: "${ASSET_ALERTS_CRON_SCHEDULE}", timezone: Asia/Ho_Chi_Minh).`,
  );
};

/**
 * Đăng ký TOÀN BỘ cron job của hệ thống — gọi 1 LẦN DUY NHẤT trong
 * `server.ts` sau khi kết nối DB thành công. Thêm cron job mới trong
 * tương lai: thêm 1 dòng `register...Cron()` khác vào đây, không sửa
 * `server.ts`.
 */
export const registerCronJobs = () => {
  registerAssetAlertsCron();
};