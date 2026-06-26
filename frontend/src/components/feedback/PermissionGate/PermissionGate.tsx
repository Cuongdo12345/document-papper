/**
 * PermissionGate.tsx — CMP-24
 * Layer 5 — Feedback / Guard Component
 *
 * Conditional render theo role — dùng để ẩn/hiện buttons, sections,
 * menu items, action columns trong DataTable.
 *
 * KHÔNG dùng cho route protection — dùng PrivateRoute cho routes.
 * Dùng khi: button Delete (ADMIN only), button Xóa bulk (ADMIN only),
 *           column Actions có điều kiện, section RBAC trong sidebar.
 *
 * Nguồn thiết kế:
 *   SHARED_COMPONENTS_IMPLEMENTATION.md §6.1 usePermission
 *   PROJECT_UNDERSTANDING.md §5.1 Quyền truy cập theo màn hình
 *   STATE_MAPPING.md §3 Permission Store — "derive từ role name"
 *
 * Dependencies:
 *   - ./usePermission
 *   - ./PermissionGuard.types
 */

import React, { cloneElement, isValidElement } from 'react';
import { usePermission } from './usePermission';
import type { PermissionGateProps } from './PermissionGuard.types';

/**
 * PermissionGate
 *
 * Render children chỉ khi user có đủ quyền.
 * Không render gì (null) khi không đủ quyền — trừ khi truyền `fallback`.
 *
 * @example
 * // Ẩn hoàn toàn nút Xóa với IT/USER
 * <PermissionGate roles={['ADMIN']}>
 *   <Button danger onClick={handleDelete}>Xóa</Button>
 * </PermissionGate>
 *
 * // Fallback: hiện nút disabled với tooltip
 * <PermissionGate
 *   roles={['ADMIN']}
 *   fallback={
 *     <Tooltip title="Chỉ ADMIN mới có thể xóa">
 *       <Button danger disabled>Xóa</Button>
 *     </Tooltip>
 *   }
 * >
 *   <Button danger onClick={handleDelete}>Xóa</Button>
 * </PermissionGate>
 *
 * // disabledFallback: tự động clone children với disabled=true
 * <PermissionGate roles={['ADMIN']} disabledFallback>
 *   <Button danger onClick={handleDelete}>Xóa</Button>
 * </PermissionGate>
 *
 * // Không truyền roles = chỉ cần đăng nhập
 * <PermissionGate>
 *   <Button onClick={handleExport}>Export</Button>
 * </PermissionGate>
 */
const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  roles,
  fallback = null,
  disabledFallback = false,
}) => {
  const { isAuthenticated, hasRole } = usePermission();

  // ── Check quyền ──
  const isAllowed = (() => {
    // Không đăng nhập → không cho phép
    if (!isAuthenticated) return false;
    // Không có roles requirement → chỉ cần đăng nhập
    if (!roles || roles.length === 0) return true;
    // hasRole tự handle ADMIN bypass
    return hasRole(roles);
  })();

  if (isAllowed) {
    return <>{children}</>;
  }

  // ── disabledFallback: clone children với disabled=true ──
  if (disabledFallback) {
    if (isValidElement(children)) {
      return cloneElement(children as React.ReactElement<{ disabled?: boolean }>, {
        disabled: true,
      });
    }
    // Không phải ReactElement đơn → không thể clone
    return <>{fallback}</>;
  }

  // ── Render fallback (null nếu không truyền) ──
  return <>{fallback}</>;
};

export default PermissionGate;
