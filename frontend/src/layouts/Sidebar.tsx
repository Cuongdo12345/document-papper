import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, Building2 } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { usePermission } from "@/hooks/usePermission";
import { NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  /** Render dạng drawer mobile (không có nút collapse riêng, đóng bằng overlay) — Mục 22/23 FE-01. */
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

/**
 * App Shell — Sidebar (Mục 14/19 FE-01). Navigation lọc theo
 * `hasPermission()` (DEV-026 effective permission), KHÔNG hard-code menu
 * theo role. Hỗ trợ expanded/collapsed (desktop, persist qua `uiStore`) và
 * mobile drawer (Mục 22/23).
 */
export function Sidebar({ variant = "desktop", onNavigate }: SidebarProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { hasPermission, isLoading } = usePermission();

  const isCollapsed = variant === "desktop" && collapsed;
  // Trong lúc user CHƯA load xong (session restore), tạm ẩn toàn bộ nav có
  // permission (tránh flash menu sai) — chỉ mục KHÔNG cần permission vẫn hiện.
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    if (isLoading) return false;
    return hasPermission(item.permission);
  });

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        variant === "desktop" && (isCollapsed ? "w-16" : "w-60"),
        variant === "mobile" && "w-64",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Building2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
        {!isCollapsed && <span className="truncate text-sm font-semibold">Document Papper</span>}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Điều hướng chính">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/app"}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  isCollapsed && "justify-center px-0",
                )
              }
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {variant === "desktop" && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex items-center gap-2 border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/40"
          aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          {isCollapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          {!isCollapsed && <span>Thu gọn</span>}
        </button>
      )}
    </aside>
  );
}
