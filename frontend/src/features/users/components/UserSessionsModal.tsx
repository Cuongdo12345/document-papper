import { useState } from "react";
import { Laptop, LogOut } from "lucide-react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useUserSessions, useRevokeUserSession } from "@/features/users/hooks/useUserSessions";
import type { UserListItem } from "@/types/user.types";
import type { Session } from "@/types/auth.types";

interface UserSessionsModalProps {
  open: boolean;
  onClose: () => void;
  user: UserListItem | null;
}

/**
 * Roadmap C2 (Quản lý phiên đăng nhập, DEV-069, 2026-09-19) — ADMIN xem/thu
 * hồi phiên đăng nhập của 1 user khác (permission `SESSION_VIEW_ALL`/
 * `SESSION_REVOKE_ALL`). KHÔNG có field `isCurrent` — đây là phiên của
 * NGƯỜI KHÁC, không phải của ADMIN đang xem.
 */
export function UserSessionsModal({ open, onClose, user }: UserSessionsModalProps) {
  const { data: sessions, isLoading, isError, refetch } = useUserSessions(user?._id);
  const revokeMutation = useRevokeUserSession(user?._id);
  const [target, setTarget] = useState<Session | null>(null);

  return (
    <AppModal open={open} onClose={onClose} title={`Phiên đăng nhập — ${user?.fullName ?? ""}`} size="lg">
      {isLoading && <LoadingState label="Đang tải danh sách phiên đăng nhập..." />}
      {isError && <ErrorState message="Không tải được danh sách phiên đăng nhập" onRetry={() => refetch()} />}

      {sessions && (
        <ul className="space-y-2">
          {sessions.map((session) => (
            <li
              key={session._id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <Laptop className="size-4 text-muted-foreground" />
                <div>
                  <div className="font-medium text-foreground">
                    {session.browser} trên {session.os}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {session.ip ? `IP ${session.ip} — ` : ""}
                    Đăng nhập lúc {new Date(session.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setTarget(session)} aria-label="Thu hồi phiên">
                <LogOut className="text-destructive" />
              </Button>
            </li>
          ))}
          {sessions.length === 0 && <p className="text-sm text-muted-foreground">User này không có phiên đăng nhập nào đang hoạt động.</p>}
        </ul>
      )}

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={() => {
          if (!target) return;
          revokeMutation.mutate(target._id, { onSuccess: () => setTarget(null) });
        }}
        title="Thu hồi phiên đăng nhập"
        message={`Thu hồi phiên "${target?.browser} trên ${target?.os}" của user "${user?.username}"? Thiết bị đó sẽ bị đăng xuất ngay.`}
        danger
        isLoading={revokeMutation.isPending}
      />
    </AppModal>
  );
}
