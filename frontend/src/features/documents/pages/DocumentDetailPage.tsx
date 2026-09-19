import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2, RotateCcw, Send, Check, X, Ban, FlagOff, FileDown } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PERMISSIONS } from "@/constants/permissions";
import { useDocument } from "@/features/documents/hooks/useDocument";
import { useDeleteDocument } from "@/features/documents/hooks/useDeleteDocument";
import { useRestoreDocument } from "@/features/documents/hooks/useRestoreDocument";
import { useDocumentWorkflow } from "@/features/documents/hooks/useDocumentWorkflow";
import { useReportsByProposal } from "@/features/documents/hooks/useReportsByProposal";
import { useExportDocumentPdf } from "@/features/documents/hooks/useExportDocumentPdf";
import { useAsset } from "@/features/assets/hooks/useAsset";
import { WorkflowStatusBadge } from "@/features/documents/components/WorkflowStatusBadge";
import { DocumentMetaView } from "@/features/documents/components/DocumentMetaView";
import { DocumentEditModal } from "@/features/documents/components/DocumentEditModal";
import { SubmitWorkflowModal } from "@/features/documents/components/SubmitWorkflowModal";
import { WorkflowStepsView } from "@/features/documents/components/WorkflowStepsView";
import { WorkflowActionModal } from "@/features/documents/components/WorkflowActionModal";
import { DocumentVersionHistory } from "@/features/documents/components/DocumentVersionHistory";
import {
  useApproveWorkflow,
  useRejectWorkflow,
  useCancelWorkflow,
  useCompleteWorkflow,
} from "@/features/documents/hooks/useWorkflowActions";
import { parseApiError } from "@/utils/parseApiError";

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = usePermission();
  const isAdmin = useIsAdmin();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelWfOpen, setCancelWfOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const documentQuery = useDocument(id);
  const document = documentQuery.data;

  const workflowQuery = useDocumentWorkflow(document?.isActive ? id : undefined);
  const reportsQuery = useReportsByProposal(document?._id, document?.category === "PROPOSAL");
  const assetQuery = useAsset(document?.relatedAsset, hasPermission(PERMISSIONS.ASSET_VIEW_DETAIL));

  const deleteMutation = useDeleteDocument();
  const restoreMutation = useRestoreDocument();
  const exportPdfMutation = useExportDocumentPdf();
  const approveMutation = useApproveWorkflow();
  const rejectMutation = useRejectWorkflow();
  const cancelWfMutation = useCancelWorkflow();
  const completeMutation = useCompleteWorkflow();

  if (documentQuery.isLoading) return <LoadingState label="Đang tải tài liệu..." />;
  if (documentQuery.isError || !document) {
    return (
      <ErrorState
        message={documentQuery.error ? parseApiError(documentQuery.error).message : "Không tìm thấy tài liệu"}
        onRetry={() => documentQuery.refetch()}
      />
    );
  }

  const sameDepartment = !!user?.department && document.department?._id === user.department._id;
  const canEdit =
    isAdmin || (sameDepartment && document.workflowStatus !== "approved" && document.workflowStatus !== "completed");

  // FE-05 — điều kiện hiển thị action Duyệt/Từ chối/Huỷ/Hoàn tất, PHẢN CHIẾU
  // ĐÚNG business rule đã xác nhận từ source (`workflow.service.ts`):
  //   - Duyệt/Từ chối: khi workflow "pending" VÀ (role người dùng khớp
  //     `steps[currentStep].role` HOẶC người dùng là ADMIN — xem đề xuất #2,
  //     DEV-038). Backend so khớp y hệt ở `approveStep`/`rejectStep` — FE
  //     tính lại đây CHỈ để ẩn/hiện nút, backend vẫn tự kiểm tra lại khi
  //     nhận request, không tin tưởng mù quáng phía FE.
  //   - Huỷ: CHỈ người tạo document, CHỈ khi CHƯA có bước nào được duyệt
  //     (`currentStep===0 && steps[0].status==="pending"` — khớp
  //     `cancelWorkflow()`).
  //   - Hoàn tất: CHỈ người tạo document, CHỈ khi workflow đã "approved"
  //     toàn bộ (khớp `completeWorkflow()`).
  const wf = workflowQuery.data;
  const isCreator = !!user?._id && document.createdBy?._id === user._id;
  const currentStepRole = wf ? wf.steps[wf.currentStep]?.role : undefined;
  const isRoleMatch = !!currentStepRole && currentStepRole === user?.role?.name;
  // ⚠️ NÂNG CẤP (2026-09-10, DEV-038 đề xuất #2 — user yêu cầu làm tiếp):
  // trước đây ADMIN KHÔNG thấy nút Duyệt/Từ chối trừ khi role của chính
  // ADMIN khớp `step.role` — nếu toàn bộ user mang role đó bị vô hiệu
  // hoá/nghỉ, KHÔNG AI (kể cả ADMIN) có cách xử lý document kẹt lại. Backend
  // (`approveStep`/`rejectStep`) giờ cho ADMIN "duyệt/từ chối thay" — FE
  // phải hiện nút tương ứng thì tính năng mới dùng được, nếu không backend
  // hỗ trợ nhưng không ai bấm được (cùng lớp lỗi với đề xuất #1: backend có
  // sẵn nhưng UI chặn mất).
  const isOverrideApproval = isAdmin && !isRoleMatch;
  const canApproveOrReject = !!wf && wf.status === "pending" && !!currentStepRole && (isRoleMatch || isAdmin);
  const canCancelWorkflow =
    !!wf && wf.status === "pending" && wf.currentStep === 0 && wf.steps[0]?.status === "pending" && isCreator;
  const canCompleteWorkflow = !!wf && wf.status === "approved" && isCreator;

  // ⚠️ SỬA (2026-09-10, DEV-038 đề xuất #1 — user yêu cầu làm tiếp): trước
  // đây nút Submit CHỈ hiện khi document CHƯA TỪNG submit lần nào
  // (`workflowStatus==="pending" && !workflowQuery.data`) — sau khi 1
  // workflow bị "rejected"/"cancelled", `workflowQuery.data` LUÔN có giá
  // trị (tìm thấy workflow CŨ) nên nút KHÔNG BAO GIỜ hiện lại, dù backend
  // (`submitWorkflow()`) không có guard nào chặn submit lần 2 — comment sẵn
  // có ở `getWorkflowByDocument()` xác nhận đây là use-case CÓ CHỦ Ý: "submit
  // lần đầu bị huỷ, rồi submit lại lần 2 với template khác". Dùng
  // `workflowQuery.notSubmitted` (flag riêng, chính xác hơn `!workflowQuery.data`
  // — không bị "nhấp nháy" hiện nhầm lúc query đang loading) thay vì suy ra
  // từ `workflowStatus`.
  const canSubmitWorkflow =
    workflowQuery.notSubmitted || document.workflowStatus === "rejected" || document.workflowStatus === "cancelled";

  return (
    <div className="space-y-4">
      <PageHeader
        title={document.title}
        description={document.documentCode}
        breadcrumb={[{ label: "Tài liệu", to: "/app/documents" }, { label: document.documentCode }]}
        actions={
          <div className="flex gap-2">
            {document.isActive ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportPdfMutation.mutate({ id: document._id, documentCode: document.documentCode })}
                  disabled={exportPdfMutation.isPending}
                >
                  <FileDown /> Xuất PDF
                </Button>
                {document.category === "PROPOSAL" && canSubmitWorkflow && (
                  <PermissionGuard permission={PERMISSIONS.WORKFLOW_SUBMIT}>
                    <Button variant="secondary" size="sm" onClick={() => setSubmitOpen(true)}>
                      <Send /> {workflowQuery.notSubmitted ? "Submit vào workflow" : "Gửi duyệt lại"}
                    </Button>
                  </PermissionGuard>
                )}
                {canEdit && (
                  <PermissionGuard permission={PERMISSIONS.DOCUMENT_UPDATE}>
                    <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                      <Pencil /> Sửa
                    </Button>
                  </PermissionGuard>
                )}
                {isAdmin && (
                  <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                    <Trash2 /> Xoá
                  </Button>
                )}
              </>
            ) : (
              <PermissionGuard permission={PERMISSIONS.DOCUMENT_UPDATE}>
                <Button variant="secondary" size="sm" onClick={() => setRestoreOpen(true)}>
                  <RotateCcw /> Khôi phục
                </Button>
              </PermissionGuard>
            )}
          </div>
        }
      />

      {/* Identity + Status */}
      <div className={SECTION_CLASS}>
        <div className="flex flex-wrap items-center gap-2">
          <WorkflowStatusBadge status={document.workflowStatus} />
          <StatusBadge variant={document.isActive ? "success" : "default"}>
            {document.isActive ? "Đang hoạt động" : "Đã ẩn"}
          </StatusBadge>
          <StatusBadge variant="info">{document.category}</StatusBadge>
          <StatusBadge variant="default">{document.subType}</StatusBadge>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Khoa/Phòng</dt>
            <dd className="text-foreground">{document.department?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Người tạo</dt>
            <dd className="text-foreground">{document.createdBy?.fullName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Ngày tạo</dt>
            <dd className="text-foreground">{new Date(document.createdAt).toLocaleString("vi-VN")}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Cập nhật gần nhất</dt>
            <dd className="text-foreground">{new Date(document.updatedAt).toLocaleString("vi-VN")}</dd>
          </div>
          {document.relatedAsset && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Tài sản liên quan</dt>
              <dd className="text-foreground">
                {assetQuery.data ? `${assetQuery.data.assetCode} — ${assetQuery.data.name}` : document.relatedAsset}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Metadata / Items */}
      <div className={SECTION_CLASS}>
        <h2 className="text-sm font-semibold text-foreground">Nội dung</h2>
        <DocumentMetaView subType={document.subType} meta={document.meta} />
      </div>

      {/* Roadmap A4 — Lịch sử chỉnh sửa nội dung (title/meta) */}
      <DocumentVersionHistory document={document} />

      {/* Reports liên quan (chỉ PROPOSAL) */}
      {document.category === "PROPOSAL" && (
        <div className={SECTION_CLASS}>
          <h2 className="text-sm font-semibold text-foreground">Biên bản liên quan</h2>
          {reportsQuery.isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
          {reportsQuery.data && reportsQuery.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có biên bản nào tham chiếu tới đề xuất này.</p>
          )}
          {reportsQuery.data && reportsQuery.data.length > 0 && (
            <ul className="space-y-1">
              {reportsQuery.data.map((r) => (
                <li key={r._id}>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => navigate(`/app/documents/${r._id}`)}
                  >
                    {r.documentCode} — {r.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Workflow */}
      <div className={SECTION_CLASS}>
        <h2 className="text-sm font-semibold text-foreground">Workflow</h2>
        {workflowQuery.isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
        {workflowQuery.notSubmitted && (
          <p className="text-sm text-muted-foreground">Tài liệu này chưa được submit vào workflow nào.</p>
        )}
        {workflowQuery.isError && !workflowQuery.notSubmitted && (
          <ErrorState message={parseApiError(workflowQuery.error).message} onRetry={() => workflowQuery.refetch()} />
        )}
        {workflowQuery.data && <WorkflowStepsView workflow={workflowQuery.data} />}
        {workflowQuery.data && canApproveOrReject && isOverrideApproval && (
          <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            Bước này dành cho role "{currentStepRole}" — bạn đang duyệt/từ chối THAY với quyền ADMIN. Hành động sẽ
            được ghi rõ trong lịch sử là "duyệt thay"/"từ chối thay", không giả làm đúng role.
          </p>
        )}
        {workflowQuery.data && (canApproveOrReject || canCancelWorkflow || canCompleteWorkflow) && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {canApproveOrReject && (
              <PermissionGuard permission={PERMISSIONS.WORKFLOW_APPROVE}>
                <Button size="sm" onClick={() => setApproveOpen(true)}>
                  <Check /> {isOverrideApproval ? "Duyệt thay" : "Duyệt"}
                </Button>
              </PermissionGuard>
            )}
            {canApproveOrReject && (
              <PermissionGuard permission={PERMISSIONS.WORKFLOW_REJECT}>
                <Button variant="destructive" size="sm" onClick={() => setRejectOpen(true)}>
                  <X /> {isOverrideApproval ? "Từ chối thay" : "Từ chối"}
                </Button>
              </PermissionGuard>
            )}
            {canCancelWorkflow && (
              <PermissionGuard permission={PERMISSIONS.WORKFLOW_CANCEL}>
                <Button variant="secondary" size="sm" onClick={() => setCancelWfOpen(true)}>
                  <Ban /> Huỷ workflow
                </Button>
              </PermissionGuard>
            )}
            {canCompleteWorkflow && (
              <PermissionGuard permission={PERMISSIONS.WORKFLOW_COMPLETE}>
                <Button variant="secondary" size="sm" onClick={() => setCompleteOpen(true)}>
                  <FlagOff /> Đánh dấu hoàn tất
                </Button>
              </PermissionGuard>
            )}
          </div>
        )}
      </div>

      {editOpen && <DocumentEditModal key={document._id} open={editOpen} onClose={() => setEditOpen(false)} document={document} />}
      {submitOpen && <SubmitWorkflowModal key={document._id} open={submitOpen} onClose={() => setSubmitOpen(false)} documentId={document._id} />}

      {wf && (
        <>
          <WorkflowActionModal
            key={`approve-${wf._id}`}
            open={approveOpen}
            onClose={() => setApproveOpen(false)}
            title={isOverrideApproval ? "Duyệt thay (quyền ADMIN)" : "Duyệt workflow"}
            message={
              isOverrideApproval
                ? `Bước "${wf.steps[wf.currentStep]?.name}" dành cho role "${currentStepRole}" — bạn đang duyệt THAY với quyền ADMIN cho tài liệu "${document.title}". Hành động sẽ được ghi rõ là "duyệt thay" trong lịch sử.`
                : `Duyệt bước "${wf.steps[wf.currentStep]?.name}" cho tài liệu "${document.title}"?`
            }
            confirmLabel={isOverrideApproval ? "Duyệt thay" : "Duyệt"}
            isLoading={approveMutation.isPending}
            onConfirm={(comment) =>
              approveMutation.mutate(
                { id: wf._id, comment, documentId: document._id },
                { onSuccess: () => setApproveOpen(false) },
              )
            }
          />
          <WorkflowActionModal
            key={`reject-${wf._id}`}
            open={rejectOpen}
            onClose={() => setRejectOpen(false)}
            title={isOverrideApproval ? "Từ chối thay (quyền ADMIN)" : "Từ chối workflow"}
            message={
              isOverrideApproval
                ? `Bước "${wf.steps[wf.currentStep]?.name}" dành cho role "${currentStepRole}" — bạn đang từ chối THAY với quyền ADMIN. Hành động sẽ được ghi rõ là "từ chối thay" trong lịch sử. Người tạo sẽ nhận được thông báo kèm ghi chú.`
                : `Từ chối tài liệu "${document.title}"? Người tạo sẽ nhận được thông báo kèm ghi chú.`
            }
            confirmLabel={isOverrideApproval ? "Từ chối thay" : "Từ chối"}
            danger
            commentRequired
            isLoading={rejectMutation.isPending}
            onConfirm={(comment) =>
              rejectMutation.mutate(
                { id: wf._id, comment, documentId: document._id },
                { onSuccess: () => setRejectOpen(false) },
              )
            }
          />
          <WorkflowActionModal
            key={`cancel-${wf._id}`}
            open={cancelWfOpen}
            onClose={() => setCancelWfOpen(false)}
            title="Huỷ workflow"
            message={`Huỷ workflow của tài liệu "${document.title}"? Chỉ huỷ được khi chưa có bước nào được duyệt.`}
            confirmLabel="Huỷ workflow"
            danger
            isLoading={cancelWfMutation.isPending}
            onConfirm={(comment) =>
              cancelWfMutation.mutate(
                { id: wf._id, comment, documentId: document._id },
                { onSuccess: () => setCancelWfOpen(false) },
              )
            }
          />
          <WorkflowActionModal
            key={`complete-${wf._id}`}
            open={completeOpen}
            onClose={() => setCompleteOpen(false)}
            title="Đánh dấu hoàn tất"
            message={`Đánh dấu tài liệu "${document.title}" đã hoàn tất trên thực tế?`}
            confirmLabel="Hoàn tất"
            isLoading={completeMutation.isPending}
            onConfirm={(comment) =>
              completeMutation.mutate(
                { id: wf._id, comment, documentId: document._id },
                { onSuccess: () => setCompleteOpen(false) },
              )
            }
          />
        </>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(document._id, { onSuccess: () => navigate("/app/documents") })}
        title="Xoá tài liệu"
        message="Ẩn tài liệu này? Backend sẽ từ chối nếu còn biên bản tham chiếu hoặc workflow đang chờ duyệt."
        danger
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        onConfirm={() => restoreMutation.mutate(document._id, { onSuccess: () => setRestoreOpen(false) })}
        title="Khôi phục tài liệu"
        message="Khôi phục tài liệu này? Chỉ ADMIN hoặc người tạo tài liệu mới khôi phục được."
        isLoading={restoreMutation.isPending}
      />
    </div>
  );
}
