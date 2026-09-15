import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { env } from "@/config/env";
import { getAccessToken, useAuthStore } from "@/stores/authStore";
import { tokenStorage } from "@/utils/tokenStorage";
import type { RefreshTokenResponseData } from "@/types/auth.types";

/**
 * Axios instance DUY NHẤT toàn app — mọi api/<domain>.api.ts import instance
 * này, KHÔNG tự tạo axios instance khác. FE_FOUNDATION_SPEC.md Mục 4, 7.
 */
export const axiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
});

// ---- Request interceptor: gắn Authorization tự động ----
axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// ---- Response interceptor: refresh-lock cho 401 ----

// Đánh dấu request đã tự thêm để tránh retry vô hạn (AxiosRequestConfig gốc
// không có field này — mở rộng qua module augmentation cục bộ).
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/**
 * 1 promise dùng CHUNG cho mọi request 401 xảy ra đồng thời — tránh N request
 * 401 cùng lúc gọi N lần `/auths/refresh-token` (FE_FOUNDATION_SPEC.md Mục 7).
 * Reset về null ngay sau khi resolve/reject để lần 401 tiếp theo tạo lại.
 */
let refreshPromise: Promise<string> | null = null;

function performLogout(): void {
  useAuthStore.getState().logout();
  tokenStorage.clearRefreshToken();
  // Điều hướng — dùng window.location thay vì useNavigate() vì đây là code
  // ngoài React component tree (interceptor). ProtectedRoute (routes/) sẽ tự
  // redirect /login khi phát hiện isAuthenticated=false ở lần render kế tiếp
  // nếu app không bị full reload — giữ window.location.assign làm phương án
  // chắc chắn nhất cho FE-00 foundation.
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

/**
 * Export cho `hooks/useAuthBootstrap.ts` (FE-01 MICRO-FIX Session Restore)
 * tái sử dụng ĐÚNG hàm này ở app bootstrap — KHÔNG viết logic refresh thứ 2.
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error("Không có refreshToken để làm mới accessToken");
  }
  // Dùng axios gốc (KHÔNG dùng axiosInstance) để tránh đệ quy qua interceptor
  // này lần nữa khi tự gọi /refresh-token.
  const response = await axios.post<RefreshTokenResponseData>(
    `${env.apiBaseUrl}/auths/refresh-token`,
    { refreshToken },
  );
  const { accessToken } = response.data;
  useAuthStore.getState().setAccessToken(accessToken);
  return accessToken;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Chính request /refresh-token thất bại (401) -> logout ngay, không thử refresh lại.
    if (originalRequest.url?.includes("/auths/refresh-token")) {
      performLogout();
      return Promise.reject(error);
    }

    // Chính request /login thất bại (401 = sai username/password) -> đây KHÔNG
    // PHẢI accessToken hết hạn (chưa hề có phiên nào để refresh — lúc này
    // localStorage cũng chưa chắc có refreshToken). Phải trả THẲNG lỗi 401 gốc
    // cho LoginPage hiển thị đúng "Tên đăng nhập hoặc mật khẩu không đúng" —
    // KHÔNG được thử refresh (nếu thử, refreshAccessToken() throw Error thường
    // do thiếu refreshToken, parseApiError() hiểu nhầm thành network error).
    if (originalRequest.url?.includes("/auths/login")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      performLogout();
      return Promise.reject(refreshError);
    }
  },
);
