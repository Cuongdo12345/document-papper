// src/store/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types/auth/auth.types';

// Theo STATE_MAPPING.md §2 + AUTH_MODULE_ANALYSIS.md §6
// Persist: localStorage key 'auth-storage'
// Partialize: chỉ persist user, accessToken, refreshToken — không persist actions

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Actions
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setAccessToken: (newToken: string) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      // Sau login thành công
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      // Sau refresh token thành công — KHÔNG update user/refreshToken
      setAccessToken: (newToken) => set({ accessToken: newToken }),

      // Sau PATCH /api/users/me
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : state.user,
        })),

      // Logout chủ động + force logout
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

// --- Computed Selectors (derive — không lưu vào state) ---
// Theo STATE_MAPPING.md §2 "Computed Selectors"

export const useIsAuthenticated = () =>
  useAuthStore((s) => !!s.user && !!s.accessToken);

export const useIsAdmin = () =>
  useAuthStore((s) => s.user?.role?.name === 'ADMIN');

export const useIsIT = () =>
  useAuthStore((s) => s.user?.role?.name === 'IT');

export const useIsUser = () =>
  useAuthStore((s) => s.user?.role?.name === 'USER');

export const useRoleName = () =>
  useAuthStore((s) => s.user?.role?.name ?? null);

export const useUserId = () =>
  useAuthStore((s) => s.user?._id ?? null);

export const useDepartmentId = () =>
  useAuthStore((s) => s.user?.department?._id ?? null);
