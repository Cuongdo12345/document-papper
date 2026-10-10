import { NavLink } from "react-router-dom";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { cn } from "@/lib/utils";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/**
 * Asset Categories UI (roadmap Mục 14) — sub-nav 2 tab (Danh sách thiết bị / Danh mục) của module hiện tại
 * (CNTT hoặc y tế), dùng chung ở đầu cả 2 trang (CÙNG PATTERN `RbacSectionTabs.tsx`, FE-08) — tránh thêm mục
 * sidebar cấp cao mới cho 1 sub-resource. Mỗi tab tự ẩn nếu thiếu permission tương ứng (route đã gate ở tầng
 * router — đây chỉ là UX). [FE-42] Nhãn và đường dẫn theo module.
 */
export function AssetSectionTabs() {
  const assetModule = useAssetModule();
  const tabs = [
    { to: assetModule.routeBase, label: assetModule.label, permission: assetModule.permissions.view },
    { to: `${assetModule.routeBase}/categories`, label: "Danh mục", permission: assetModule.permissions.categoryView },
  ];

  return (
    <nav aria-label={`Điều hướng ${assetModule.label}`} className="flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <PermissionGuard key={tab.to} permission={tab.permission}>
          <NavLink
            to={tab.to}
            end
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
