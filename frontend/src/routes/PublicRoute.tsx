import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/**
 * Route CHỈ dành cho user CHƯA đăng nhập (`/login`, `/forgot-password`...).
 * User ĐÃ đăng nhập vào các route này → redirect `/app` (tránh hiển thị lại
 * form login khi đã có session — FE-01 Mục 13/33/45).
 */
export function PublicRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
