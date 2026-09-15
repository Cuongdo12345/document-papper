import { StatusBadge } from "@/components/shared/StatusBadge";
import { humanizePermission } from "@/utils/humanizePermission";

interface PermissionBadgeProps {
  /** Permission string GỐC từ `constants/permissions.ts` (copy trực tiếp từ backend). */
  permissionName: string;
  className?: string;
}

/**
 * SHARED_COMPONENTS_LIBRARY.md: "PermissionBadge" — hiển thị 1 permission
 * dạng pill (dùng ở trang Roles/Permissions — RBAC Admin, FE-16+). Compose
 * lại `StatusBadge` (KHÔNG tự viết CSS pill riêng — FE_UI_DEVELOPMENT_ROADMAP.md
 * Mục 31 "Quy tắc chống drift": không duplicate shared component). Permission
 * string GỐC vẫn giữ nguyên qua `title` (tooltip) — `humanizePermission()`
 * chỉ format hiển thị, không mất thông tin kỹ thuật.
 *
 * ```tsx
 * <PermissionBadge permissionName="USER_CREATE" />
 * ```
 */
export function PermissionBadge({ permissionName, className }: PermissionBadgeProps) {
  return (
    <StatusBadge variant="default" className={className} title={permissionName}>
      {humanizePermission(permissionName)}
    </StatusBadge>
  );
}
