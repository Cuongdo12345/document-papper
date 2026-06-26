// src/schemas/auth.schema.ts
// ─── Phần đã có từ LoginPage (giữ nguyên) ───────────────────────────────────
import { z } from 'zod';

const usernameSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập tên đăng nhập');

const passwordSchema = z.string().min(1, 'Vui lòng nhập mật khẩu');

// Tách riêng để dùng .safeParse() độc lập trong ResetPasswordPage
// (resetPasswordSchema dùng .refine() → trở thành ZodEffects → mất .shape)
export const newPasswordSchema = z
  .string()
  .min(1, 'Vui lòng nhập mật khẩu mới')
  .min(5, 'Mật khẩu phải có ít nhất 5 ký tự');

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Thêm cho ForgotPasswordPage (SCR-02) ────────────────────────────────────

/**
 * Chỉ validate non-empty + trim.
 * Backend luôn trả 200 dù user không tồn tại (chống enumeration)
 * → client không cần validate format username.
 */
export const forgotPasswordSchema = z.object({
  username: usernameSchema,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// ─── Reset Password ───────────────────────────────────────────────────────────
 
/**
 * Tách base object ra khỏi .refine() để .shape vẫn accessible.
 *
 * resetPasswordSchema (ZodEffects sau .refine) → KHÔNG có .shape
 * baseResetPasswordSchema (ZodObject)          → CÓ .shape → dùng trong Form validator
 *
 * Cách dùng trong component:
 *   baseResetPasswordSchema.shape.newPassword.safeParse(value)  ← validator field
 *   resetPasswordSchema.safeParse(fullObject)                   ← validate toàn form nếu cần
 */
export const resetPasswordSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });
 
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;