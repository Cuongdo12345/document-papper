// shared/cron/index.ts
//
// Đăng ký TOÀN BỘ cron job của hệ thống — gọi 1 LẦN DUY NHẤT trong
// `server.ts` sau khi kết nối DB thành công.
//
// File này CHỈ làm 1 việc: import + gọi từng `register...Cron()` từ các
// file `*.cron.ts` riêng lẻ. KHÔNG chứa logic cron nào của riêng nó.
//
// Tách ra file riêng (thay vì để `registerCronJobs()` nằm trong
// `assetAlerts.cron.ts` — cron job đầu tiên của dự án) để mỗi file
// `*.cron.ts` thực sự độc lập, đúng tinh thần thiết kế ban đầu: thêm 1
// cron job mới KHÔNG cần sửa bất kỳ file cron nào đã có, chỉ cần:
//   1. Tạo file `<tên>.cron.ts` mới trong thư mục này.
//   2. Thêm 1 dòng import + gọi `register<Tên>Cron()` vào `registerCronJobs()`
//      dưới đây.
// `server.ts` không cần đổi gì thêm.

import { registerAssetAlertsCron } from "./assetAlerts.cron";
import { registerMedicalDeviceAlertsCron } from "./medicalDeviceAlerts.cron";

export const registerCronJobs = () => {
  registerAssetAlertsCron();
  registerMedicalDeviceAlertsCron();
};
