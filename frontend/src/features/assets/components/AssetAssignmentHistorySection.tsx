import { useState } from "react";
import { Pagination } from "@/components/shared/Pagination";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAssetAssignmentHistory } from "@/features/assets/hooks/useAssetAssignmentHistory";
import { parseApiError } from "@/utils/parseApiError";
import type { AssetAssignmentActionType } from "@/types/asset.types";

const ACTION_LABEL: Record<AssetAssignmentActionType, string> = {
  ASSIGN: "Cấp phát",
  TRANSFER: "Luân chuyển",
  RETURN: "Thu hồi",
};

const LIMIT = 5;

/** Section riêng (Mục 12 roadmap: "Assignment history" là 1 nhóm trong Asset Detail) — bảng nhỏ, không dùng `DataTable` đầy đủ (chỉ đọc, không sort/action). */
export function AssetAssignmentHistorySection({ assetId }: { assetId: string }) {
  const [page, setPage] = useState(1);
  const query = useAssetAssignmentHistory(assetId, { page, limit: LIMIT });
  const history = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>;
  if (query.isError) {
    return <ErrorState message={parseApiError(query.error).message} onRetry={() => query.refetch()} />;
  }
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có lịch sử cấp phát/luân chuyển nào.</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {history.map((h) => (
          <li key={h._id} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-foreground">{ACTION_LABEL[h.actionType]}</span>
              <span className="text-xs text-muted-foreground">{new Date(h.effectiveAt).toLocaleString("vi-VN")}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {h.fromDepartment?.name ?? "—"}
              {h.fromUser ? ` (${h.fromUser.fullName})` : ""} → {h.toDepartment?.name ?? "—"}
              {h.toUser ? ` (${h.toUser.fullName})` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Thực hiện bởi {h.handedOverBy.fullName}
              {h.reason ? ` — ${h.reason}` : ""}
            </p>
          </li>
        ))}
      </ul>
      {pagination && pagination.totalPages > 1 && (
        <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
