/**
 * PermissionGuard.types.ts
 *
 * Types cho toàn bộ Permission Guard system:
 *   - Route Protection  (PrivateRoute, RoleRoute, AuthRoute)
 *   - Component Protection (PermissionGate)
 *   - Hook types (usePermission)
 *
 * Nguồn thiết kế:
 *   PROJECT_UNDERSTANDING.md §5 User Roles
 *   PROJECT_UNDERSTANDING.md §6 Permission Model
 *   STATE_MAPPING.md §2 Auth Store + §3 Permission Store
 *   SHARED_COMPONENTS_IMPLEMENTATION.md §6.1 usePermission HK-01
 *
 * Quyết định thiết kế quan trọng (từ STATE_MAPPING.md §3):
 *   - Frontend KHÔNG check permission string — chỉ check role name
 *   - Lý do: 5 bug mismatch (DOCUMENT_READ vs DOCUMENT_VIEW...) khiến
 *     permission string check không đáng tin cậy
 *   - ADMIN bypass tất cả checks (mirror backend behavior)
 *   - Tất cả guard đều đọc từ auth.store — single source of truth
 */

import type { ReactNode } from 'react';

// ─────────────────────────────────────────────
// Role Types
// ─────────────────────────────────────────────

/**
 * 3 roles cố định trong hệ thống.
 * Nguồn: PROJECT_UNDERSTANDING.md §5
 */
export type Role = 'ADMIN' | 'IT' | 'USER';

// ─────────────────────────────────────────────
// Route Group Types
// Nguồn: PROJECT_UNDERSTANDING.md §6.3
// ─────────────────────────────────────────────

/**
 * Phân nhóm routes theo quyền truy cập:
 *
 *  ADMIN_ONLY    : /dashboard, /users/*, /rbac/*, /system/*, /audit/dashboard
 *  ADMIN_IT      : /departments, /departments/*, /audit (list)
 *  ALL_AUTH      : /documents/*, /workflow/*, /profile/*
 *  PUBLIC        : /login, /forgot-password, /reset-password
 */
export type RouteGroup = 'ADMIN_ONLY' | 'ADMIN_IT' | 'ALL_AUTH' | 'PUBLIC';

// ─────────────────────────────────────────────
// usePermission Hook Return Type
// Nguồn: SHARED_COMPONENTS_IMPLEMENTATION.md §6.1
// ─────────────────────────────────────────────

export interface UsePermissionReturn {
  /**
   * Kiểm tra user hiện tại có thuộc một trong các roles được truyền không.
   * ADMIN luôn trả về true (bypass), kể cả khi roles không bao gồm ADMIN.
   */
  hasRole: (roles: Role[]) => boolean;

  /** true nếu role === 'ADMIN' */
  isAdmin: boolean;

  /** true nếu role === 'IT' */
  isIT: boolean;

  /** true nếu role === 'USER' */
  isUser: boolean;

  /** Tên role hiện tại, null nếu chưa đăng nhập */
  roleName: Role | null;

  /** `_id` của user hiện tại, null nếu chưa đăng nhập */
  userId: string | null;

  /**
   * `_id` của phòng ban user hiện tại.
   * null nếu user là ADMIN (không thuộc phòng ban) hoặc chưa đăng nhập.
   */
  departmentId: string | null;

  /** true nếu !!user && !!accessToken */
  isAuthenticated: boolean;
}

// ─────────────────────────────────────────────
// PrivateRoute Props
// ─────────────────────────────────────────────

export interface PrivateRouteProps {
  /** Nội dung cần bảo vệ */
  children: ReactNode;

  /**
   * Roles được phép vào route này.
   * Không truyền = chỉ cần đăng nhập (ALL_AUTH).
   * ADMIN luôn có quyền dù không nằm trong danh sách.
   */
  allowedRoles?: Role[];

  /**
   * Đường dẫn redirect khi chưa đăng nhập.
   * Mặc định: '/login'
   */
  redirectTo?: string;

  /**
   * Lưu lại location hiện tại vào state khi redirect /login.
   * Sau khi đăng nhập → navigate về đây.
   * Mặc định: true
   */
  saveLocation?: boolean;
}

// ─────────────────────────────────────────────
// AuthRoute Props (Public-only guard)
// ─────────────────────────────────────────────

export interface AuthRouteProps {
  /** Nội dung public (login page, forgot page...) */
  children: ReactNode;

  /**
   * Đường dẫn redirect khi đã đăng nhập.
   * Nếu không truyền → redirect theo role:
   *   ADMIN → /dashboard
   *   IT/USER → /documents/proposals
   */
  redirectTo?: string;
}

// ─────────────────────────────────────────────
// PermissionGate Props (Component-level protection)
// ─────────────────────────────────────────────

export interface PermissionGateProps {
  /** Nội dung cần bảo vệ */
  children: ReactNode;

  /**
   * Roles được phép thấy children.
   * ADMIN luôn pass dù không có trong danh sách.
   */
  roles?: Role[];

  /**
   * Nội dung render khi không có quyền.
   * Không truyền → render null (ẩn hoàn toàn).
   * Truyền JSX → render fallback đó (e.g. disabled button, tooltip).
   */
  fallback?: ReactNode;

  /**
   * Nếu true → render children nhưng disabled thay vì ẩn đi.
   * Yêu cầu: children phải là AntD component có prop `disabled`.
   * Dùng khi muốn hiển thị button xám với tooltip thay vì ẩn hoàn toàn.
   * Mặc định: false
   */
  disabledFallback?: boolean;
}
