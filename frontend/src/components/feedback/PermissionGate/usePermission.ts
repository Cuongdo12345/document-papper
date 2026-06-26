/**
 * usePermission.ts — HK-01
 * Layer 0 Hook (phụ thuộc: auth.store only)
 *
 * Cung cấp role-check helpers từ auth.store.
 * Tất cả PermissionGate, conditional buttons, và route guards
 * dùng hook này — không đọc store trực tiếp trong component.
 *
 * Quyết định thiết kế (STATE_MAPPING.md §3):
 *   - Không check permission string — chỉ check role name
 *   - ADMIN bypass TẤT CẢ checks (hasRole luôn true với ADMIN)
 *   - Derive tất cả từ auth.store.user.role.name
 *   - Không có side effect, không gọi API
 *
 * Dependencies:
 *   - store/auth.store.ts (Zustand)
 *   - ./PermissionGuard.types
 */

import { useAuthStore } from '../../../store/auth.store';
import type { Role, UsePermissionReturn } from './PermissionGuard.types';

/**
 * usePermission — HK-01
 *
 * @example
 * const { isAdmin, hasRole, departmentId } = usePermission()
 *
 * // Check role
 * if (hasRole(['ADMIN', 'IT'])) { ... }
 *
 * // Trong JSX
 * {isAdmin && <Button danger>Xóa</Button>}
 *
 * // Lấy departmentId để filter document theo phòng ban
 * const myDeptId = departmentId
 */
export function usePermission(): UsePermissionReturn {
  // Đọc trực tiếp từ store — không subscribe toàn bộ store
  // để tránh re-render không cần thiết
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  // ── Derived values ──
  const isAuthenticated = !!user && !!accessToken;
  const roleName = (user?.role?.name ?? null) as Role | null;

  const isAdmin = roleName === 'ADMIN';
  const isIT    = roleName === 'IT';
  const isUser  = roleName === 'USER';

  const userId       = user?._id ?? null;
  const departmentId = user?.department?._id ?? null;

  /**
   * hasRole — Kiểm tra user có thuộc một trong các roles không.
   *
   * Logic (từ SHARED_COMPONENTS_IMPLEMENTATION.md §6.1):
   *   1. Nếu chưa đăng nhập → false
   *   2. Nếu ADMIN → true (bypass, mirror backend behavior)
   *   3. Kiểm tra roles.includes(roleName)
   */
  const hasRole = (roles: Role[]): boolean => {
    if (!roleName) return false;
    if (isAdmin) return true;       // ADMIN bypass
    return roles.includes(roleName);
  };

  return {
    hasRole,
    isAdmin,
    isIT,
    isUser,
    roleName,
    userId,
    departmentId,
    isAuthenticated,
  };
}
