import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { usePermission } from "@/hooks/usePermission";
import { LoadingState } from "@/components/shared/LoadingState";
import type { Permission } from "@/constants/permissions";

interface ProtectedRouteProps {
  /**
   * Permission bắt buộc — optional (route chỉ cần `authenticate`, vd
   * `/app`, `/app/profile`). Dùng đúng `user.permissions` (DEV-026), KHÔNG
   * tự tính effective permission.
   */
  permission?: Permission | Permission[];
}

/**
 * ROUTE_PERMISSION_MAP.md "Quy tắc ProtectedRoute":
 * authenticate? -> không -> /login
 * user chưa load xong (đang restore session) -> loading, KHÔNG redirect vội
 *   (tránh flash /403 sai khi `permission` được yêu cầu nhưng `user.permissions`
 *   chưa kịp về từ GET /users/me)
 * permission đủ? -> không -> /403 (KHÔNG /login — đã login, chỉ thiếu quyền)
 */
export function ProtectedRoute({ permission }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { hasAnyPermission, isLoading } = usePermission();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permission && isLoading) {
    return <LoadingState variant="spinner" fullScreen label="Đang xác thực phiên đăng nhập..." />;
  }

  if (permission) {
    const required = Array.isArray(permission) ? permission : [permission];
    if (!hasAnyPermission(required)) {
      return <Navigate to="/403" replace />;
    }
  }

  return <Outlet />;
}
