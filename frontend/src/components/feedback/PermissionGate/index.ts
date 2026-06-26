/**
 * components/common/PermissionGuard/index.ts
 *
 * Barrel export cho toàn bộ Permission Guard system.
 *
 * Import patterns:
 *
 *   // Route guards (dùng trong router/index.tsx)
 *   import PrivateRoute from '@/components/common/PermissionGuard/PrivateRoute'
 *   import AuthRoute    from '@/components/common/PermissionGuard/AuthRoute'
 *
 *   // Component protection (dùng trong pages và features)
 *   import PermissionGate from '@/components/common/PermissionGuard/PermissionGate'
 *
 *   // Hook (dùng ở mọi nơi cần check quyền)
 *   import { usePermission } from '@/components/common/PermissionGuard'
 *
 *   // Types
 *   import type { Role, UsePermissionReturn } from '@/components/common/PermissionGuard'
 */

// ── Route Guards ──
export { default as PrivateRoute } from './PrivateRoute';
export { default as AuthRoute    } from './AuthRoute';

// ── Component Protection ──
export { default as PermissionGate } from './PermissionGate';

// ── Hook ──
export { usePermission } from './usePermission';

// ── Types ──
export type {
  Role,
  RouteGroup,
  UsePermissionReturn,
  PrivateRouteProps,
  AuthRouteProps,
  PermissionGateProps,
} from './PermissionGuard.types';
