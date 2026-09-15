import { create } from "zustand";
import type { LoginUser } from "@/types/auth.types";

/**
 * Auth/Session store — CHỈ 2 nhóm client state cho phép trong Zustand
 * (STATE_MAPPING.md Mục 2, FE_FOUNDATION_SPEC.md Mục 10). KHÔNG lưu server
 * state (danh sách/detail data) ở đây.
 *
 * `accessToken` in-memory, mất khi reload (phải refresh lại qua
 * refreshToken ở localStorage — utils/tokenStorage.ts).
 */
interface AuthState {
  accessToken: string | null;
  user: LoginUser | null;
  isAuthenticated: boolean;
  /**
   * true CHO TỚI KHI bootstrap session-restore (`hooks/useAuthBootstrap.ts`)
   * chạy xong lúc app khởi động — FE-01 MICRO-FIX (Session Restore). Route
   * guard (`ProtectedRoute`/`PublicRoute`/`RootRedirect`) KHÔNG dùng field
   * này trực tiếp — `App.tsx` chặn render `RouterProvider` cho tới khi
   * `false`, tránh redirect `/login` sai khi accessToken (in-memory) chưa
   * kịp restore từ refreshToken (localStorage).
   */
  isInitializing: boolean;
  setAccessToken: (token: string | null) => void;
  setUser: (user: LoginUser | null) => void;
  setInitializing: (isInitializing: boolean) => void;
  login: (accessToken: string, user: LoginUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isInitializing: true,

  setAccessToken: (accessToken) => set({ accessToken, isAuthenticated: !!accessToken }),

  setUser: (user) => set({ user }),

  setInitializing: (isInitializing) => set({ isInitializing }),

  login: (accessToken, user) => set({ accessToken, user, isAuthenticated: true }),

  logout: () => set({ accessToken: null, user: null, isAuthenticated: false }),
}));

/**
 * Đọc accessToken NGOÀI React component (vd trong axios interceptor) —
 * KHÔNG dùng hook `useAuthStore()` (hook chỉ dùng được trong component/hook).
 */
export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}
