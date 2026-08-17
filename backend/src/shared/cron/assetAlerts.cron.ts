// shared/cron/assetAlerts.cron.ts
//
// GIAI ĐOẠN 4 — đăng ký cron job chạy `runAssetAlertsService` mỗi ngày.
//
// File này CHỦ Ý CHỈ lo đúng 1 việc: định nghĩa + đăng ký cron cảnh báo
// Asset. KHÔNG còn giữ hàm tổng `registerCronJobs()` như trước (đã tách
// sang `shared/cron/index.ts`) — sửa đúng nợ kỹ thuật đã phát hiện khi
// review Giai đoạn 3 (module Quản lý Thiết bị Y tế): trước đây hàm tổng
// nằm ngay trong file cron ĐẦU TIÊN, khiến mọi cron thêm sau đó đều phải
// quay lại sửa file này — ngược với đúng ý định ban đầu (mỗi file
// `*.cron.ts` độc lập, không phải sửa lẫn nhau). Xem `shared/cron/index.ts`
// để biết nơi đăng ký cron mới trong tương lai.

import cron from "node-cron";
import { runAssetAlertsService } from "../../services/assets/assetDevice/assetAlerts.service";

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