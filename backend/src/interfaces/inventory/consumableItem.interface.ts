import type { Types } from "mongoose";

/**
 * Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15) — module MỚI, tách biệt
 * hoàn toàn với `Asset` (tài sản cố định, có vòng đời assign/transfer/return
 * theo từng ĐƠN VỊ). Vật tư tiêu hao (giấy in, khẩu trang, vật tư y tế dùng
 * 1 lần...) có bản chất khác: theo dõi SỐ LƯỢNG TỒN KHO, không phải "1 tài
 * sản có ID theo dõi trọn đời" — không gò vào model `Asset` hiện tại (tránh
 * lặp lại kiểu lỗi model quá tải đã thấy ở `WorkflowInstance.steps[].role`
 * free string).
 *
 * Phạm vi đã xác nhận với user trước khi code:
 * - Tồn kho theo TỪNG khoa/phòng ban riêng (field `department`, giống
 *   Asset/User) — KHÔNG dùng 1 kho tổng chung.
 * - ĐẦY ĐỦ lịch sử giao dịch nhập/xuất — xem `IConsumableTransaction`, tồn
 *   kho hiện tại (`quantityOnHand`) được CẬP NHẬT TRỰC TIẾP mỗi giao dịch
 *   trong 1 transaction Mongo (không tính lại bằng cách SUM toàn bộ lịch sử
 *   mỗi lần đọc — hiệu năng tốt hơn, giao dịch là NGUỒN SỰ THẬT cho lịch sử,
 *   `quantityOnHand` là running balance đã được đối chiếu).
 * - CÓ cảnh báo tồn kho thấp tự động qua cron + Notification — xem
 *   `consumableAlerts.service.ts`.
 */
export interface IConsumableItem {
  name: string;
  unit: string; // đơn vị tính: cái, hộp, gói, chai, thùng...
  // ⚠️ SỬA (2026-09-16): TỪNG là text tự do (quyết định B3 gốc: "tránh
  // over-engineer khi chưa có nhu cầu quản lý category độc lập"). User xác
  // nhận nhu cầu đó ĐÃ CÓ (nhiều loại vật tư, cần nhóm có phân cấp cha/con)
  // — đổi sang ref `ConsumableCategory` (xem `consumableCategory.interface.ts`),
  // validate tồn tại/active ở service (mirror `department`).
  category?: Types.ObjectId; // ref ConsumableCategory — tuỳ chọn (vật tư có thể chưa phân nhóm)
  department: Types.ObjectId; // ref Department — 1 item = tồn kho của 1 khoa/phòng ban cụ thể

  quantityOnHand: number; // running balance — luôn khớp SUM(transactions) của item này
  minStockThreshold: number; // ngưỡng cảnh báo tồn kho thấp

  // Đánh dấu ĐÃ GỬI cảnh báo tồn kho thấp — gửi ĐÚNG 1 LẦN cho tới khi
  // được nhập thêm vượt ngưỡng (reset về null) — cùng pattern
  // `warrantyAlertSentAt` ở `assetAlerts.service.ts`, tránh spam mỗi ngày
  // trong khi vẫn đang chờ nhập hàng.
  lowStockAlertSentAt?: Date | null;

  isActive: boolean; // false = ngừng theo dõi (không xoá cứng, giữ lịch sử giao dịch)

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}
