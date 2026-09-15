import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/useUnreadNotificationCount";
import { useMarkNotificationRead, useMarkAllNotificationsRead } from "@/features/notifications/hooks/useNotificationActions";
import { resolveNotificationLink } from "@/features/notifications/utils/resolveNotificationLink";
import type { NotificationItem } from "@/types/notification.types";

const PREVIEW_LIMIT = 10;

/**
 * App Shell — Header (roadmap Mục 18: "notification center"). Thay nút
 * chuông `disabled` placeholder từ FE-01 (comment gốc: "notification
 * placeholder (KHÔNG implement backend — Mục 20)") bằng dropdown thật, cùng
 * primitive Radix DropdownMenu với menu user-account ngay cạnh (`Header.tsx`).
 *
 * List đầy đủ (filter/pagination) nằm ở trang riêng `/app/notifications`
 * (`NotificationsPage`) — dropdown này CHỦ Ý chỉ xem nhanh `PREVIEW_LIMIT`
 * bản ghi gần nhất, không nhồi filter/pagination vào 1 panel nhỏ.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const unreadCountQuery = useUnreadNotificationCount();
  const listQuery = useNotifications({ page: 1, limit: PREVIEW_LIMIT }, { enabled: open });
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const unreadCount = unreadCountQuery.data ?? 0;
  const items = listQuery.data?.items ?? [];

  function handleItemClick(n: NotificationItem) {
    if (!n.isRead) markReadMutation.mutate(n._id);
    const link = resolveNotificationLink(n);
    if (link) {
      setOpen(false);
      navigate(link);
    }
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="relative rounded-md p-2 text-muted-foreground hover:bg-muted"
          aria-label={unreadCount > 0 ? `Thông báo (${unreadCount} chưa đọc)` : "Thông báo"}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 flex size-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-semibold text-white"
              aria-hidden="true"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 w-80 rounded-md border border-border bg-popover text-popover-foreground shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">Thông báo</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {listQuery.isLoading && <p className="p-4 text-center text-xs text-muted-foreground">Đang tải...</p>}

            {!listQuery.isLoading && items.length === 0 && (
              <p className="p-4 text-center text-xs text-muted-foreground">Không có thông báo nào.</p>
            )}

            {items.map((n) => {
              const clickable = !!resolveNotificationLink(n);
              return (
                <DropdownMenu.Item
                  key={n._id}
                  onSelect={(e) => {
                    e.preventDefault(); // giữ dropdown mở nếu chỉ đánh dấu đọc (không có link để điều hướng)
                    handleItemClick(n);
                  }}
                  className={cn(
                    "flex cursor-pointer gap-2 border-b border-border/50 px-3 py-2.5 text-sm outline-none last:border-b-0 hover:bg-muted focus:bg-muted",
                    !clickable && "cursor-default",
                  )}
                >
                  <span
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-primary")}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate", n.isRead ? "text-foreground" : "font-semibold text-foreground")}>{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(n.createdAt).toLocaleString("vi-VN")}</p>
                  </div>
                </DropdownMenu.Item>
              );
            })}
          </div>

          <DropdownMenu.Item
            onSelect={() => {
              setOpen(false);
              navigate("/app/notifications");
            }}
            className="cursor-pointer border-t border-border px-3 py-2 text-center text-sm text-primary outline-none hover:bg-muted focus:bg-muted"
          >
            Xem tất cả thông báo
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
