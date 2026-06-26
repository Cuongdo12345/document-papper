// src/router/guards/PrivateRoute.tsx
//
// Guard bảo vệ tất cả private pages (SCR-04 đến SCR-28).
//
// Logic (AUTH_MODULE_ANALYSIS.md §8.2):
//   isAuthenticated?
//   ├── NO  → Navigate('/login', state: { from: currentLocation })
//   └── YES → allowedRoles defined?
//               ├── NO  → Render page (all auth users)
//               └── YES → hasRole(allowedRoles)?
//                           ├── YES → Render page
//                           └── NO  → Navigate('/403')
//
// Dùng ở: Tất cả protected routes trong app.routes.tsx (chưa build)

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission/usePermission';
import type { RoleName } from '../../types/auth/auth.types';

interface PrivateRouteProps {
  /*
   * Danh sách role được phép vào route này.
   * undefined = tất cả authenticated users.
   *
   * AUTH_MODULE_ANALYSIS.md §7.5:
   *   allowedRoles={['ADMIN']}         → /dashboard, /users/*, /rbac/*, /system/*
   *   allowedRoles={['ADMIN', 'IT']}   → /departments/*, /audit
   *   allowedRoles={undefined}         → /documents/*, /workflow/*, /profile/*
   */
  allowedRoles?: RoleName[];
}

export function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const location                        = useLocation();
  const { isAuthenticated, hasRole } = usePermission();

  // ── Chưa đăng nhập → redirect /login, lưu from location ──────────────────
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // ── Đã đăng nhập nhưng sai role → redirect /403 ───────────────────────────
  if (allowedRoles !== undefined && !hasRole(allowedRoles)) {
    return <Navigate to="/403" replace />;
  }

  // ── Pass — render page ─────────────────────────────────────────────────────
  return <Outlet />;
}
