import { NavLink } from "react-router-dom";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/app/rbac/roles", label: "Roles", permission: PERMISSIONS.ROLE_VIEW },
  { to: "/app/rbac/permissions", label: "Permissions", permission: PERMISSIONS.PERMISSION_VIEW },
  { to: "/app/rbac/policies", label: "Policies (ABAC)", permission: PERMISSIONS.POLICY_VIEW },
] as const;

/**
 * FE-08 — sub-nav 3 tab Roles/Permissions/Policies, dùng chung ở đầu cả 3
 * trang RBAC Admin (roadmap Mục 16: "clear read/write/action separation" —
 * 3 resource riêng biệt, không gộp UI). Mỗi tab tự ẩn nếu thiếu permission
 * tương ứng (route đã gate ở tầng router — đây chỉ là UX, tránh hiện tab
 * dẫn tới trang chắc chắn 403).
 */
export function RbacSectionTabs() {
  return (
    <nav aria-label="Điều hướng RBAC Admin" className="flex gap-1 border-b border-border">
      {TABS.map((tab) => (
        <PermissionGuard key={tab.to} permission={tab.permission}>
          <NavLink
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            {tab.label}
          </NavLink>
        </PermissionGuard>
      ))}
    </nav>
  );
}
