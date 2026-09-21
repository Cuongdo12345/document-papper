import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, ChevronDown, Building2 } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { usePermission } from "@/hooks/usePermission";
import { NAV_ITEMS, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

type NavBlock = { type: "single"; item: NavItem } | { type: "group"; group: string; items: NavItem[] };

/**
 * FE-21 — gom `visibleItems` (ĐÃ lọc permission, thứ tự KHÔNG đổi) thành khối
 * đơn lẻ/nhóm liền kề, phục vụ accordion thu gọn/mở riêng từng nhóm. Không
 * sắp xếp lại — `NAV_ITEMS` vốn đã liền kề theo domain (xem `navigation.ts`).
 */
/**
 * `id`/`aria-controls` KHÔNG được chứa khoảng trắng (IDREF token) — tên nhóm
 * tiếng Việt có dấu + khoảng trắng ("Tài sản & Vật tư") phải slugify trước.
 * axe-core `aria-valid-attr-value` bắt lỗi này (phát hiện qua FE-17 a11y scan).
 */
function slugifyGroupId(group: string): string {
  const ascii = group
    .replace(/đ/gi, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return `sidebar-group-${ascii}`;
}

function buildNavBlocks(items: NavItem[]): NavBlock[] {
  const blocks: NavBlock[] = [];
  for (const item of items) {
    if (!item.group) {
      blocks.push({ type: "single", item });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last?.type === "group" && last.group === item.group) {
      last.items.push(item);
    } else {
      blocks.push({ type: "group", group: item.group, items: [item] });
    }
  }
  return blocks;
}

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
  // FE-21 — thu gọn/mở riêng từng NHÓM (accordion), mặc định RỖNG = mọi nhóm
  // đang mở. State cục bộ (không persist qua uiStore) — chỉ là tiện ích thị
  // giác, không phải trạng thái cần nhớ giữa các phiên (tránh over-engineer).
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(group: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  const isCollapsed = variant === "desktop" && collapsed;
  // Trong lúc user CHƯA load xong (session restore), tạm ẩn toàn bộ nav có
  // permission (tránh flash menu sai) — chỉ mục KHÔNG cần permission vẫn hiện.
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    if (isLoading) return false;
    return hasPermission(item.permission);
  });
  const navBlocks = buildNavBlocks(visibleItems);

  function renderNavItem(item: NavItem) {
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
        {/* FE-21 — `transition-colors` riêng trên icon (KHÔNG chỉ ở NavLink
            cha) để màu icon (kế thừa currentColor) đổi MƯỢT theo active/hover,
            thay vì đổi tức thì — dùng đúng token --sidebar-accent hiện có,
            không thêm màu mới ngoài hệ thống. */}
        <Icon className="size-4 shrink-0 transition-colors" aria-hidden="true" />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
  }

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
        {navBlocks.map((block, blockIndex) => {
          if (block.type === "single") return renderNavItem(block.item);

          const isGroupCollapsed = collapsedGroups.has(block.group);
          const groupId = slugifyGroupId(block.group);
          return (
            <div key={block.group}>
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(block.group)}
                  aria-expanded={!isGroupCollapsed}
                  aria-controls={groupId}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 pb-1 text-sm font-semibold uppercase tracking-wide text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground",
                    blockIndex > 0 && "pt-3",
                  )}
                >
                  <span>{block.group}</span>
                  <ChevronDown
                    className={cn("size-3.5 shrink-0 transition-transform duration-200", isGroupCollapsed && "-rotate-90")}
                    aria-hidden="true"
                  />
                </button>
              )}
              {/* Ở chế độ thu gọn toàn bộ sidebar (icon-rail), LUÔN hiện đủ
                  icon bất kể trạng thái accordion — nút thu gọn nhóm bị ẩn
                  nên user không có cách nào mở lại nhóm nếu ẩn icon ở đây. */}
              {(isCollapsed || !isGroupCollapsed) && (
                <div id={groupId} role="group" className="space-y-0.5">
                  {block.items.map(renderNavItem)}
                </div>
              )}
            </div>
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
