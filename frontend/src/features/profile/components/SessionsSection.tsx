import { useState } from "react";
import { Laptop, ShieldCheck, LogOut } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useMySessions, useRevokeMySession } from "@/features/auth/hooks/useSessions";
import { parseApiError } from "@/utils/parseApiError";
import type { Session } from "@/types/auth.types";

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";

/**
 * Roadmap C2 (Quản lý phiên đăng nhập, DEV-069, 2026-09-19) — self-service,
 * hiện cho MỌI role ở `ProfilePage.tsx` (KHÁC `TwoFactorSection` — chỉ giới
 * hạn ADMIN + role duyệt cấp cao, đây là vệ sinh bảo mật cơ bản hợp lý cho
 * mọi tài khoản, user xác nhận qua AskUserQuestion).
 */
export function SessionsSection() {
  const { data: sessions, isLoading, isError, refetch } = useMySessions();
  const revokeMutation = useRevokeMySession();
  const [target, setTarget] = useState<Session | null>(null);

  return (
    <div className={SECTION_CLASS}>
      <div>
        <h2 className="text-sm font-semibold text-foreground">Phiên đăng nhập</h2>
        <p className="text-xs text-muted-foreground">
          Danh sách thiết bị/trình duyệt đang đăng nhập tài khoản của bạn — thu hồi nếu nghi ngờ có phiên lạ.
        </p>
      </div>

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
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    {session.browser} trên {session.os}
                    {session.isCurrent && (
                      <StatusBadge variant="success">
                        <ShieldCheck className="size-3" /> Phiên hiện tại
                      </StatusBadge>
                    )}
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
          {sessions.length === 0 && <p className="text-sm text-muted-foreground">Không có phiên đăng nhập nào đang hoạt động.</p>}
        </ul>
      )}

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={() => {
          if (!target) return;
          revokeMutation.mutate(target, { onSuccess: () => setTarget(null) });
        }}
        title="Thu hồi phiên đăng nhập"
        message={
          target?.isCurrent
            ? `Đây là phiên bạn đang dùng để xem trang này (${target.browser} trên ${target.os}) — thu hồi sẽ đăng xuất bạn NGAY LẬP TỨC. Tiếp tục?`
            : `Thu hồi phiên đăng nhập "${target?.browser} trên ${target?.os}"? Thiết bị đó sẽ bị đăng xuất.`
        }
        danger
        isLoading={revokeMutation.isPending}
      />
      {revokeMutation.error && (
        <p className="text-xs text-destructive">{parseApiError(revokeMutation.error).message}</p>
      )}
    </div>
  );
}
