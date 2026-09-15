import { useState } from "react";
import { Pagination } from "@/components/shared/Pagination";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { useCalibrationHistory } from "@/features/assets/hooks/useCalibrationHistory";
import { useDownloadCalibrationCertificate } from "@/features/assets/hooks/useDownloadCalibrationCertificate";
import { UpdateCalibrationCertificateModal } from "@/features/assets/components/UpdateCalibrationCertificateModal";
import { parseApiError } from "@/utils/parseApiError";
import type { CalibrationRecordItem, CalibrationResult } from "@/types/medicalDevice.types";

const RESULT_CONFIG: Record<CalibrationResult, { label: string; variant: "success" | "destructive" | "warning" }> = {
  PASS: { label: "Đạt", variant: "success" },
  FAIL: { label: "Không đạt", variant: "destructive" },
  CONDITIONAL_PASS: { label: "Đạt có điều kiện", variant: "warning" },
};

const LIMIT = 5;

/** Section riêng, cùng pattern `AssetAssignmentHistorySection` — chỉ đọc, không sort/action, phân trang riêng. */
export function CalibrationHistoryList({ assetId }: { assetId: string }) {
  const [page, setPage] = useState(1);
  const [editingRecord, setEditingRecord] = useState<CalibrationRecordItem | null>(null);
  const query = useCalibrationHistory(assetId, { page, limit: LIMIT });
  const downloadMutation = useDownloadCalibrationCertificate(assetId);
  const history = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;
  if (query.isError) {
    return <ErrorState message={parseApiError(query.error).message} onRetry={() => query.refetch()} />;
  }
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có lần kiểm định nào được ghi nhận.</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {history.map((r) => {
          const resultConfig = RESULT_CONFIG[r.result];
          return (
            <li key={r._id} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{new Date(r.calibratedAt).toLocaleDateString("vi-VN")}</span>
                <StatusBadge variant={resultConfig.variant}>{resultConfig.label}</StatusBadge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Đơn vị kiểm định: {r.calibratedBy} — hạn kế tiếp: {new Date(r.nextDueDate).toLocaleDateString("vi-VN")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Người ghi nhận: {r.recordedBy.fullName}
                {/* (A2) `certificateFileId` = file thật đã upload — tải qua endpoint có auth (blob), KHÔNG dùng `<a href>` thẳng (Bearer token qua header, xem `AssetQRCodeSection` — cùng lý do). `certificateFileUrl` = link nhập tay, mở trực tiếp được. */}
                {r.certificateFileId && (
                  <>
                    {" — "}
                    <button
                      type="button"
                      onClick={() => downloadMutation.mutate(r)}
                      disabled={downloadMutation.isPending && downloadMutation.variables?._id === r._id}
                      className="text-primary hover:underline disabled:cursor-wait disabled:opacity-60"
                    >
                      {downloadMutation.isPending && downloadMutation.variables?._id === r._id
                        ? "Đang tải..."
                        : "Tải giấy chứng nhận"}
                    </button>
                  </>
                )}
                {!r.certificateFileId && r.certificateFileUrl && (
                  <>
                    {" — "}
                    <a href={r.certificateFileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      Giấy chứng nhận
                    </a>
                  </>
                )}
                {/* Bổ sung sau A2 (yêu cầu user): sửa lại được nếu upload nhầm file — cùng permission ghi nhận kiểm định (MEDICAL_DEVICE_CALIBRATE), không phải quyền xem. */}
                <PermissionGuard permission={PERMISSIONS.MEDICAL_DEVICE_CALIBRATE}>
                  {" — "}
                  <button type="button" onClick={() => setEditingRecord(r)} className="text-primary hover:underline">
                    {r.certificateFileId || r.certificateFileUrl ? "Sửa chứng nhận" : "Thêm chứng nhận"}
                  </button>
                </PermissionGuard>
              </p>
            </li>
          );
        })}
      </ul>
      {pagination && pagination.totalPages > 1 && (
        <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}
      {editingRecord && (
        <UpdateCalibrationCertificateModal
          key={editingRecord._id}
          open={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          assetId={assetId}
          record={editingRecord}
        />
      )}
    </div>
  );
}
