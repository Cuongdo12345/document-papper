import { NavLink } from "react-router-dom";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/app/assets", label: "Tài sản", permission: PERMISSIONS.ASSET_VIEW, end: true },
  { to: "/app/assets/categories", label: "Danh mục tài sản", permission: PERMISSIONS.ASSET_CATEGORY_VIEW, end: true },
] as const;

/**
 * Asset Categories UI (roadmap Mục 14) — sub-nav 2 tab Tài sản/Danh mục,
 * dùng chung ở đầu cả 2 trang (CÙNG PATTERN `RbacSectionTabs.tsx`, FE-08) —
 * tránh thêm mục sidebar cấp cao mới cho 1 sub-resource của Assets (CLAUDE.md
 * Mục 20: không đổi global layout nếu task không yêu cầu). Mỗi tab tự ẩn nếu
 * thiếu permission tương ứng (route đã gate ở tầng router — đây chỉ là UX).
 */
export function AssetSectionTabs() {
  return (
    <nav aria-label="Điều hướng Tài sản" className="flex gap-1 border-b border-border">
      {TABS.map((tab) => (
        <PermissionGuard key={tab.to} permission={tab.permission}>
          <NavLink
            to={tab.to}
            end={tab.end}
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
