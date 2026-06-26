// Snippet cần thêm vào router config hiện có (router/index.tsx hoặc tương đương)
//
// Theo LAYOUT_IMPLEMENTATION_SUMMARY.md §4.1 (bảng UTILITY) và §4.3 (Guard
// Decision Flow): "/403, * (404) → Render trực tiếp MinimalLayout (không guard)".
//
// Đặt 2 route này ở NGOÀI mọi guard (AuthRoute/PrivateRoute) — khớp đúng
// nguyên tắc route tree tại §3.1:
//   ├── /403  → MinimalLayout (SCR-30)
//   └── *     → MinimalLayout (SCR-29)

import { MinimalLayout } from '../../layouts/MinimalLayout';
import { ForbiddenPage } from './ForbiddenPage';
import { NotFoundPage } from './NotFoundPage';

export const utilityRoutes = [
  {
    // Không có guard — § 4.1 bảng UTILITY: "Không có guard"
    element: <MinimalLayout />, // không truyền props → tự render <Outlet />
    children: [
      { path: '/403', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

// ─── Cách tích hợp vào route tree gốc ──────────────────────────────────────
//
// const router = createBrowserRouter([
//   ...authRoutes,      // AuthRoute → AuthLayout → /login, /forgot-password, /reset-password
//   ...privateRoutes,   // PrivateRoute → MainLayout → SCR-04 đến SCR-28
//   ...utilityRoutes,   // KHÔNG guard → MinimalLayout → /403, * (404)
// ]);
//
// LƯU Ý: route `*` phải nằm ở vị trí cuối cùng trong children root (hoặc là
// route con cuối cùng trong toàn bộ cấu hình) để không "ăn" các path hợp lệ
// khác — đây là hành vi chuẩn của React Router v6 catch-all, không phải spec
// riêng của tài liệu.
