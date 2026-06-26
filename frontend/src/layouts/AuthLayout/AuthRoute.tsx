// /**
//  * AuthRoute.tsx
//  * Router guard: chỉ cho phép user CHƯA đăng nhập truy cập.
//  *
//  * Nguồn:
//  *   LAYOUT_ARCHITECTURE.md §6 Route Protection Strategy
//  *   LAYOUT_ARCHITECTURE.md §1.4 Behaviour Rules
//  *   STATE_MAPPING.md §2 Auth Store
//  *
//  * Logic:
//  *   isAuthenticated? → redirect theo role
//  *     ADMIN        → /dashboard
//  *     IT | USER    → /documents/proposals
//  *   !isAuthenticated → render children (AuthLayout + child page)
//  *
//  * Dùng Shared Components:
//  *   - usePermission() hook (SHARED_COMPONENTS_LIBRARY §7)
//  *     → isAdmin, isAuthenticated để quyết định redirect destination
//  *
//  * Vị trí trong router:
//  *   <AuthRoute>
//  *     <AuthLayout />   ← children
//  *   </AuthRoute>
//  */

// import type { FC, ReactNode } from 'react'
// import { Navigate } from 'react-router-dom'
// import { usePermission } from '@/components/feedback/PermissionGate/usePermission'

// // ─────────────────────────────────────────────────────────────────────────────
// // Redirect targets (LAYOUT_ARCHITECTURE §6.4)
// // ─────────────────────────────────────────────────────────────────────────────

// const REDIRECT_ADMIN = '/dashboard'
// const REDIRECT_DEFAULT = '/documents/proposals'  // IT và USER

// // ─────────────────────────────────────────────────────────────────────────────
// // AuthRoute
// // ─────────────────────────────────────────────────────────────────────────────

// interface AuthRouteProps {
//   children: ReactNode
// }

// /**
//  * AuthRoute — Public-only guard.
//  *
//  * User đã đăng nhập truy cập /login, /forgot-password, /reset-password:
//  *   → Redirect về trang chính theo role (không cho xem lại login form).
//  *
//  * User chưa đăng nhập:
//  *   → Render children (AuthLayout + page).
//  *
//  * @example
//  * // router/index.tsx
//  * {
//  *   element: <AuthRoute><AuthLayout /></AuthRoute>,
//  *   children: [
//  *     { path: 'login', element: <LoginPage /> },
//  *     ...
//  *   ]
//  * }
//  */
// const AuthRoute: FC<AuthRouteProps> = ({ children }) => {
//   // Đọc auth state từ usePermission hook (wraps auth.store)
//   // Không đọc auth.store trực tiếp trong component → dùng hook theo reuse rule
//   const { isAuthenticated, isAdmin } = usePermission()

//   if (isAuthenticated) {
//     // Redirect theo role — mirror logic ở LoginPage onSuccess handler
//     const destination = isAdmin ? REDIRECT_ADMIN : REDIRECT_DEFAULT
//     return <Navigate to={destination} replace />
//   }

//   // Chưa đăng nhập → hiện auth page
//   return <>{children}</>
// }

// export default AuthRoute
