import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import { tokenStorage } from "@/utils/tokenStorage";
import type {
  ChangePasswordRequest,
  CurrentUser,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponseData,
  LoginSuccessData,
  VerifyLoginOtpRequest,
  ConfirmTwoFactorRequest,
  DisableTwoFactorRequest,
  RefreshTokenResponseData,
  ResetPasswordRequest,
  UpdateMeRequest,
  Session,
} from "@/types/auth.types";

/**
 * API layer domain Auth — hàm thuần gọi axios, trả nguyên AxiosResponse
 * (KHÔNG unwrap ở đây — FE_FOUNDATION_SPEC.md Mục 4).
 */

export function login(body: LoginRequest): Promise<AxiosResponse<{ message: string; data: LoginResponseData }>> {
  return axiosInstance.post("/auths/login", body);
}

export function refreshToken(
  refreshTokenValue: string,
): Promise<AxiosResponse<RefreshTokenResponseData>> {
  return axiosInstance.post("/auths/refresh-token", { refreshToken: refreshTokenValue });
}

/**
 * ⚠️ FIX (2026-09-06): trước đây gọi `post("/auths/logout")` KHÔNG kèm body —
 * backend `logout()` đọc `req.body.refreshToken` không guard, `req.body`
 * undefined (không có Content-Type vì không có data) => TypeError => lọt
 * xuống nhánh 500 "UNKNOWN_ERROR" của error.middleware.ts, đồng thời
 * `RefreshToken` trong DB KHÔNG BAO GIỜ được set `revoked:true` (refresh
 * token cũ vẫn còn hiệu lực sau khi bấm "Đăng xuất"). UI vẫn "logout được"
 * chỉ vì `useLogout.ts` luôn xoá local state ở `onSettled` bất kể lỗi —
 * che mất bug thật ở tầng server. Phải gửi `refreshToken` hiện có trong body,
 * đúng shape backend đang cần để revoke.
 */
export function logout(): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.post("/auths/logout", {
    refreshToken: tokenStorage.getRefreshToken(),
  });
}

/**
 * GET /users/me — thuộc domain Users theo API_REFERENCE.md, nhưng đặt ở đây
 * (không phải users.api.ts) vì đây là 1 phần BẮT BUỘC của auth flow (lấy
 * user + role sau khi có accessToken), tránh tạo users.api.ts đầy đủ sớm
 * khi FE-00 chưa cần domain Users (Mục 7 spec FE-00: chỉ tạo API
 * infrastructure cần thiết cho FE-00).
 */
/**
 * ⚠️ `success` trong response THẬT là STRING (message), KHÔNG phải boolean
 * (`user.controller.ts:getMe` — `res.json({success:"Lấy thông tin cá nhân
 * thành công", data:user})`) — lệch quy ước chuẩn `{success:boolean}` toàn
 * hệ thống, chưa ghi ở ERROR_HANDLING.md/API_REFERENCE.md. Không ảnh hưởng
 * `unwrapResponse()` (chỉ đọc field `data`), nhưng KHÔNG dùng field
 * `success` của response này cho logic rẽ nhánh.
 */
export function getMe(): Promise<AxiosResponse<{ success: unknown; data: CurrentUser }>> {
  return axiosInstance.get("/users/me");
}

/**
 * `PATCH /users/me` (FE-14, Profile UI) — response THẬT trả `data` là
 * document CHƯA populate role/department (`updateMeService()` không
 * `.populate()`, khác `getMe()`) — KHÔNG dùng `data` của response này để
 * cập nhật cache `["users","me"]`, luôn `invalidateQueries` để refetch lại
 * qua `getMe()` (đã populate đầy đủ + tính lại `permissions[]`).
 */
export function updateMe(body: UpdateMeRequest): Promise<AxiosResponse<{ success: boolean; message: string; data: unknown }>> {
  return axiosInstance.patch("/users/me", body);
}

/**
 * `PATCH /users/change-password` — LUÔN tự đổi mật khẩu của chính người gọi
 * (`req.user!._id`, controller không nhận id khác). Response CHỈ có
 * `{message}` (không `success`/`data`, giống `logout()`/`forgotPassword()`).
 * ⚠️ Backend thu hồi TOÀN BỘ refresh token (kể cả phiên hiện tại) ngay sau
 * khi đổi mật khẩu thành công (DEV-021/SEC-01) — nơi gọi PHẢI tự logout cục
 * bộ + điều hướng `/login` ngay sau `onSuccess`, không dựa vào 401 tự nhiên.
 */
export function changeMyPassword(body: ChangePasswordRequest): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.patch("/users/change-password", body);
}

/**
 * `POST /auths/forgot-password` — LUÔN trả 200 + CÙNG 1 message dù username
 * tồn tại hay không (chống user enumeration, AUTH_RBAC_MAP.md Mục 1.2/1.3).
 * KHÔNG có field `success`/`data` (giống `logout()`).
 */
export function forgotPassword(body: ForgotPasswordRequest): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.post("/auths/forgot-password", body);
}

/**
 * `POST /auths/reset-password` — `token` lấy từ query string link trong
 * email, hết hạn sau 15 phút (AUTH_RBAC_MAP.md Mục 1.2).
 */
export function resetPassword(body: ResetPasswordRequest): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.post("/auths/reset-password", body);
}

/* =====================================================================
   XÁC THỰC 2 LỚP (2FA qua email OTP, Roadmap C1, DEV-068, 2026-09-19)
===================================================================== */

/** Bước 2 đăng nhập khi tài khoản đã bật 2FA — luôn trả `LoginSuccessData` thật (khác `login()` có thể trả nhánh pending). */
export function verifyLoginOtp(
  body: VerifyLoginOtpRequest,
): Promise<AxiosResponse<{ message: string; data: LoginSuccessData }>> {
  return axiosInstance.post("/auths/login/verify-otp", body);
}

/** Tự bật 2FA bước 1 — gửi OTP qua email, CHƯA bật cờ (phải gọi `confirmTwoFactor` để hoàn tất). */
export function enableTwoFactor(): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.post("/auths/2fa/enable");
}

export function confirmTwoFactor(
  body: ConfirmTwoFactorRequest,
): Promise<AxiosResponse<{ message: string; data: { twoFactorEnabled: boolean } }>> {
  return axiosInstance.post("/auths/2fa/confirm", body);
}

export function disableTwoFactor(
  body: DisableTwoFactorRequest,
): Promise<AxiosResponse<{ message: string; data: { twoFactorEnabled: boolean } }>> {
  return axiosInstance.post("/auths/2fa/disable", body);
}

/* =====================================================================
   QUẢN LÝ PHIÊN ĐĂNG NHẬP (Roadmap C2, DEV-069, 2026-09-19)
===================================================================== */

export function getMySessions(): Promise<AxiosResponse<{ message: string; data: Session[] }>> {
  return axiosInstance.get("/auths/sessions");
}

export function revokeMySession(id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`/auths/sessions/${id}`);
}
