import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Check, Trash2, CheckCheck, Inbox, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/useUnreadNotificationCount";
import { useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification } from "@/features/notifications/hooks/useNotificationActions";
import { getNotificationTypeLabel } from "@/features/notifications/components/NotificationTypeLabel";
import { resolveNotificationLink } from "@/features/notifications/utils/resolveNotificationLink";
import { AdminNotificationsTab } from "@/features/notifications/components/AdminNotificationsTab";
import { parseApiError } from "@/utils/parseApiError";
import { NOTIFICATION_TYPES, type NotificationItem, type NotificationType } from "@/types/notification.types";

const LIMIT = 20;

/**
 * Trang đầy đủ (roadmap Mục 18: filter/list/read-unread/empty/loading/error)
 * — bổ sung `NotificationBell` (chỉ xem nhanh 10 bản ghi, không filter).
 * Reach qua CẢ 2 đường: mục "Thông báo" ở sidebar (`config/navigation.ts`,
 * không gán permission — self-scoped, mọi user đăng nhập đều có) VÀ "Xem
 * tất cả thông báo" ở dropdown chuông.
 *
 * ⚠️ SỬA (2026-09-10, user báo thiếu mục sidebar): trước đây CHỦ Ý không có
 * mục sidebar (lý do gốc: personal inbox kiểu Gmail/Slack, chỉ cần chuông)
 * — nhưng từ khi có tab "Quản trị" bên dưới (FE-13), chỉ reach được qua
 * chuông là đường đi quá sâu cho 1 tính năng quản trị. Đã thêm lại mục
 * sidebar, xem comment đầy đủ ở `navigation.ts`.
 *
 * FE-13 (2026-09-10, theo yêu cầu user — "admin có cần quản trị notification
 * không?"): thêm tab "Quản trị" — PermissionGuard "any" 2 quyền RIÊNG
 * (`NOTIFICATION_BROADCAST`/`NOTIFICATION_VIEW_ALL`), tab tự ẩn với mọi role
 * không có cả 2 (hiện chỉ ADMIN). Tab "Thông báo của tôi" LUÔN hiện — kể cả
 * ADMIN vẫn có hộp thư cá nhân riêng, tách biệt với view giám sát toàn hệ
 * thống ở tab "Quản trị".
 */
export function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [isRead, setIsRead] = useState<"true" | "false" | "">("");
  const [type, setType] = useState<NotificationType | "">("");

  const [deleteTarget, setDeleteTarget] = useState<NotificationItem | null>(null);

  function resetFilters() {
    setIsRead("");
    setType("");
    setPage(1);
  }

  const unreadCountQuery = useUnreadNotificationCount();
  const query = useNotifications({
    page,
    limit: LIMIT,
    isRead: isRead === "" ? undefined : isRead === "true",
    type: type || undefined,
  });
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const items = query.data?.items ?? [];
  const unreadCount = unreadCountQuery.data ?? 0;

  function handleOpen(n: NotificationItem) {
    if (!n.isRead) markReadMutation.mutate(n._id);
    const link = resolveNotificationLink(n);
    if (link) navigate(link);
  }

  const columns: DataTableColumn<NotificationItem>[] = [
    {
      key: "isRead",
      header: "Trạng thái",
      render: (row) => (
        <StatusBadge variant={row.isRead ? "default" : "primary"}>{row.isRead ? "Đã đọc" : "Chưa đọc"}</StatusBadge>
      ),
    },
    {
      key: "createdAt",
      header: "Thời gian",
      className: "whitespace-nowrap",
      render: (row) => new Date(row.createdAt).toLocaleString("vi-VN"),
    },
    { key: "type", header: "Loại", render: (row) => getNotificationTypeLabel(row.type) },
    {
      key: "title",
      header: "Nội dung",
      className: "max-w-96",
      render: (row) => (
        <div className="min-w-0">
          <p className={row.isRead ? "text-foreground" : "font-semibold text-foreground"}>{row.title}</p>
          <p className="truncate text-xs text-muted-foreground" title={row.message}>
            {row.message}
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Thông báo"
        description="Thông báo dành riêng cho tài khoản của bạn."
        actions={
          unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={() => markAllReadMutation.mutate()} loading={markAllReadMutation.isPending}>
              <CheckCheck /> Đánh dấu tất cả đã đọc ({unreadCount})
            </Button>
          )
        }
      />

      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">
            <Inbox className="size-4" aria-hidden="true" />
            Thông báo của tôi
          </TabsTrigger>
          <PermissionGuard permission={[PERMISSIONS.NOTIFICATION_BROADCAST, PERMISSIONS.NOTIFICATION_VIEW_ALL]}>
            <TabsTrigger value="admin">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Quản trị
            </TabsTrigger>
          </PermissionGuard>
        </TabsList>

        <TabsContent value="my" className="space-y-4">
          <FilterBar onReset={resetFilters}>
            <div className="min-w-40 space-y-1.5">
              <label htmlFor="notif-isRead" className="text-xs font-medium text-muted-foreground">
                Trạng thái
              </label>
              <select
                id="notif-isRead"
                value={isRead}
                onChange={(e) => {
                  setIsRead(e.target.value as "true" | "false" | "");
                  setPage(1);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Tất cả</option>
                <option value="false">Chưa đọc</option>
                <option value="true">Đã đọc</option>
              </select>
            </div>

            <div className="min-w-44 space-y-1.5">
              <label htmlFor="notif-type" className="text-xs font-medium text-muted-foreground">
                Loại thông báo
              </label>
              <select
                id="notif-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as NotificationType | "");
                  setPage(1);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Tất cả</option>
                {NOTIFICATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {getNotificationTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          </FilterBar>

          <DataTable
            columns={columns}
            data={items}
            keyExtractor={(row) => row._id}
            isLoading={query.isLoading}
            isError={query.isError}
            errorMessage={query.error ? parseApiError(query.error).message : undefined}
            onRetry={() => query.refetch()}
            emptyTitle="Chưa có thông báo nào"
            emptyMessage="Không có thông báo nào khớp bộ lọc hiện tại."
            rowActions={(row) => {
              const link = resolveNotificationLink(row);
              return (
                <div className="flex justify-end gap-1">
                  {link && (
                    <Button variant="ghost" size="sm" aria-label="Mở" onClick={() => handleOpen(row)}>
                      <ExternalLink />
                    </Button>
                  )}
                  {!row.isRead && (
                    <Button variant="ghost" size="sm" aria-label="Đánh dấu đã đọc" onClick={() => markReadMutation.mutate(row._id)}>
                      <Check />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" aria-label="Xoá" onClick={() => setDeleteTarget(row)}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              );
            }}
          />

          {query.data && query.data.totalPages > 1 && (
            <Pagination page={query.data.page} limit={query.data.limit} total={query.data.total} totalPages={query.data.totalPages} onPageChange={setPage} />
          )}
        </TabsContent>

        <PermissionGuard permission={[PERMISSIONS.NOTIFICATION_BROADCAST, PERMISSIONS.NOTIFICATION_VIEW_ALL]}>
          <TabsContent value="admin">
            <AdminNotificationsTab />
          </TabsContent>
        </PermissionGuard>
      </Tabs>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
        }}
        title="Xoá thông báo"
        message={`Xoá thông báo "${deleteTarget?.title}"? Hành động này không thể hoàn tác.`}
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
