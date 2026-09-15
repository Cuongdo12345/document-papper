import { useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useWorkflowOverdueApprovals } from "@/features/dashboard/hooks/useWorkflowOverdueApprovals";
import { parseApiError } from "@/utils/parseApiError";
import type { OverdueApprovalItem } from "@/types/dashboard.types";

const columns: DataTableColumn<OverdueApprovalItem>[] = [
  {
    key: "documentTitle",
    header: "Tài liệu",
    className: "max-w-56 truncate",
    render: (row) => (
      <Link to={`/app/documents/${row.documentId}`} className="font-medium text-foreground hover:underline" title={row.documentTitle}>
        {row.documentCode} — {row.documentTitle}
      </Link>
    ),
  },
  { key: "stepName", header: "Bước đang chờ", render: (row) => `${row.stepName} (${row.stepRole})` },
  { key: "slaDays", header: "SLA (ngày)", className: "text-right" },
  { key: "daysPending", header: "Đã chờ (ngày)", className: "text-right" },
  {
    key: "status",
    header: "Trạng thái",
    render: (row) =>
      row.escalatedAt ? (
        <StatusBadge variant="destructive">Đã escalate ADMIN</StatusBadge>
      ) : row.reminderSentAt ? (
        <StatusBadge variant="warning">Đã nhắc</StatusBadge>
      ) : (
        <StatusBadge variant="default">Chưa nhắc</StatusBadge>
      ),
  },
];

/** Roadmap B1 — `GET /dashboard/workflow/overdue-approvals`. */
export function WorkflowOverdueApprovalsWidget() {
  const [page, setPage] = useState(1);
  const query = useWorkflowOverdueApprovals({ page, limit: 10 });

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        keyExtractor={(row) => row.workflowInstanceId}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Không có đề xuất nào trễ hạn duyệt"
      />

      {query.data?.pagination && query.data.pagination.totalPages > 1 && (
        <Pagination
          page={query.data.pagination.page}
          limit={query.data.pagination.limit}
          total={query.data.pagination.total}
          totalPages={query.data.pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
