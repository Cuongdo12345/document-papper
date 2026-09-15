import { useState } from "react";
import { CalendarPlus, Pencil, Check, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ErrorState } from "@/components/shared/ErrorState";
import { Pagination } from "@/components/shared/Pagination";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { useMaintenancePlansForAsset } from "@/features/assets/hooks/useMaintenancePlansForAsset";
import { useCompleteMaintenancePlan, useCancelMaintenancePlan } from "@/features/assets/hooks/useMaintenancePlanActions";
import { CreateMaintenancePlanModal } from "@/features/assets/components/CreateMaintenancePlanModal";
import { EditMaintenancePlanModal } from "@/features/assets/components/EditMaintenancePlanModal";
import { WorkflowActionModal } from "@/features/documents/components/WorkflowActionModal";
import { parseApiError } from "@/utils/parseApiError";
import type { AssetMaintenancePlan } from "@/types/assetMaintenancePlan.types";

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";
const LIMIT = 5;

function statusBadge(plan: AssetMaintenancePlan) {
  if (plan.status === "completed") return <StatusBadge variant="success">Đã hoàn tất</StatusBadge>;
  if (plan.status === "cancelled") return <StatusBadge variant="default">Đã huỷ</StatusBadge>;
  if (plan.isOverdue) return <StatusBadge variant="destructive">Trễ hạn</StatusBadge>;
  return <StatusBadge variant="info">Đã lên lịch</StatusBadge>;
}

/**
 * Roadmap B2 (2026-09-15) — "Lịch bảo trì" trong `AssetDetailPage`. ĐỘC LẬP
 * hoàn toàn với `AssetAssignmentHistorySection`/`CalibrationHistoryList`
 * (khác domain nghiệp vụ) nhưng CÙNG pattern hiển thị lịch sử theo asset.
 */
export function MaintenancePlanHistorySection({ assetId }: { assetId: string }) {
  const { hasPermission } = usePermission();
  const canView = hasPermission(PERMISSIONS.ASSET_MAINTENANCE_PLAN_VIEW);

  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AssetMaintenancePlan | null>(null);
  const [completingPlan, setCompletingPlan] = useState<AssetMaintenancePlan | null>(null);
  const [cancellingPlan, setCancellingPlan] = useState<AssetMaintenancePlan | null>(null);

  const query = useMaintenancePlansForAsset(canView ? assetId : undefined, { page, limit: LIMIT });
  const completeMutation = useCompleteMaintenancePlan();
  const cancelMutation = useCancelMaintenancePlan();

  if (!canView) return null;

  const plans = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  return (
    <div className={SECTION_CLASS}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Lịch bảo trì</h2>
        <PermissionGuard permission={PERMISSIONS.ASSET_MAINTENANCE_PLAN_CREATE}>
          <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
            <CalendarPlus /> Lên lịch bảo trì
          </Button>
        </PermissionGuard>
      </div>

      {query.isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
      {query.isError && <ErrorState message={parseApiError(query.error).message} onRetry={() => query.refetch()} />}
      {query.data && plans.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có kế hoạch bảo trì nào được lên lịch cho tài sản này.</p>
      )}

      {plans.length > 0 && (
        <ul className="space-y-2">
          {plans.map((p) => (
            <li key={p._id} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{p.title}</span>
                {statusBadge(p)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Ngày dự kiến: {new Date(p.scheduledDate).toLocaleDateString("vi-VN")}</p>
              {p.description && <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>}
              {p.resolutionNote && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.status === "completed" ? "Kết quả" : "Lý do huỷ"}: {p.resolutionNote}
                </p>
              )}
              {p.status === "planned" && (
                <PermissionGuard permission={PERMISSIONS.ASSET_MAINTENANCE_PLAN_UPDATE}>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <button type="button" onClick={() => setEditingPlan(p)} className="flex items-center gap-1 text-primary hover:underline">
                      <Pencil className="size-3" /> Sửa
                    </button>
                    <button type="button" onClick={() => setCompletingPlan(p)} className="flex items-center gap-1 text-primary hover:underline">
                      <Check className="size-3" /> Hoàn tất
                    </button>
                    <button type="button" onClick={() => setCancellingPlan(p)} className="flex items-center gap-1 text-destructive hover:underline">
                      <Ban className="size-3" /> Huỷ
                    </button>
                  </div>
                </PermissionGuard>
              )}
            </li>
          ))}
        </ul>
      )}

      {pagination && pagination.totalPages > 1 && (
        <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}

      {createOpen && <CreateMaintenancePlanModal key="create" open={createOpen} onClose={() => setCreateOpen(false)} assetId={assetId} />}
      {editingPlan && <EditMaintenancePlanModal key={editingPlan._id} open={!!editingPlan} onClose={() => setEditingPlan(null)} plan={editingPlan} />}

      {completingPlan && (
        <WorkflowActionModal
          key={`complete-${completingPlan._id}`}
          open={!!completingPlan}
          onClose={() => setCompletingPlan(null)}
          title="Hoàn tất kế hoạch bảo trì"
          message={`Đánh dấu kế hoạch "${completingPlan.title}" đã hoàn tất?`}
          confirmLabel="Hoàn tất"
          isLoading={completeMutation.isPending}
          onConfirm={(note) =>
            completeMutation.mutate(
              { id: completingPlan._id, assetId, body: { resolutionNote: note } },
              { onSuccess: () => setCompletingPlan(null) },
            )
          }
        />
      )}

      {cancellingPlan && (
        <WorkflowActionModal
          key={`cancel-${cancellingPlan._id}`}
          open={!!cancellingPlan}
          onClose={() => setCancellingPlan(null)}
          title="Huỷ kế hoạch bảo trì"
          message={`Huỷ kế hoạch "${cancellingPlan.title}"?`}
          confirmLabel="Huỷ kế hoạch"
          danger
          isLoading={cancelMutation.isPending}
          onConfirm={(note) =>
            cancelMutation.mutate(
              { id: cancellingPlan._id, assetId, body: { resolutionNote: note } },
              { onSuccess: () => setCancellingPlan(null) },
            )
          }
        />
      )}
    </div>
  );
}
