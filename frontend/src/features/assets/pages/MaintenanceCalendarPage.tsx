import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarPlus, Wrench } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { cn } from "@/lib/utils";
import { useMaintenanceCalendar } from "@/features/assets/hooks/useMaintenanceCalendar";
import { useCompleteMaintenancePlan, useCancelMaintenancePlan } from "@/features/assets/hooks/useMaintenancePlanActions";
import { CreateMaintenancePlanModal } from "@/features/assets/components/CreateMaintenancePlanModal";
import { EditMaintenancePlanModal } from "@/features/assets/components/EditMaintenancePlanModal";
import { WorkflowActionModal } from "@/features/documents/components/WorkflowActionModal";
import { parseApiError } from "@/utils/parseApiError";
import type { AssetMaintenancePlan } from "@/types/assetMaintenancePlan.types";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const PILL_CLASS_BY_STATE: Record<"overdue" | "planned" | "completed" | "cancelled", string> = {
  overdue: "bg-destructive/10 text-destructive",
  planned: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-muted text-muted-foreground line-through",
};

function pillState(plan: AssetMaintenancePlan): keyof typeof PILL_CLASS_BY_STATE {
  if (plan.status === "completed") return "completed";
  if (plan.status === "cancelled") return "cancelled";
  return plan.isOverdue ? "overdue" : "planned";
}

/** `getDay()` chuẩn JS: 0=CN...6=T7 — quy đổi sang lịch bắt đầu từ Thứ 2 (0=T2...6=CN), khớp `WEEKDAY_LABELS`. */
function mondayFirstDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Roadmap B2 (Lịch bảo trì chủ động, 2026-09-15) — trang calendar riêng,
 * xuyên suốt MỌI asset (khác `MaintenancePlanHistorySection`, vốn chỉ xem
 * theo 1 asset trong `AssetDetailPage`). Lưới tháng thuần CSS Grid (7 cột)
 * — KHÔNG dùng thư viện calendar ngoài (CLAUDE.md Mục 25: chưa có bằng
 * chứng cần thiết, nhu cầu hiện tại chỉ là xem/click 1 kế hoạch theo ngày,
 * không cần kéo-thả/nhiều view phức tạp).
 */
export function MaintenanceCalendarPage() {
  const [viewedMonth, setViewedMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<AssetMaintenancePlan | null>(null);
  const [editingPlan, setEditingPlan] = useState<AssetMaintenancePlan | null>(null);
  const [completingPlan, setCompletingPlan] = useState<AssetMaintenancePlan | null>(null);
  const [cancellingPlan, setCancellingPlan] = useState<AssetMaintenancePlan | null>(null);

  const query = useMaintenanceCalendar(viewedMonth);
  const completeMutation = useCompleteMaintenancePlan();
  const cancelMutation = useCancelMaintenancePlan();

  const plansByDay = useMemo(() => {
    const map = new Map<number, AssetMaintenancePlan[]>();
    for (const plan of query.data ?? []) {
      const day = new Date(plan.scheduledDate).getDate();
      map.set(day, [...(map.get(day) ?? []), plan]);
    }
    return map;
  }, [query.data]);

  const monthLabel = new Date(viewedMonth.year, viewedMonth.month - 1, 1).toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  function goToMonth(delta: number) {
    setViewedMonth(({ month, year }) => {
      const d = new Date(year, month - 1 + delta, 1);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    });
  }

  const daysInMonth = new Date(viewedMonth.year, viewedMonth.month, 0).getDate();
  const leadingBlanks = mondayFirstDayIndex(new Date(viewedMonth.year, viewedMonth.month - 1, 1));
  const todayKey = new Date().toDateString();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lịch bảo trì"
        description="Kế hoạch bảo trì chủ động theo tháng — độc lập với luồng đề xuất sửa chữa phản ứng."
        breadcrumb={[{ label: "Tài sản", to: "/app/assets" }, { label: "Lịch bảo trì" }]}
        actions={
          <PermissionGuard permission={PERMISSIONS.ASSET_MAINTENANCE_PLAN_CREATE}>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <CalendarPlus /> Lên lịch bảo trì
            </Button>
          </PermissionGuard>
        }
      />

      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="sm" aria-label="Tháng trước" onClick={() => goToMonth(-1)}>
          <ChevronLeft />
        </Button>
        <span className="min-w-40 text-center text-sm font-semibold capitalize text-foreground">{monthLabel}</span>
        <Button variant="ghost" size="sm" aria-label="Tháng sau" onClick={() => goToMonth(1)}>
          <ChevronRight />
        </Button>
      </div>

      {query.isLoading && <LoadingState variant="spinner" label="Đang tải lịch bảo trì..." />}
      {query.isError && <ErrorState message={parseApiError(query.error).message} onRetry={() => query.refetch()} />}

      {query.data && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 gap-px rounded-lg border border-border bg-border text-sm">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="bg-muted px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
                {label}
              </div>
            ))}

            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} className="min-h-24 bg-card/50" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const cellDate = new Date(viewedMonth.year, viewedMonth.month - 1, day);
              const plansToday = plansByDay.get(day) ?? [];
              return (
                <div key={day} className={cn("min-h-24 space-y-1 bg-card p-1.5", cellDate.toDateString() === todayKey && "bg-primary/5")}>
                  <span className={cn("text-xs text-muted-foreground", cellDate.toDateString() === todayKey && "font-semibold text-primary")}>
                    {day}
                  </span>
                  {plansToday.map((plan) => (
                    <button
                      key={plan._id}
                      type="button"
                      onClick={() => setViewingPlan(plan)}
                      title={plan.title}
                      className={cn("block w-full truncate rounded px-1.5 py-0.5 text-left text-xs", PILL_CLASS_BY_STATE[pillState(plan)])}
                    >
                      {typeof plan.asset === "object" ? plan.asset.assetCode : ""} {plan.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {createOpen && <CreateMaintenancePlanModal key="create" open={createOpen} onClose={() => setCreateOpen(false)} />}

      {viewingPlan && (
        <AppModal open={!!viewingPlan} onClose={() => setViewingPlan(null)} title={viewingPlan.title}>
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Tài sản: </span>
              <span className="font-medium text-foreground">
                {typeof viewingPlan.asset === "object" ? `${viewingPlan.asset.assetCode} — ${viewingPlan.asset.name}` : viewingPlan.asset}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Ngày dự kiến: </span>
              {new Date(viewingPlan.scheduledDate).toLocaleDateString("vi-VN")}
            </p>
            {viewingPlan.description && <p className="text-muted-foreground">{viewingPlan.description}</p>}
            {viewingPlan.resolutionNote && (
              <p>
                <span className="text-muted-foreground">{viewingPlan.status === "completed" ? "Kết quả" : "Lý do huỷ"}: </span>
                {viewingPlan.resolutionNote}
              </p>
            )}
            {viewingPlan.status === "planned" && (
              <PermissionGuard permission={PERMISSIONS.ASSET_MAINTENANCE_PLAN_UPDATE}>
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button variant="secondary" size="sm" onClick={() => setEditingPlan(viewingPlan)}>
                    Sửa
                  </Button>
                  <Button size="sm" onClick={() => setCompletingPlan(viewingPlan)}>
                    <Wrench /> Hoàn tất
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setCancellingPlan(viewingPlan)}>
                    Huỷ
                  </Button>
                </div>
              </PermissionGuard>
            )}
          </div>
        </AppModal>
      )}

      {editingPlan && (
        <EditMaintenancePlanModal
          key={editingPlan._id}
          open={!!editingPlan}
          onClose={() => {
            setEditingPlan(null);
            setViewingPlan(null);
          }}
          plan={editingPlan}
        />
      )}

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
              { id: completingPlan._id, body: { resolutionNote: note } },
              {
                onSuccess: () => {
                  setCompletingPlan(null);
                  setViewingPlan(null);
                },
              },
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
              { id: cancellingPlan._id, body: { resolutionNote: note } },
              {
                onSuccess: () => {
                  setCancellingPlan(null);
                  setViewingPlan(null);
                },
              },
            )
          }
        />
      )}
    </div>
  );
}
