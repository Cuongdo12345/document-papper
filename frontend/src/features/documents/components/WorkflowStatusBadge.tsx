import { StatusBadge } from "@/components/shared/StatusBadge";
import type { WorkflowStatus } from "@/types/document.types";

/** Mapping RIÊNG cho `workflowStatus` (5 giá trị) — KHÔNG dùng chung bảng màu với domain khác (SHARED_COMPONENTS_LIBRARY.md). */
const WORKFLOW_STATUS_MAP: Record<WorkflowStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "primary" }> = {
  pending: { label: "Chờ duyệt", variant: "warning" },
  approved: { label: "Đã duyệt", variant: "success" },
  rejected: { label: "Từ chối", variant: "destructive" },
  cancelled: { label: "Đã huỷ", variant: "default" },
  completed: { label: "Hoàn tất", variant: "primary" },
};

export function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  const config = WORKFLOW_STATUS_MAP[status];
  return <StatusBadge variant={config.variant}>{config.label}</StatusBadge>;
}
