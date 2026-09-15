import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut, User as UserIcon, UserCog } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { cn } from "@/lib/utils";

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const last = parts[parts.length - 1]?.[0] ?? "";
  const first = parts.length > 1 ? parts[0]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

/**
 * App Shell — Header (Mục 20/21 FE-01): breadcrumb đã có riêng ở
 * `PageHeader` (trong nội dung từng trang, không lặp lại ở Header toàn cục).
 * Header giữ vai trò: mở sidebar mobile, notification center (`NotificationBell`
 * — FE-12, thay placeholder disabled cũ), user menu (profile + logout).
 */
export function Header() {
  const navigate = useNavigate();
  const openMobileNav = useUIStore((s) => s.openMobileNav);
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <button
        type="button"
        onClick={openMobileNav}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="Mở menu điều hướng"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <NotificationBell />

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md p-1.5 pr-2 text-sm hover:bg-muted"
              aria-label="Menu tài khoản"
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                aria-hidden="true"
              >
                {user ? getInitials(user.fullName) : <UserIcon className="size-4" />}
              </span>
              <span className="hidden max-w-[10rem] truncate font-medium sm:inline">{user?.fullName ?? "..."}</span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className={cn(
                "z-50 w-64 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg",
                "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              )}
            >
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold">{user?.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">@{user?.username}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <StatusBadge variant="primary">{user?.role?.name}</StatusBadge>
                  {user?.role?.isSystemRole && <StatusBadge variant="info">System Role</StatusBadge>}
                  {user?.department && <StatusBadge variant="default">{user.department.name}</StatusBadge>}
                </div>
              </div>

              <DropdownMenu.Separator className="my-1 h-px bg-border" />

              <DropdownMenu.Item
                onSelect={() => navigate("/app/profile")}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted focus:bg-muted"
              >
                <UserCog className="size-4" />
                Hồ sơ cá nhân
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 h-px bg-border" />

              <DropdownMenu.Item
                onSelect={() => logout.mutate()}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-destructive/10 focus:bg-destructive/10"
              >
                <LogOut className="size-4" />
                Đăng xuất
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
