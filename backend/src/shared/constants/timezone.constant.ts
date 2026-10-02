// shared/constants/timezone.constant.ts
//
// BR-09 (docs/31_BACKEND_CODE_REVIEW.md, DEV-097, 2026-09-29): múi giờ
// nghiệp vụ DUY NHẤT của hệ thống (bệnh viện ở Việt Nam). Dùng cho:
//   - `process.env.TZ` lúc khởi động (`config/timezone.ts`) → mọi phép tính
//     giờ địa phương trong JS (`new Date(y, m, d)`, `getFullYear()`,
//     `toLocaleDateString`...) theo giờ VN dù VM chạy UTC;
//   - `timezone` của toán tử ngày trong aggregation MongoDB (`$month`,
//     `$year`, `$dateToString`) — MongoDB mặc định UTC, KHÔNG đọc TZ của Node;
//   - mốc "Từ ngày/Đến ngày" dạng `YYYY-MM-DD` (`parseDateRangeBound`).
// Việt Nam không có giờ mùa hè → offset cố định +07:00.

export const APP_TIMEZONE = "Asia/Ho_Chi_Minh";
export const APP_UTC_OFFSET = "+07:00";
