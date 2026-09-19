import { useState } from "react";
import { LogOut } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useAllSessions, useRevokeAnySession } from "@/features/users/hooks/useAllSessions";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/utils/parseApiError";
import type { SessionWithUser } from "@/types/auth.types";

const LIMIT = 20;

/**
 * Roadmap C3 (Giám sát phiên đăng nhập toàn hệ thống, DEV-070, 2026-09-19) —
 * trang RIÊNG (khác `UserSessionsModal.tsx` chỉ xem 1 user) cho ADMIN xem +
 * thu hồi phiên đăng nhập của TẤT CẢ user cùng lúc — permission
 * `SESSION_VIEW_ALL`/`SESSION_REVOKE_ALL` dùng LẠI từ C2 (DEV-069), route
 * gate ở `routes/index.tsx`.
 */
export function SessionsMonitorPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [revokeTarget, setRevokeTarget] = useState<SessionWithUser | null>(null);

  const query = useAllSessions({ page, limit: LIMIT, search: debouncedSearch || undefined });
  const revokeMutation = useRevokeAnySession();

  const sessions = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const columns: DataTableColumn<SessionWithUser>[] = [
    {
      key: "user",
      header: "Người dùng",
      render: (row) => (row.user ? `${row.user.fullName} (${row.user.username})` : "—"),
    },
    {
      key: "browser",
      header: "Thiết bị",
      render: (row) => `${row.browser} trên ${row.os}`,
    },
    { key: "ip", header: "IP", render: (row) => row.ip ?? "—" },
    {
      key: "createdAt",
      header: "Đăng nhập lúc",
      render: (row) => new Date(row.createdAt).toLocaleString("vi-VN"),
    },
    {
      key: "expiresAt",
      header: "Hết hạn lúc",
      render: (row) => new Date(row.expiresAt).toLocaleString("vi-VN"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Giám sát phiên đăng nhập"
        description="Toàn bộ phiên đăng nhập còn hiệu lực của mọi user trong hệ thống — hữu ích khi cần rà soát tài khoản nghi bị lộ."
      />

      <FilterBar
        onReset={() => {
          setSearch("");
          setPage(1);
        }}
      >
        <div className="min-w-56 space-y-1.5">
          <label htmlFor="session-search" className="text-xs font-medium text-muted-foreground">
            Tìm kiếm user (username/họ tên)
          </label>
          <input
            id="session-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập username hoặc họ tên..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={sessions}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Không có phiên đăng nhập nào đang hoạt động"
        emptyMessage="Điều chỉnh lại từ khoá tìm kiếm nếu bạn đang lọc theo user."
        rowActions={(row) => (
          <Button variant="ghost" size="sm" onClick={() => setRevokeTarget(row)} aria-label="Thu hồi phiên">
            <LogOut className="text-destructive" />
          </Button>
        )}
      />

      {pagination && (
        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (!revokeTarget?.user) return;
          revokeMutation.mutate(
            { userId: revokeTarget.user._id, sessionId: revokeTarget._id },
            { onSuccess: () => setRevokeTarget(null) },
          );
        }}
        title="Thu hồi phiên đăng nhập"
        message={`Thu hồi phiên "${revokeTarget?.browser} trên ${revokeTarget?.os}" của user "${revokeTarget?.user?.username}"? Thiết bị đó sẽ bị đăng xuất ngay.`}
        danger
        isLoading={revokeMutation.isPending}
      />
    </div>
  );
}
