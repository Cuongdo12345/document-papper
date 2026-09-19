import { z } from "zod";

export const LoginDTO = z.object({
  username: z.string().trim().min(3, "Username tối thiểu 3 ký tự").max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(5, "Password tối thiểu 5 ký tự"),
});

/**
 * ⚠️ MỚI: bổ sung field `email` (bắt buộc) — trước đây `RegisterDTO` không có
 * email, nhưng luồng `forgotPassword` (đã nâng cấp gửi mail thật) cần
 * `user.email` để gửi link reset. Nếu không thu thập email lúc đăng ký, user
 * đăng ký xong sẽ KHÔNG THỂ dùng tính năng quên mật khẩu. Cần xác nhận model
 * `User` có field `email` unique hay chưa (đang giả định là có).
 */
export const RegisterDTO = z.object({
  username: z.string().trim().min(3, "Username tối thiểu 3 ký tự").max(50).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
  // DEV-021/SEC-02: min(5) → min(8) — CHỈ áp dụng cho field ĐẶT MẬT KHẨU MỚI
  // (đăng ký/đổi/reset), KHÔNG đụng `LoginDTO.password` hay
  // `ChangePasswordDTO.oldPassword` (xác thực mật khẩu CŨ đã tồn tại) — nâng
  // ngưỡng ở đó sẽ khoá đăng nhập của user có mật khẩu 5-7 ký tự tạo dưới
  // policy cũ.
  password: z.string().min(8, "Password tối thiểu 8 ký tự"),
  confirmPassword: z.string(),
  fullName: z.string().trim().min(1),
}).refine(data => data.password === data.confirmPassword, {
message: "Password không khớp",
  path: ["confirmPassword"],
});

export const RefreshTokenDTO = z.object({
  refreshToken: z.string().min(1),
});

/**
 * ⚠️ MỚI: `/forgot-password` và `/reset-password` trước đây KHÔNG có DTO nào
 * cả (route đọc thẳng `req.body.username`/`req.body.token`/`req.body.newPassword`
 * kiểu `any`). Bổ sung 2 schema dưới đây để gắn `validateBody` vào 2 route này,
 * đồng bộ với `LoginDTO`/`RefreshTokenDTO`.
 */
export const ForgotPasswordDTO = z.object({
  username: z.string().trim().min(1, "Username không được để trống").max(50),
});

export const ResetPasswordDTO = z.object({
  token: z.string().min(1, "Token không được để trống"),
  // DEV-021/SEC-02: min(5) → min(8), đồng bộ `RegisterDTO.password` — service
  // (`resetPassword`) hiện không tự kiểm tra độ dài, dựa hoàn toàn vào DTO.
  newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự"),
});

/**
 * Roadmap C1 (Xác thực 2 lớp qua email OTP, DEV-068, 2026-09-19).
 */
const OTP_CODE_REGEX = /^\d{6}$/;

/** BƯỚC 2 khi đăng nhập (user đã bật 2FA) — `/auths/login/verify-otp`. */
export const VerifyLoginOtpDTO = z.object({
  username: z.string().trim().min(1, "Username không được để trống"),
  code: z.string().regex(OTP_CODE_REGEX, "Mã xác thực phải gồm đúng 6 chữ số"),
});

/** Xác nhận BẬT 2FA (sau khi `enableTwoFactor` đã gửi OTP) — `/auths/2fa/confirm`. */
export const ConfirmTwoFactorDTO = z.object({
  code: z.string().regex(OTP_CODE_REGEX, "Mã xác thực phải gồm đúng 6 chữ số"),
});

/** TẮT 2FA — yêu cầu nhập lại password hiện tại — `/auths/2fa/disable`. */
export const DisableTwoFactorDTO = z.object({
  password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
});