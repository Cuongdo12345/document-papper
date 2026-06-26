// src/router/routes.config.ts
//
// RouteConfig[] — metadata thuần (path, roles, label) cho từng route.
// KHÔNG chứa JSX/component — chỉ data, dùng để build route tree trong index.tsx
// và có thể tái sử dụng cho Sidebar/breadcrumb sau này.
//
// Logic permission giữ nguyên 100% từ app.routes.tsx gốc:
//   - /403: không guard (public)
//   - /dashboard: allowedRoles=['ADMIN']
//   - (placeholder ADMIN+IT, all-auth): chưa có route thật, giữ nguyên TODO

import type { RoleName } from '../types/auth/auth.types';

export interface RouteConfig {
  path: string;
  /** undefined = tất cả authenticated users (không giới hạn role) */
  allowedRoles?: RoleName[];
  /** Nhãn hiển thị — dùng cho Sidebar/breadcrumb (điền dần khi cần) */
  label?: string;
}

// ── Auth routes (public-only, qua AuthRoute guard) ────────────────────────────

export const authRouteConfigs: RouteConfig[] = [
  { path: '/login', label: 'Đăng nhập' },
  { path: '/forgot-password', label: 'Quên mật khẩu' },
  { path: '/reset-password', label: 'Đặt lại mật khẩu' },
];

// ── ADMIN-only routes ──────────────────────────────────────────────────────────

export const adminRouteConfigs: RouteConfig[] = [
  { path: '/dashboard', allowedRoles: ['ADMIN'], label: 'Dashboard' },
  // TODO: Thêm khi build từng module
  // { path: '/users', allowedRoles: ['ADMIN'], label: 'Người dùng' },
  // { path: '/users/:id', allowedRoles: ['ADMIN'] },
  // { path: '/rbac/roles', allowedRoles: ['ADMIN'], label: 'Vai trò' },
  // { path: '/rbac/permissions', allowedRoles: ['ADMIN'], label: 'Quyền hạn' },
  // { path: '/rbac/policies', allowedRoles: ['ADMIN'], label: 'Chính sách' },
  // { path: '/system/performance', allowedRoles: ['ADMIN'], label: 'Hiệu năng hệ thống' },
  // { path: '/audit/dashboard', allowedRoles: ['ADMIN'], label: 'Audit Dashboard' },
];

// ── ADMIN + IT routes ──────────────────────────────────────────────────────────

export const adminItRouteConfigs: RouteConfig[] = [
  // ── Department (SCR-14, SCR-15) ─────────────────────────────────────────────
  { path: '/departments',     allowedRoles: ['ADMIN', 'IT'], label: 'Phòng ban' },
  { path: '/departments/:id', allowedRoles: ['ADMIN', 'IT'] },
  // ✅ /departments/new KHÔNG có — Create qua Modal tại DepartmentListPage

  // TODO: Thêm khi build từng module
  // { path: '/audit', allowedRoles: ['ADMIN', 'IT'], label: 'Nhật ký' },
];

// ── All authenticated users ─────────────────────────────────────────────────────

export const allAuthRouteConfigs: RouteConfig[] = [
  // TODO: Thêm khi build từng module
  // { path: '/documents/proposals', label: 'Đề xuất' },
  // { path: '/documents/proposals/:id' },
  // { path: '/documents/reports', label: 'Biên bản' },
  // { path: '/documents/reports/:id' },
  // { path: '/workflow', label: 'Quy trình' },
  // { path: '/profile', label: 'Hồ sơ' },
  // { path: '/profile/change-password', label: 'Đổi mật khẩu' },
];

// ── Public route (không guard) ──────────────────────────────────────────────────

export const publicRouteConfigs: RouteConfig[] = [
  { path: '/403', label: 'Không có quyền truy cập' },
];


// // src/router/routes.config.ts          
// //
// // RouteConfig[] — metadata thuần (path, roles, label) cho từng route.
// // KHÔNG chứa JSX/component — chỉ data, dùng để build route tree trong index.tsx
// // và có thể tái sử dụng cho Sidebar/breadcrumb sau này.
// //
// // Logic permission giữ nguyên 100% từ app.routes.tsx gốc:
// //   - /403: không guard (public)
// //   - /dashboard: allowedRoles=['ADMIN']
// //   - (placeholder ADMIN+IT, all-auth): chưa có route thật, giữ nguyên TODO

// import type { RoleName } from '../types/auth/auth.types';

// export interface RouteConfig {
//   path: string;
//   /** undefined = tất cả authenticated users (không giới hạn role) */
//   allowedRoles?: RoleName[];
//   /** Nhãn hiển thị — dùng cho Sidebar/breadcrumb (điền dần khi cần) */
//   label?: string;
// }

// // ── Auth routes (public-only, qua AuthRoute guard) ────────────────────────────

// export const authRouteConfigs: RouteConfig[] = [
//   { path: '/login', label: 'Đăng nhập' },
//   { path: '/forgot-password', label: 'Quên mật khẩu' },
//   { path: '/reset-password', label: 'Đặt lại mật khẩu' },
// ];

// // ── ADMIN-only routes ──────────────────────────────────────────────────────────

// export const adminRouteConfigs: RouteConfig[] = [
//   { path: '/dashboard', allowedRoles: ['ADMIN'], label: 'Dashboard' },
//   // TODO: Thêm khi build từng module
//   { path: '/departments', allowedRoles: ['ADMIN'], label: 'Phòng ban' },
//   // { path: '/users', allowedRoles: ['ADMIN'], label: 'Người dùng' },
//   // { path: '/users/:id', allowedRoles: ['ADMIN'] },
//   // { path: '/rbac/roles', allowedRoles: ['ADMIN'], label: 'Vai trò' },
//   // { path: '/rbac/permissions', allowedRoles: ['ADMIN'], label: 'Quyền hạn' },
//   // { path: '/rbac/policies', allowedRoles: ['ADMIN'], label: 'Chính sách' },
//   // { path: '/system/performance', allowedRoles: ['ADMIN'], label: 'Hiệu năng hệ thống' },
//   // { path: '/audit/dashboard', allowedRoles: ['ADMIN'], label: 'Audit Dashboard' },
// ];

// // ── ADMIN + IT routes ──────────────────────────────────────────────────────────

// export const adminItRouteConfigs: RouteConfig[] = [
//   // TODO: Thêm khi build từng module
//   // { path: '/departments', allowedRoles: ['ADMIN', 'IT'], label: 'Phòng ban' },
//   // { path: '/departments/:id', allowedRoles: ['ADMIN', 'IT'] },
//   // { path: '/audit', allowedRoles: ['ADMIN', 'IT'], label: 'Nhật ký' },
// ];

// // ── All authenticated users ─────────────────────────────────────────────────────

// export const allAuthRouteConfigs: RouteConfig[] = [
//   // TODO: Thêm khi build từng module
//   // { path: '/documents/proposals', label: 'Đề xuất' },
//   // { path: '/documents/proposals/:id' },
//   // { path: '/documents/reports', label: 'Biên bản' },
//   // { path: '/documents/reports/:id' },
//   // { path: '/workflow', label: 'Quy trình' },
//   // { path: '/profile', label: 'Hồ sơ' },
//   // { path: '/profile/change-password', label: 'Đổi mật khẩu' },
// ];

// // ── Public route (không guard) ──────────────────────────────────────────────────

// export const publicRouteConfigs: RouteConfig[] = [
//   { path: '/403', label: 'Không có quyền truy cập' },
// ];