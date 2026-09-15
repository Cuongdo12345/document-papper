import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { tokenStorage } from "@/utils/tokenStorage";
import { refreshAccessToken } from "@/api/axios";

/**
 * Module-level singleton promise — tránh chạy bootstrap 2 lần khi React
 * StrictMode (dev) double-invoke `useEffect` (mount→unmount→mount), tương tự
 * mục đích `refreshPromise` trong `api/axios.ts` (1 lần gọi thật dù effect
 * chạy nhiều lần).
 */
let bootstrapPromise: Promise<void> | null = null;

function runBootstrap(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const refreshTokenValue = tokenStorage.getRefreshToken();
    // Không có refreshToken (chưa từng đăng nhập / đã logout) → không có gì
    // để restore, giữ nguyên unauthenticated, KHÔNG gọi API thừa.
    if (!refreshTokenValue) return;

    try {
      // refreshAccessToken() tự setAccessToken() vào authStore khi thành
      // công → isAuthenticated=true → useCurrentUser() (enabled theo
      // isAuthenticated) tự fetch GET /users/me ngay khi router render.
      await refreshAccessToken();
    } catch {
      // refreshToken hết hạn/không hợp lệ — clear để lần sau khỏi thử lại,
      // giữ trạng thái unauthenticated (KHÔNG throw tiếp, KHÔNG loop).
      useAuthStore.getState().logout();
      tokenStorage.clearRefreshToken();
    }
  })();

  return bootstrapPromise;
}

/**
 * FE-01 MICRO-FIX — Session Restore bootstrap.
 *
 * Chạy ĐÚNG 1 LẦN lúc app khởi động (gọi từ `App.tsx`, TRƯỚC khi
 * `RouterProvider` render): nếu có `refreshToken` hợp lệ trong
 * localStorage, đổi lấy `accessToken` mới TRƯỚC KHI route guard
 * (`ProtectedRoute`/`PublicRoute`/`RootRedirect`) đọc `isAuthenticated` để
 * quyết định điều hướng.
 *
 * Trước fix này KHÔNG có bước nào tương đương — `ProtectedRoute` redirect
 * `/login` NGAY LẬP TỨC (đồng bộ) khi `accessToken` in-memory rỗng sau
 * reload, dù `refreshToken` vẫn còn hạn; không request nào kịp bắn ra để
 * kích hoạt refresh-lock 401 của axios (`useCurrentUser()` cũng bị
 * `enabled:false` nên không tự fetch). Xem
 * `docs/frontend/phases/FE-01_MICRO_FIX_SESSION_RESTORE.md`.
 *
 * @returns `isInitializing` — true khi đang chờ bootstrap xong.
 */
export function useAuthBootstrap(): boolean {
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const setInitializing = useAuthStore((s) => s.setInitializing);

  useEffect(() => {
    runBootstrap().finally(() => setInitializing(false));
  }, [setInitializing]);

  return isInitializing;
}
