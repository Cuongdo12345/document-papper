// src/router/guards/AuthRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

// Theo AUTH_MODULE_ANALYSIS.md §8.1 — Public Route guard
// Dùng cho: /login, /forgot-password, /reset-password
// isAuthenticated → redirect theo role; chưa login → render AuthLayout + page

export default function AuthRoute() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = !!user && !!accessToken;

  if (isAuthenticated) {
    const target =
      user!.role.name === 'ADMIN' ? '/dashboard' : '/documents/proposals';
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
