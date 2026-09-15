import { AppDrawer } from "@/components/shared/AppDrawer";
import { AuditActionBadge } from "@/features/audit/components/AuditActionBadge";
import type { AuditLogItem } from "@/types/audit.types";

function formatPerson(person?: AuditLogItem["performedBy"]): string {
  if (!person) return "—";
  return person.email ? `${person.username} (${person.email})` : person.username;
}

interface AuditLogDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  log: AuditLogItem | null;
}

/**
 * Roadmap Mục 17: "Chi tiết audit nên mở bằng Drawer/Modal để giữ bảng dễ
 * scan". CHỈ hiển thị lại field đã có sẵn trong response list (KHÔNG có
 * endpoint `GET /user-audits/:id` riêng để gọi thêm) — không cần permission
 * riêng ngoài `AUDIT_VIEW` đã cho phép xem list (`AUDIT_VIEW_DETAIL` được
 * khai báo ở `permission.constant.ts` nhưng KHÔNG được enforce ở bất kỳ
 * route/middleware nào — xác nhận qua grep toàn backend — nên không tự bịa
 * thêm 1 lớp permission-gate mà backend chưa yêu cầu, evidence-based theo
 * CLAUDE.md Mục 19).
 */
export function AuditLogDetailDrawer({ open, onClose, log }: AuditLogDetailDrawerProps) {
  return (
    <AppDrawer open={open} onClose={onClose} title="Chi tiết nhật ký audit" width="sm">
      {log && (
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Hành động</dt>
            <dd className="mt-1">
              <AuditActionBadge action={log.action} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Thời gian</dt>
            <dd className="mt-1 text-foreground">{new Date(log.createdAt).toLocaleString("vi-VN")}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Người thực hiện</dt>
            <dd className="mt-1 text-foreground">{formatPerson(log.performedBy)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Đối tượng tác động</dt>
            <dd className="mt-1 text-foreground">{formatPerson(log.user)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Ghi chú</dt>
            <dd className="mt-1 whitespace-pre-wrap text-foreground">{log.note || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Mã bản ghi</dt>
            <dd className="mt-1 font-mono text-xs text-muted-foreground">{log._id}</dd>
          </div>
        </dl>
      )}
    </AppDrawer>
  );
}
