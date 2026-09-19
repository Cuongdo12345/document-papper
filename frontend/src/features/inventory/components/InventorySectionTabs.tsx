import { NavLink } from "react-router-dom";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/app/inventory", label: "Vật tư tiêu hao", permission: PERMISSIONS.CONSUMABLE_VIEW, end: true },
  { to: "/app/inventory/categories", label: "Nhóm vật tư", permission: PERMISSIONS.CONSUMABLE_CATEGORY_VIEW, end: true },
  {
    to: "/app/inventory/requests",
    label: "Đề xuất/Dự trù",
    permission: PERMISSIONS.CONSUMABLE_REQUEST_VIEW,
    end: true,
  },
] as const;

/**
 * Nhóm vật tư (2026-09-16) — sub-nav 2 tab, dùng chung ở đầu cả 2 trang
 * (CÙNG PATTERN `AssetSectionTabs.tsx`) — tránh thêm mục sidebar cấp cao mới
 * cho 1 sub-resource của Inventory (CLAUDE.md Mục 20). Mỗi tab tự ẩn nếu
 * thiếu permission tương ứng.
 */
export function InventorySectionTabs() {
  return (
    <nav aria-label="Điều hướng Vật tư tiêu hao" className="flex gap-1 border-b border-border">
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
