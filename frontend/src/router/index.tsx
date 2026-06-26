// src/router/index.tsx
//
// createBrowserRouter — toàn bộ route tree của ứng dụng.
// Logic giữ nguyên 100% từ app.routes.tsx + auth.routes.tsx gốc — chỉ gộp lại
// thành 1 router instance duy nhất, dùng lazy pages từ LazyPages.ts.
//
// Thay thế cho việc spread ...authRoutes, ...appRoutes trong App.tsx trước đây.

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { Suspense } from 'react';

import AuthRoute from './guards/AuthRoute';
import { PrivateRoute } from './guards/PrivateRoute';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';

import {
  LoginPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  UnauthorizedPage,
  DashboardPage,
  DepartmentListPage,
  DepartmentDetailPage,
} from './LazyPages';

// ── Fallback dùng chung ────────────────────────────────────────────────────────

const RouteFallback = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
    }}
  >
    <Spin size="large" />
  </div>
);

// ── Router ────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // ════════════════════════════════════════════════════════════════════════════
  // AUTH ROUTES (public-only, qua AuthRoute guard)
  // Logic giữ nguyên từ auth.routes.tsx gốc
  // ════════════════════════════════════════════════════════════════════════════
  {
    element: <AuthRoute />,
    children: [
      {
        element: (
          <Suspense fallback={<RouteFallback />}>
            <AuthLayout />
          </Suspense>
        ),
        children: [
          {
            path: '/login',
            element: <LoginPage />,
          },
          {
            path: '/forgot-password',
            element: <ForgotPasswordPage />,
          },
          {
            // SCR-03 ResetPasswordPage — token đọc từ ?token= query param
            path: '/reset-password',
            element: <ResetPasswordPage />,
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // APP ROUTES
  // Logic giữ nguyên từ app.routes.tsx gốc
  // ════════════════════════════════════════════════════════════════════════════

  // ── /403 — Public error page (không có guard) ────────────────────────────────
  // Source: AUTH_MODULE_ANALYSIS.md §8.3 — "/403 không có guard — render trực tiếp"
  {
    path: '/403',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <UnauthorizedPage />
      </Suspense>
    ),
  },

  // ── ADMIN-only routes ──────────────────────────────────────────────────────
  // Source: DASHBOARD_UI_SPEC.md §7.1: "PrivateRoute allowedRoles={['ADMIN']}"
  // IT/USER cố truy cập → redirect /403
  {
    element: <PrivateRoute allowedRoles={['ADMIN']} />,
    children: [
      {
        element: (
          <Suspense fallback={<RouteFallback />}>
            <MainLayout />
          </Suspense>
        ),
        children: [
          {
            // SCR-04 — Dashboard
            path: '/dashboard',
            element: <DashboardPage />,
          },
          // TODO: Thêm khi build từng module
          // { path: '/users', element: <UserListPage /> },
          // { path: '/users/:id', element: <UserDetailPage /> },
          // { path: '/rbac/roles', element: <RoleListPage /> },
          // { path: '/rbac/permissions', element: <PermissionListPage /> },
          // { path: '/rbac/policies', element: <PolicyListPage /> },
          // { path: '/system/performance', element: <PerformancePage /> },
          // { path: '/audit/dashboard', element: <AuditDashboardPage /> },
        ],
      },
    ],
  },

  // ── ADMIN + IT routes ──────────────────────────────────────────────────────
  {
    element: <PrivateRoute allowedRoles={['ADMIN', 'IT']} />,
    children: [
      {
        element: (
          <Suspense fallback={<RouteFallback />}>
            <MainLayout />
          </Suspense>
        ),
        children: [
          // ── Department (SCR-14, SCR-15) ─────────────────────────────────────
          // allowedRoles: ['ADMIN', 'IT'] — xác nhận từ DEPARTMENT_MODULE_ANALYSIS.md §2
          {
            path: '/departments',
            element: <DepartmentListPage />,
          },
          {
            path: '/departments/:id',
            element: <DepartmentDetailPage />,
          },
          // ✅ /departments/new KHÔNG có — Create qua Modal tại DepartmentListPage

          // TODO: Thêm khi build từng module
          // { path: '/audit', element: <AuditListPage /> },
        ],
      },
    ],
  },

  // ── All authenticated users ─────────────────────────────────────────────────
  {
    element: <PrivateRoute />,
    children: [
      {
        element: (
          <Suspense fallback={<RouteFallback />}>
            <MainLayout />
          </Suspense>
        ),
        children: [
          // TODO: Thêm khi build từng module
          // { path: '/documents/proposals', element: <ProposalListPage /> },
          // { path: '/documents/proposals/:id', element: <ProposalDetailPage /> },
          // { path: '/documents/reports', element: <ReportListPage /> },
          // { path: '/documents/reports/:id', element: <ReportDetailPage /> },
          // { path: '/workflow', element: <WorkflowListPage /> },
          // { path: '/profile', element: <ProfilePage /> },
          // { path: '/profile/change-password', element: <ChangePasswordPage /> },
        ],
      },
    ],
  },

  // ── Root redirect ────────────────────────────────────────────────────────────
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
]);

