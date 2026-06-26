// src/hooks/usePermission.ts
//
// Hook tập trung các computed permission selector từ auth.store.
// Tất cả giá trị là DERIVE — không tạo state mới, không gọi API thêm.
// Dùng ở: AuthRoute, PrivateRoute, UnauthorizedPage, SidebarMenu, PermissionGate

import { useAuthStore } from '../../store/auth.store';
import type { RoleName } from '../../types/auth/auth.types';

export interface UsePermissionReturn {
  // ── Auth ──────────────────────────────────────────────────────────────────
  isAuthenticated: boolean;

  // ── Role booleans ─────────────────────────────────────────────────────────
  isAdmin: boolean;
  isIT: boolean;
  isUser: boolean;

  // ── Raw values ────────────────────────────────────────────────────────────
  roleName: RoleName | null;
  userId: string | null;
  departmentId: string | null;

  // ── Utility ───────────────────────────────────────────────────────────────
  /** Kiểm tra user có thuộc 1 trong các role được chỉ định không */
  hasRole: (roles: RoleName[]) => boolean;

  /** Navigate target dựa theo role — dùng cho "Về trang chủ" logic */
  homeRoute: '/dashboard' | '/documents/proposals' | '/login';
}

export const usePermission = (): UsePermissionReturn => {
  const user        = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const isAuthenticated = !!user && !!accessToken;
  const roleName        = (user?.role?.name ?? null) as RoleName | null;

  const isAdmin = roleName === 'ADMIN';
  const isIT    = roleName === 'IT';
  const isUser  = roleName === 'USER';

  const hasRole = (roles: RoleName[]) =>
    roleName !== null && roles.includes(roleName);

  const homeRoute = !isAuthenticated
    ? '/login'
    : isAdmin
    ? '/dashboard'
    : '/documents/proposals';

  return {
    isAuthenticated,
    isAdmin,
    isIT,
    isUser,
    roleName,
    userId:       user?._id         ?? null,
    departmentId: user?.department?._id ?? null,
    hasRole,
    homeRoute,
  };
};
