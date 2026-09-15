import { useCurrentUser } from "@/hooks/useCurrentUser";
import { checkHasPermission, checkHasAnyPermission, checkHasAllPermissions } from "@/utils/permissionCheck";
import type { Permission } from "@/constants/permissions";

/**
 * RBAC — DEV-026 (Backend RBAC Micro-Fix) đã cung cấp effective permission
 * thật qua `GET /users/me` (`user.permissions: string[]`). Hook này CHỈ đọc
 * lại kết quả đó (logic thuần ở `utils/permissionCheck.ts`, có unit test
 * riêng) — KHÔNG tự tính `role.permissions ∪ extraPermissions −
 * denyPermissions`, KHÔNG hard-code "ADMIN/isSystemRole = toàn quyền".
 *
 * `isSystemRole` được expose RIÊNG (chỉ để hiển thị UI, vd badge "System
 * Role") — KHÔNG dùng để bypass `hasPermission()`. Nếu `user.permissions`
 * rỗng, `hasPermission()` PHẢI trả `false` dù `isSystemRole===true` (khớp
 * test case bắt buộc FE-01 Mục 45: "FE không tự biến [] thành ['ALL']").
 * Backend là nơi DUY NHẤT quyết định permission thật (ADMIN bypass nằm ở
 * `authorizePermission.middleware.ts`, không phải ở FE).
 */
export function usePermission() {
  const { data: user, isLoading } = useCurrentUser();

  const permissions = user?.permissions ?? [];
  const isSystemRole = user?.role?.isSystemRole === true;

  return {
    user,
    isLoading,
    permissions,
    isSystemRole,
    hasPermission: (permission: Permission | Permission[]) => checkHasPermission(permissions, permission),
    hasAnyPermission: (required: Permission[]) => checkHasAnyPermission(permissions, required),
    hasAllPermissions: (required: Permission[]) => checkHasAllPermissions(permissions, required),
  };
}
