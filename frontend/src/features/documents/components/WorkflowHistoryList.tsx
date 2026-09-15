import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { WorkflowStatusBadge } from "@/features/documents/components/WorkflowStatusBadge";
import { useWorkflowHistory } from "@/features/documents/hooks/useWorkflowHistory";
import { parseApiError } from "@/utils/parseApiError";
import { WORKFLOW_STATUSES } from "@/types/document.types";
import type { WorkflowHistoryItem } from "@/types/workflow.types";

const LIMIT = 10;

/** Label riêng cho dropdown filter — cùng nội dung `WorkflowStatusBadge` nhưng KHÔNG export dùng chung (local const, cùng convention `DocumentsListPage.tsx`). */
const STATUS_LABEL: Record<(typeof WORKFLOW_STATUSES)[number], string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã huỷ",
  completed: "Hoàn tất",
};

/**
 * "Lịch sử duyệt" (MỚI, 2026-09-10, user yêu cầu trực tiếp) — tab thứ 2 của
 * `PendingApprovalsPage`. Khác tab "Đang chờ": hiển thị MỌI workflow mà role
 * người dùng từng/đang phải xử lý (không chỉ bước hiện tại), có filter
 * `status`, sort mới nhất trước — xem `GET /workflows/history` (backend).
 * READ-ONLY, không có action Duyệt/Từ chối ở đây (giống `WorkflowStepsView`
 * — xem chi tiết ở trang Document nếu cần hành động).
 */
export function WorkflowHistoryList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<(typeof WORKFLOW_STATUSES)[number] | "">("");

  const query = useWorkflowHistory({ page, limit: LIMIT, status: status || undefined });

  const items = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const columns: DataTableColumn<WorkflowHistoryItem>[] = [
    { key: "documentCode", header: "Mã tài liệu", className: "font-mono", render: (row) => row.documentId.documentCode },
    {
      key: "title",
      header: "Tiêu đề",
      render: (row) => (
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => navigate(`/app/documents/${row.documentId._id}`)}
        >
          {row.documentId.title}
        </button>
      ),
    },
    { key: "status", header: "Trạng thái", render: (row) => <WorkflowStatusBadge status={row.status} /> },
    {
      key: "step",
      header: "Bước hiện tại",
      render: (row) =>
        row.status === "pending"
          ? `Bước ${row.currentStep + 1}: ${row.steps[row.currentStep]?.name ?? "—"}`
          : `${row.steps.length}/${row.steps.length} bước`,
    },
    {
      key: "template",
      header: "Quy trình",
      render: (row) => (typeof row.templateId === "object" ? row.templateId.name : "—"),
    },
    {
      key: "updatedAt",
      header: "Cập nhật lúc",
      render: (row) => new Date(row.updatedAt).toLocaleString("vi-VN"),
    },
  ];

  return (
    <div className="space-y-4">
      <FilterBar onReset={() => setStatus("")}>
        <div className="min-w-40 space-y-1.5">
          <label htmlFor="wf-history-status" className="text-xs font-medium text-muted-foreground">
            Trạng thái
          </label>
          <select
            id="wf-history-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả</option>
            {WORKFLOW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
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
        emptyTitle="Chưa có lịch sử duyệt"
        emptyMessage="Chưa có tài liệu nào từng cần bạn duyệt."
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Xem chi tiết"
              onClick={() => navigate(`/app/documents/${row.documentId._id}`)}
            >
              <Eye />
            </Button>
          </div>
        )}
      />

      {pagination && (
        <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
