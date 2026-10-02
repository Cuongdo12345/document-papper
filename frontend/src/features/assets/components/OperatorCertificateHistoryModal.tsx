import { AppModal } from "@/components/shared/AppModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ErrorState } from "@/components/shared/ErrorState";
import { useOperatorCertificateHistory } from "@/features/assets/hooks/useOperatorCertificateHistory";
import { parseApiError } from "@/utils/parseApiError";
import type { OperatorCertificate } from "@/types/operatorCertificate.types";

interface OperatorCertificateHistoryModalProps {
  open: boolean;
  onClose: () => void;
  deviceCategoryId: string;
  deviceCategoryName: string;
}

/**
 * [MỚI DEV-078] Lịch sử ĐẦY ĐỦ chứng chỉ vận hành của 1 danh mục — KHÁC list
 * "Người vận hành đủ điều kiện" trong `MedicalDeviceSection` (chỉ hiện
 * người CÒN HẠN, dedupe theo user). Modal này hiện MỌI bản ghi (còn hạn/hết
 * hạn tự nhiên/đã thu hồi/đã xoá mềm) — đáp ứng nhu cầu tra soát/thanh tra
 * đã ghi nhận là gap ở `DEV-078.md` Mục 6.
 */
function statusOf(cert: OperatorCertificate): { label: string; variant: "success" | "warning" | "destructive" | "default" } {
  if (cert.isActive === false && cert.revokedAt) return { label: "Đã thu hồi", variant: "destructive" };
  if (cert.isActive === false && cert.deletedAt) return { label: "Đã xoá", variant: "default" };
  if (new Date(cert.expiresAt) < new Date()) return { label: "Đã hết hạn", variant: "warning" };
  return { label: "Còn hạn", variant: "success" };
}

export function OperatorCertificateHistoryModal({ open, onClose, deviceCategoryId, deviceCategoryName }: OperatorCertificateHistoryModalProps) {
  const query = useOperatorCertificateHistory(deviceCategoryId, open);

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Lịch sử chứng chỉ vận hành"
      description={`Danh mục thiết bị: ${deviceCategoryName} — bao gồm cả chứng chỉ đã hết hạn/thu hồi/xoá.`}
      size="lg"
    >
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : query.isError ? (
        <ErrorState message={query.error ? parseApiError(query.error).message : "Không tải được lịch sử"} onRetry={() => query.refetch()} />
      ) : !query.data?.length ? (
        <p className="text-sm text-muted-foreground">Chưa có chứng chỉ nào từng được cấp cho danh mục này.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {query.data.map((cert) => {
            const user = typeof cert.user === "object" ? cert.user : undefined;
            const status = statusOf(cert);
            return (
              <li key={cert._id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {user?.fullName ?? "—"} <span className="font-normal text-muted-foreground">({user?.username})</span>
                  </span>
                  <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cert.certificateNumber && <>Số {cert.certificateNumber} — </>}
                  Cấp {new Date(cert.issuedAt).toLocaleDateString("vi-VN")} — Hạn {new Date(cert.expiresAt).toLocaleDateString("vi-VN")}
                </p>
                {cert.revokedReason && (
                  <p className="mt-1 text-xs text-destructive">
                    Lý do thu hồi: {cert.revokedReason}
                    {cert.revokedAt && ` (${new Date(cert.revokedAt).toLocaleDateString("vi-VN")})`}
                  </p>
                )}
                {cert.isActive === false && cert.deletedAt && !cert.revokedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">Đã xoá lúc {new Date(cert.deletedAt).toLocaleDateString("vi-VN")}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AppModal>
  );
}
