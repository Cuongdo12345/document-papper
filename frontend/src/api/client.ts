// src/api/client.ts
import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/auth.store';
import { useNotificationStore } from '../store/notification.store';

// Theo API_LAYER_SPEC.md §13, §14, §15
// - Axios instance: baseURL từ VITE_API_BASE_URL, timeout 15000ms
// - Request interceptor: đính Authorization header từ Zustand store
// - Response interceptor: 401 → refresh token flow (Request Queue Pattern)
//                          403 → navigate /403
//                          429/500/Network → toast qua notification.store

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
     Accept: 'application/json',
    //  'Cache-Control': 'no-cache',  // ← thêm dòng này
  },
});

// ---- Request Interceptor ----
apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---- Refresh Token — Request Queue Pattern (§15.3) ----
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token as string);
  });
  failedQueue = [];
}

// ---- Response Interceptor ----
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { push } = useNotificationStore.getState();
    const originalRequest = error.config;

    // Network error (no response)
    if (!error.response) {
      push('error', 'Không có kết nối internet');
      return Promise.reject(error);
    }

    const { status } = error.response;

    // 401 — refresh token flow
    if (status === 401 && originalRequest && !(originalRequest as any)._retry) {
      // Login request sai mật khẩu → trả thẳng về mutation, không chạy refresh
      if (originalRequest.url?.includes('/auths/login')) {
        return Promise.reject(error);
      }

      const { refreshToken, setAccessToken, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          (originalRequest as any)._retry = true;
          originalRequest.headers!.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      isRefreshing = true;

      try {
        const { data } = await apiClient.post<{ accessToken: string }>(
          '/auths/refresh-token',
          { refreshToken },
          { timeout: 10000 }
        );

        setAccessToken(data.accessToken);
        processQueue(null, data.accessToken);

        (originalRequest as any)._retry = true;
        originalRequest.headers!.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        push('warning', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 — Forbidden
    if (status === 403) {
      // Login request tài khoản bị khóa → trả về mutation, không redirect /403
      if (originalRequest?.url?.includes('/auths/login')) {
        return Promise.reject(error);
      }
      window.location.href = '/403';
      return Promise.reject(error);
    }

    // 429 — Rate limit
    if (status === 429) {
      push('error', 'Quá nhiều yêu cầu. Vui lòng thử lại sau');
      return Promise.reject(error);
    }

    // 500 — Server error
    if (status >= 500) {
      push('error', 'Hệ thống đang gặp sự cố, vui lòng thử lại sau');
      return Promise.reject(error);
    }

    // 400, 404, 409 — để React Query onError / component xử lý
    return Promise.reject(error);
  }
);