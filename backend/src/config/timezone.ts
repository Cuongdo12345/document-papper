// config/timezone.ts
//
// BR-09 (DEV-097, 2026-09-29) — CỐ ĐỊNH múi giờ của process về giờ Việt Nam
// (user chọn). PHẢI là import ĐẦU TIÊN của `server.ts` (trước `app` và mọi
// module có thể tạo Date) — Node áp dụng lại `process.env.TZ` ngay khi gán,
// kể cả khi process khởi động với TZ=UTC (đã kiểm tra thực tế trên Node 22).
//
// Vì sao ép cứng thay vì đọc ENV: kế hoạch deploy chạy trên VM Linux mặc định
// UTC, quên đặt TZ là toàn bộ mốc "đầu năm/đầu tháng", mã tài liệu theo năm,
// email báo cáo tuần... lệch 7 giờ mà không có dấu hiệu gì. Hệ thống chỉ phục
// vụ 1 bệnh viện ở VN, không có nhu cầu đa múi giờ.
import { APP_TIMEZONE } from "../shared/constants/timezone.constant";

process.env.TZ = APP_TIMEZONE;
