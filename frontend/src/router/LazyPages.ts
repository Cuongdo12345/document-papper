// src/router/LazyPages.ts
//
// Tất cả lazy imports của toàn bộ route tree tập trung tại đây.
// Logic giữ nguyên 100% từ app.routes.tsx + auth.routes.tsx gốc —
// chỉ tách ra khỏi route definition để khớp cấu trúc chuẩn.

import { lazy } from "react";

// ── Auth pages (từ auth.routes.tsx) ───────────────────────────────────────────

export const LoginPage = lazy(() =>
  import("../pages/auth/LoginPage").then((m) => ({
    default: m.LoginPage,
  })),
);

export const ForgotPasswordPage = lazy(() =>
  import("../pages/auth/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);

export const ResetPasswordPage = lazy(() =>
  import("../pages/auth/ResetPasswordPage").then((m) => ({
    default: m.ResetPasswordPage,
  })),
);

// ── App pages (từ app.routes.tsx) ─────────────────────────────────────────────

export const UnauthorizedPage = lazy(() =>
  import("../pages/auth/UnauthorizedPage").then((m) => ({
    default: m.UnauthorizedPage,
  })),
);

// ── Dashboard pages (từ app.routes.tsx) ─────────────────────────────────────────────
export const DashboardPage = lazy(() =>
  import("../pages/dashboard").then((m) => ({
    default: m.DashboardPage,
  })),
);

// ── Department pages ───────────────────────────────────────────
export const DepartmentListPage = lazy(() =>
  import("../pages/departments/DepartmentListPage").then((m) => ({
    default: m.DepartmentListPage,
  })),
);

export const DepartmentDetailPage = lazy(() =>
  import("../pages/departments/DepartmentDetailPage").then((m) => ({
    default: m.DepartmentDetailPage,
  })),
);

// TODO: Thêm lazy import khi build từng module
// export const UserListPage = lazy(() => import('../pages/users/UserListPage').then(...));
// export const DepartmentListPage = lazy(() => import('../pages/departments/DepartmentListPage').then(...));
// export const ProposalListPage = lazy(() => import('../pages/documents/ProposalListPage').then(...));
