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
  password: z.string().min(5, "Password tối thiểu 5 ký tự"),
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
  // Giữ cùng ngưỡng tối thiểu với `LoginDTO`/`RegisterDTO` (min 5) — service
  // (`resetPassword`) hiện không tự kiểm tra độ dài, dựa hoàn toàn vào DTO.
  newPassword: z.string().min(5, "Mật khẩu mới tối thiểu 5 ký tự"),
});