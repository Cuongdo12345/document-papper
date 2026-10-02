import type { Types } from "mongoose";

export interface IUser {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  department?: Types.ObjectId;
  role: Types.ObjectId;
  extraPermissions: Types.ObjectId[];
  denyPermissions: Types.ObjectId[];
  isActive: boolean;
  /**
   * Roadmap B7 (2026-09-18) — "Báo cáo định kỳ tự động gửi email". Opt-in
   * THẬT (khác các cảnh báo tự động khác trong hệ thống — hợp đồng/SLA/bảo
   * hành — vốn gửi cho TẤT CẢ user active theo role, không cần bật/tắt).
   * Chỉ có tác dụng với user thuộc role BAN_GIAM_DOC/TRUONG_KHOA (xem
   * `weeklyReport.service.ts`) — user role khác vẫn set được field này
   * (self-update qua `PATCH /users/me`) nhưng cron sẽ bỏ qua vì không lọc
   * đúng 2 role mục tiêu.
   */
  subscribedToWeeklyReport?: boolean;
  /**
   * Roadmap C1 (Xác thực 2 lớp qua email OTP, DEV-068, 2026-09-19) — opt-in
   * THẬT (user chọn "Tự chọn (opt-in)" qua AskUserQuestion, KHÁC "bắt buộc"),
   * chỉ THỰC SỰ có tác dụng bật được với role ADMIN/TRUONG_KHOA/
   * DIEU_DUONG_TRUONG/BAN_GIAM_DOC (xem `auths.service.ts::enableTwoFactorService`)
   * và CHỈ bật được nếu user đã có `email` (cần để gửi OTP).
   */
  twoFactorEnabled?: boolean;
  /**
   * [MỚI DEV-079] Ảnh đại diện — lưu THẲNG dạng data URI đầy đủ
   * (`data:image/<jpeg|png|webp>;base64,<...>`), KHÔNG lưu file riêng trên
   * đĩa/DB `Upload` — quyết định đã xác nhận qua AskUserQuestion: dự án
   * KHÔNG có route serving file public/static (mọi file khác đều qua
   * endpoint `/download` xác thực), nên ảnh nhỏ (giới hạn 300KB gốc, xem
   * `AVATAR_MAX_BYTES` ở `users.dto.ts`) encode thẳng base64 là cách đơn
   * giản nhất để `<img src>` dùng được ngay từ response đã xác thực sẵn
   * (`GET /users/me`, `GET /users/:id`), không cần thêm request/route nào.
   * `select: false` ở schema (giống `password`) — KHÔNG trả về mặc định ở
   * `GET /users` (list) để tránh payload phồng to, chỉ trả khi gọi tường
   * minh `.select("+avatar")` (đúng 2 nơi: `getMeService`, `getById`).
   */
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}