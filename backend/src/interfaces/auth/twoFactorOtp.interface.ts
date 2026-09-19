import type { Document, Types } from "mongoose";

/**
 * Roadmap C1 (Xác thực 2 lớp qua email OTP, DEV-068, 2026-09-19) — 1 bản ghi
 * mã OTP 6 số, DÙNG CHUNG cho 2 luồng: (a) bước 2 khi ĐĂNG NHẬP (user đã bật
 * 2FA), (b) bước xác nhận khi BẬT 2FA lần đầu (`auths.service.ts::login()`/
 * `verifyLoginOtpService()`/`confirmEnableTwoFactorService()`). Mirror ĐÚNG
 * `IPasswordResetToken` (cùng vòng đời tạo/hết hạn/dùng 1 lần) — KHÁC ở chỗ
 * lưu `codeHash` bằng bcrypt (không phải SHA-256 như `PasswordResetToken`):
 * `hashResetToken()` (SHA-256, không salt) chỉ an toàn cho token entropy cao
 * (32 byte ngẫu nhiên) — mã OTP chỉ 6 chữ số (1 triệu khả năng), SHA-256
 * không salt sẽ bị brute-force ngay nếu DB lộ; bcrypt (cost 10, cùng mức
 * dùng cho password) mới phù hợp cho input entropy thấp.
 */
export interface ITwoFactorOtp extends Document {
  user: Types.ObjectId;
  codeHash: string;
  expiresAt: Date;
  used: boolean;
  /** Số lần nhập sai — chặn brute-force 6 số (tối đa 5 lần, xem `auths.service.ts`). */
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}
