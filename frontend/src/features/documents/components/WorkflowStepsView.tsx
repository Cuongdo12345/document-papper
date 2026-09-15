import { CheckCircle2, XCircle, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowInstance, WorkflowStepStatus } from "@/types/workflow.types";

const STEP_ICON: Record<WorkflowStepStatus, typeof CheckCircle2> = {
  approved: CheckCircle2,
  rejected: XCircle,
  cancelled: XCircle,
  pending: CircleDashed,
};
const STEP_COLOR: Record<WorkflowStepStatus, string> = {
  approved: "text-success",
  rejected: "text-destructive",
  cancelled: "text-muted-foreground",
  pending: "text-muted-foreground",
};

/**
 * Hiển thị READ-ONLY từng bước của `WorkflowInstance` — KHÔNG có action
 * Duyệt/Từ chối/Huỷ/Hoàn tất ở đây (phạm vi "FE Workflow UI" riêng, chưa làm
 * ở FE-04, xem `docs/frontend/tasks/FE-04.md` Known Issues).
 */
export function WorkflowStepsView({ workflow }: { workflow: WorkflowInstance }) {
  return (
    <ol className="space-y-2">
      {workflow.steps.map((step, i) => {
        const Icon = STEP_ICON[step.status];
        const isCurrent = i === workflow.currentStep && workflow.status === "pending";
        const approver = typeof step.approvedBy === "object" ? step.approvedBy?.fullName : undefined;
        return (
          <li
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-md border border-border p-3",
              isCurrent && "border-primary/40 bg-primary/5",
            )}
          >
            <Icon className={cn("mt-0.5 size-5 shrink-0", STEP_COLOR[step.status])} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                Bước {step.stepOrder + 1}: {step.name}{" "}
                <span className="font-normal text-muted-foreground">(role: {step.role})</span>
              </p>
              {approver && <p className="text-xs text-muted-foreground">Người duyệt: {approver}</p>}
              {step.comment && <p className="text-xs text-muted-foreground">Ghi chú: {step.comment}</p>}
              {step.approvedAt && (
                <p className="text-xs text-muted-foreground">{new Date(step.approvedAt).toLocaleString("vi-VN")}</p>
              )}
            </div>
            {isCurrent && <span className="shrink-0 text-xs font-medium text-primary">Đang chờ</span>}
          </li>
        );
      })}
    </ol>
  );
}
