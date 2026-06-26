/**
 * AuthRoute.tsx — CMP-30
 * Layer 7 — Route Guard
 *
 * Bảo vệ public-only routes (login, forgot-password, reset-password).
 * Nếu user đã đăng nhập → redirect về home theo role.
 * Ngăn user đã login quay lại /login.
 *
 * Redirect logic:
 *   ADMIN  → /dashboard
 *   IT/USER → /documents/proposals
 *
 * Dependencies:
 *   - react-router-dom: Navigate
 *   - ./usePermission
 *   - ./PermissionGuard.types
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from './usePermission';
import type { AuthRouteProps } from './PermissionGuard.types';

/**
 * AuthRoute
 *
 * @example
 * // Wrap toàn bộ auth pages trong router
 * <Route element={<AuthRoute />}>
 *   <Route path="/login"           element={<LoginPage />} />
 *   <Route path="/forgot-password" element={<ForgotPasswordPage />} />
 *   <Route path="/reset-password"  element={<ResetPasswordPage />} />
 * </Route>
 *
 * // Hoặc từng route riêng
 * <Route
 *   path="/login"
 *   element={
 *     <AuthRoute redirectTo="/dashboard">
 *       <LoginPage />
 *     </AuthRoute>
 *   }
 * />
 */
const AuthRoute: React.FC<AuthRouteProps> = ({ children, redirectTo }) => {
  const { isAuthenticated, isAdmin } = usePermission();

  if (!isAuthenticated) {
    // Chưa đăng nhập → cho vào trang public
    return <>{children}</>;
  }

  // Đã đăng nhập → redirect về home
  const home = redirectTo ?? (isAdmin ? '/dashboard' : '/documents/proposals');
  return <Navigate to={home} replace />;
};

export default AuthRoute;
