// src/api/services/auth.service.ts
import type { AxiosResponse } from 'axios';
import { apiClient } from '../client';
import type {
  LoginPayload,
  LoginResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
} from '../../types/auth/auth.types';

// ─── Đã có từ LoginPage (giữ nguyên) ─────────────────────────────────────────

/**
 * POST /api/auths/login
 * Public — không đính Authorization header.
 * Timeout riêng 10 000ms (ghi đè client default 15 000ms).
 */
const login = (
  payload: LoginPayload,
): Promise<AxiosResponse<LoginResponse>> => {
  return apiClient.post<LoginResponse>('/auths/login', payload, {
    timeout: 10000,
  });
};

// ─── Thêm cho ForgotPasswordPage (SCR-02) ────────────────────────────────────

/**
 * POST /api/auths/forgot-password
 * Public — không đính Authorization header.
 * Timeout: 10 000ms (auth endpoint).
 *
 * Server luôn trả 200 dù username không tồn tại (chống user enumeration).
 * `resetToken` chỉ xuất hiện trong response khi user tồn tại + active.
 *
 * Rate limit: 3 req / 15 phút / user (server-side).
 * 429 bị reject về hook layer để map vào form error.
 */
const forgotPassword = (
  payload: ForgotPasswordPayload,
): Promise<AxiosResponse<ForgotPasswordResponse>> => {
  return apiClient.post<ForgotPasswordResponse>(
    '/auths/forgot-password',
    payload,
    { timeout: 10000 },
  );
};

// ─── Thêm cho ResetPasswordPage (SCR-03) ─────────────────────────────────────

/**
 * POST /api/auths/reset-password
 * Public — không đính Authorization header.
 * Timeout: 10 000ms.
 *
 * `token` là rawToken lấy từ URL query param ?token=
 *   (server lưu SHA256(rawToken), nhận rawToken để so sánh).
 *
 * 400 → token hết hạn / đã dùng / user inactive → reject về hook layer.
 */
const resetPassword = (
  payload: ResetPasswordPayload,
): Promise<AxiosResponse<ResetPasswordResponse>> => {
  return apiClient.post<ResetPasswordResponse>(
    '/auths/reset-password',
    payload,
    { timeout: 10000 },
  );
};

export const authService = {
  login,
  forgotPassword,
  resetPassword,
};