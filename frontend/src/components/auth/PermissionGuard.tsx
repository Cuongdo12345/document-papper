import type { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import type { Permission } from "@/constants/permissions";

interface PermissionGuardProps {
  /** 1 permission hoặc mảng permission cần có. */
  permission: Permission | Permission[];
  /** "any" (mặc định) = có ít nhất 1 permission; "all" = phải có đủ tất cả. */
  mode?: "any" | "all";
  /** Hiển thị khi KHÔNG đủ quyền — mặc định không render gì (ẩn hoàn toàn). */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * `PermissionGuard` — CHỈ là UX/UI visibility layer (ẩn/hiện action, menu).
 * KHÔNG PHẢI security boundary — backend (`authorizePermission.middleware.ts`)
 * luôn là ranh giới bảo mật thật duy nhất, kể cả khi component này bị bypass
 * (devtools, code lỗi...). Đọc permission qua `usePermission()`
 * (`user.permissions` — effective permission ĐÃ TÍNH SẴN ở backend, DEV-026).
 *
 * ```tsx
 * <PermissionGuard permission={PERMISSIONS.USER_CREATE}>
 *   <CreateUserButton />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({ permission, mode = "any", fallback = null, children }: PermissionGuardProps) {
  const { hasAnyPermission, hasAllPermissions } = usePermission();
  const required = Array.isArray(permission) ? permission : [permission];
  const allowed = mode === "all" ? hasAllPermissions(required) : hasAnyPermission(required);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
