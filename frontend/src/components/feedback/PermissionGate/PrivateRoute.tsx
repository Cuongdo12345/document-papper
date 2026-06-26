/**
 * PrivateRoute.tsx — CMP-31
 * Layer 7 — Route Guard
 *
 * Bảo vệ private routes theo 2 lớp:
 *   1. Authentication: chưa đăng nhập → redirect /login (lưu location)
 *   2. Authorization : không đúng role → redirect /403
 *
 * Sử dụng trong router/index.tsx:
 *   - ALL_AUTH routes  : PrivateRoute không có allowedRoles
 *   - ADMIN_ONLY routes: PrivateRoute allowedRoles={['ADMIN']}
 *   - ADMIN_IT routes  : PrivateRoute allowedRoles={['ADMIN', 'IT']}
 *
 * Nguồn route matrix: PROJECT_UNDERSTANDING.md §6.3
 *
 * Dependencies:
 *   - react-router-dom: Navigate, useLocation
 *   - ./usePermission
 *   - ./PermissionGuard.types
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermission } from './usePermission';
import type { PrivateRouteProps } from './PermissionGuard.types';

/**
 * PrivateRoute
 *
 * @example
 * // Chỉ cần đăng nhập (ALL_AUTH)
 * <Route path="/documents/*" element={<PrivateRoute><DocumentsLayout /></PrivateRoute>} />
 *
 * // ADMIN only
 * <Route path="/dashboard" element={<PrivateRoute allowedRoles={['ADMIN']}><DashboardPage /></PrivateRoute>} />
 *
 * // ADMIN + IT
 * <Route path="/departments" element={<PrivateRoute allowedRoles={['ADMIN', 'IT']}><DepartmentsPage /></PrivateRoute>} />
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/login',
  saveLocation = true,
}) => {
  const location = useLocation();
  const { isAuthenticated, hasRole } = usePermission();

  // ── Layer 1: Authentication check ──
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        // Lưu location hiện tại để redirect về sau login
        state={saveLocation ? { from: location } : undefined}
        replace
      />
    );
  }

  // ── Layer 2: Authorization check ──
  // Nếu có allowedRoles và user không có quyền → 403
  // hasRole tự handle ADMIN bypass bên trong
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
