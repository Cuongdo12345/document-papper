import { useState } from "react";
import { Send } from "lucide-react";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { useAllNotificationsAdmin } from "@/features/notifications/hooks/useAllNotificationsAdmin";
import { useUsers } from "@/features/users/hooks/useUsers";
import { getNotificationTypeLabel } from "@/features/notifications/components/NotificationTypeLabel";
import { BroadcastNotificationModal } from "@/features/notifications/components/BroadcastNotificationModal";
import { parseApiError } from "@/utils/parseApiError";
import { NOTIFICATION_TYPES, type AdminNotificationItem, type NotificationType } from "@/types/notification.types";

const LIMIT = 20;

function formatPerson(person?: AdminNotificationItem["recipient"]): string {
  return person ? `${person.fullName} (${person.username})` : "—";
}

/**
 * Tab "Quản trị" (`NotificationsPage`) — 2 quyền TÁCH BIỆT, tự ẩn phần
 * tương ứng nếu thiếu (1 role về lý thuyết có thể có quyền này mà không có
 * quyền kia, dù hiện tại chỉ ADMIN có cả 2 — xem `permission.constant.ts`):
 *   - `NOTIFICATION_BROADCAST` → nút "Gửi thông báo hệ thống".
 *   - `NOTIFICATION_VIEW_ALL` → bảng xem TOÀN BỘ thông báo mọi user.
 * CHỦ Ý KHÔNG có action Xoá/Đánh dấu-đã-đọc ở bảng này — đây là view GIÁM
 * SÁT/DEBUG (đọc), không phải nơi admin thay đổi trạng thái thông báo của
 * người khác (thông báo vẫn thuộc sở hữu người nhận, kể cả khi admin xem
 * được). Chỉ trang tự-scope (`NotificationsPage` tab "Thông báo của tôi")
 * mới có 2 action đó, đúng cho thông báo của CHÍNH mình.
 */
export function AdminNotificationsTab() {
  const { hasPermission } = usePermission();
  const canViewAll = hasPermission(PERMISSIONS.NOTIFICATION_VIEW_ALL);
  const canBrowseUsers = hasPermission(PERMISSIONS.USER_VIEW);

  const [page, setPage] = useState(1);
  const [recipient, setRecipient] = useState("");
  const [isRead, setIsRead] = useState<"true" | "false" | "">("");
  const [type, setType] = useState<NotificationType | "">("");
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  function resetFilters() {
    setRecipient("");
    setIsRead("");
    setType("");
    setPage(1);
  }

  const usersQuery = useUsers({ limit: 100 }, { enabled: canBrowseUsers && canViewAll });
  const query = useAllNotificationsAdmin(
    {
      page,
      limit: LIMIT,
      recipient: recipient || undefined,
      isRead: isRead === "" ? undefined : isRead === "true",
      type: type || undefined,
    },
    { enabled: canViewAll },
  );

  const items = query.data?.items ?? [];

  const columns: DataTableColumn<AdminNotificationItem>[] = [
    { key: "recipient", header: "Người nhận", render: (row) => formatPerson(row.recipient) },
    { key: "type", header: "Loại", render: (row) => getNotificationTypeLabel(row.type) },
    {
      key: "title",
      header: "Nội dung",
      className: "max-w-80",
      render: (row) => (
        <div className="min-w-0">
          <p className="text-foreground">{row.title}</p>
          <p className="truncate text-xs text-muted-foreground" title={row.message}>
            {row.message}
          </p>
        </div>
      ),
    },
    {
      key: "isRead",
      header: "Trạng thái",
      render: (row) => <StatusBadge variant={row.isRead ? "default" : "primary"}>{row.isRead ? "Đã đọc" : "Chưa đọc"}</StatusBadge>,
    },
    {
      key: "createdAt",
      header: "Thời gian",
      className: "whitespace-nowrap",
      render: (row) => new Date(row.createdAt).toLocaleString("vi-VN"),
    },
    { key: "createdBy", header: "Người gửi", render: (row) => (row.createdBy ? formatPerson(row.createdBy) : "Hệ thống") },
  ];

  return (
    <div className="space-y-4">
      <PermissionGuard permission={PERMISSIONS.NOTIFICATION_BROADCAST}>
        <div>
          <Button size="sm" onClick={() => setBroadcastOpen(true)}>
            <Send /> Gửi thông báo hệ thống
          </Button>
        </div>
      </PermissionGuard>

      {canViewAll && (
        <>
          <FilterBar onReset={resetFilters}>
            {canBrowseUsers && (
              <div className="min-w-44 space-y-1.5">
                <label htmlFor="admin-notif-recipient" className="text-xs font-medium text-muted-foreground">
                  Người nhận
                </label>
                <select
                  id="admin-notif-recipient"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Tất cả</option>
                  {usersQuery.data?.data.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.fullName} ({u.username})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="min-w-40 space-y-1.5">
              <label htmlFor="admin-notif-isRead" className="text-xs font-medium text-muted-foreground">
                Trạng thái
              </label>
              <select
                id="admin-notif-isRead"
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
              <label htmlFor="admin-notif-type" className="text-xs font-medium text-muted-foreground">
                Loại thông báo
              </label>
              <select
                id="admin-notif-type"
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
            emptyMessage="Không có bản ghi nào khớp bộ lọc hiện tại."
          />

          {query.data && query.data.totalPages > 1 && (
            <Pagination page={query.data.page} limit={query.data.limit} total={query.data.total} totalPages={query.data.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <BroadcastNotificationModal open={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
    </div>
  );
}
