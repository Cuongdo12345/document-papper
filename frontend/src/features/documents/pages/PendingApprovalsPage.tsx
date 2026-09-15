import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { usePendingApprovals } from "@/features/documents/hooks/usePendingApprovals";
import { useApproveWorkflow, useRejectWorkflow } from "@/features/documents/hooks/useWorkflowActions";
import { WorkflowActionModal } from "@/features/documents/components/WorkflowActionModal";
import { WorkflowHistoryList } from "@/features/documents/components/WorkflowHistoryList";
import { parseApiError } from "@/utils/parseApiError";
import type { WorkflowPendingItem } from "@/types/workflow.types";

const LIMIT = 10;

/**
 * FE-05 — "Hộp thư chờ duyệt" (roadmap Mục 11). `GET /workflows/pending` tự
 * lọc theo `req.user.role.name` khớp `steps[currentStep].role` — MỌI dòng
 * trả về ở trang này ĐÃ CHẮC CHẮN đúng người/đúng bước (khác `DocumentDetailPage`
 * phải tự tính lại điều kiện vì có thể xem workflow KHÔNG phải của mình).
 * Vì vậy ở đây chỉ cần permission-gate (`WORKFLOW_APPROVE`/`WORKFLOW_REJECT`),
 * không cần tính lại role/step matching.
 *
 * MỚI (2026-09-10, user yêu cầu trực tiếp): thêm tab "Lịch sử" (
 * `WorkflowHistoryList`) cạnh tab "Đang chờ" gốc — CÙNG route
 * `/app/workflows/pending`, CÙNG permission gate (`WORKFLOW_VIEW`), tránh
 * thêm route/mục sidebar mới cho 1 view khác của CÙNG domain (CLAUDE.md Mục
 * 20 — không đổi layout ngoài phạm vi cần thiết). Cùng pattern in-page Tabs
 * đã dùng ở `AuditLogsPage` (segmented control, KHÔNG phải route-tabs kiểu
 * `AssetSectionTabs` — 2 tab ở đây cùng permission, không phải 2 resource
 * CRUD riêng biệt).
 */
export function PendingApprovalsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [approveTarget, setApproveTarget] = useState<WorkflowPendingItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<WorkflowPendingItem | null>(null);

  const query = usePendingApprovals({ page, limit: LIMIT });
  const approveMutation = useApproveWorkflow();
  const rejectMutation = useRejectWorkflow();

  const items = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const columns: DataTableColumn<WorkflowPendingItem>[] = [
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
    {
      key: "step",
      header: "Bước hiện tại",
      render: (row) => `Bước ${row.currentStep + 1}: ${row.steps[row.currentStep]?.name ?? "—"}`,
    },
    {
      key: "template",
      header: "Quy trình",
      render: (row) => (typeof row.templateId === "object" ? row.templateId.name : "—"),
    },
    {
      key: "createdAt",
      header: "Ngày submit",
      render: (row) => new Date(row.createdAt).toLocaleDateString("vi-VN"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Duyệt tài liệu"
        description="Việc đang chờ bạn duyệt, và lịch sử toàn bộ tài liệu bạn từng cần xử lý."
      />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Đang chờ</TabsTrigger>
          <TabsTrigger value="history">Lịch sử</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <DataTable
            columns={columns}
            data={items}
            keyExtractor={(row) => row._id}
            isLoading={query.isLoading}
            isError={query.isError}
            errorMessage={query.error ? parseApiError(query.error).message : undefined}
            onRetry={() => query.refetch()}
            emptyTitle="Không có việc chờ duyệt"
            emptyMessage="Hiện chưa có tài liệu nào cần bạn duyệt."
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
                <PermissionGuard permission={PERMISSIONS.WORKFLOW_APPROVE}>
                  <Button variant="ghost" size="sm" aria-label="Duyệt" onClick={() => setApproveTarget(row)}>
                    <Check className="text-success" />
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission={PERMISSIONS.WORKFLOW_REJECT}>
                  <Button variant="ghost" size="sm" aria-label="Từ chối" onClick={() => setRejectTarget(row)}>
                    <X className="text-destructive" />
                  </Button>
                </PermissionGuard>
              </div>
            )}
          />

          {pagination && (
            <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
          )}
        </TabsContent>

        <TabsContent value="history">
          <WorkflowHistoryList />
        </TabsContent>
      </Tabs>

      {approveTarget && (
        <WorkflowActionModal
          key={`approve-${approveTarget._id}`}
          open={!!approveTarget}
          onClose={() => setApproveTarget(null)}
          title="Duyệt workflow"
          message={`Duyệt bước "${approveTarget.steps[approveTarget.currentStep]?.name}" cho tài liệu "${approveTarget.documentId.title}"?`}
          confirmLabel="Duyệt"
          isLoading={approveMutation.isPending}
          onConfirm={(comment) =>
            approveMutation.mutate(
              { id: approveTarget._id, comment, documentId: approveTarget.documentId._id },
              { onSuccess: () => setApproveTarget(null) },
            )
          }
        />
      )}

      {rejectTarget && (
        <WorkflowActionModal
          key={`reject-${rejectTarget._id}`}
          open={!!rejectTarget}
          onClose={() => setRejectTarget(null)}
          title="Từ chối workflow"
          message={`Từ chối tài liệu "${rejectTarget.documentId.title}"? Người tạo sẽ nhận được thông báo kèm ghi chú.`}
          confirmLabel="Từ chối"
          danger
          commentRequired
          isLoading={rejectMutation.isPending}
          onConfirm={(comment) =>
            rejectMutation.mutate(
              { id: rejectTarget._id, comment, documentId: rejectTarget.documentId._id },
              { onSuccess: () => setRejectTarget(null) },
            )
          }
        />
      )}
    </div>
  );
}
