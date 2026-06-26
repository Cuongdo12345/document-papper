// src/types/auth.types.ts
// ─── Phần đã có từ LoginPage (giữ nguyên) ───────────────────────────────────

export type RoleName = 'ADMIN' | 'IT' | 'USER';

export interface AuthRole {
  _id: string;
  name: RoleName;
}

export interface AuthDepartment {
  _id: string;
  name: string;
  code: string;
}

export interface AuthUser {
  _id: string;
  username: string;
  fullName: string;
  role: AuthRole;
  department?: AuthDepartment;
  isActive: boolean;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

// ─── Thêm cho ForgotPasswordPage (SCR-02) ────────────────────────────────────

export interface ForgotPasswordPayload {
  username: string;
}

/**
 * Response khi user tồn tại + active:
 *   { message: string, resetToken: string }
 *
 * Response khi user KHÔNG tồn tại (silent 200):
 *   { message: string }             ← resetToken vắng mặt
 *
 * ⚠️ WORKAROUND: Email chưa tích hợp → resetToken trả thẳng trong body.
 * Chỉ dùng cho nội bộ / testing.
 */
export interface ForgotPasswordResponse {
  message: string;
  resetToken?: string; // optional — chỉ có khi user tồn tại
}

// ─── Thêm cho ResetPasswordPage (SCR-03) ─────────────────────────────────────

export interface ResetPasswordPayload {
  token: string;      // rawToken từ URL query param ?token=
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}