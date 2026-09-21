import { useState } from "react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";

interface WorkflowActionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (comment: string | undefined) => void;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  isLoading?: boolean;
  commentRequired?: boolean;
}

/**
 * FE-05 — modal dùng chung cho cả 4 action Duyệt/Từ chối/Huỷ/Hoàn tất (khác
 * nhau ở label/màu/có bắt buộc ghi chú hay không, CÙNG 1 shape input
 * `{comment?}` — `ApproveRejectBodyDTO`/`CancelWorkflowBodyDTO`/
 * `CompleteWorkflowBodyDTO` phía backend đều giống hệt nhau).
 *
 * `commentRequired` là ràng buộc UX THUẦN Ở FE (backend luôn coi `comment`
 * optional, kể cả reject) — hợp lý cho "Từ chối" (người bị từ chối cần biết
 * lý do) nhưng KHÔNG phải hợp đồng API, không nên nhầm là validation server.
 *
 * `key={...}` ở nơi gọi (giống `SubmitWorkflowModal`) để reset `comment`
 * giữa các lần mở cho các workflow/document khác nhau.
 */
export function WorkflowActionModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  danger,
  isLoading,
  commentRequired,
}: WorkflowActionModalProps) {
  const [comment, setComment] = useState("");
  const confirmDisabled = isLoading || (commentRequired && !comment.trim());

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            Huỷ
          </Button>
          <Button
            type="button"
            // FE-19 (UI_DESIGN_SYSTEM.md Mục 2) — cùng lý do `ConfirmDialog.tsx`:
            // `primary` chỉ dành cho ĐÚNG 1 CTA chính/trang, các action workflow
            // không-phá-huỷ (Duyệt/Hoàn tất...) không nên mặc định trùng màu.
            variant={danger ? "destructive" : "secondary"}
            size="sm"
            loading={isLoading}
            disabled={confirmDisabled}
            onClick={() => onConfirm(comment.trim() || undefined)}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-foreground">{message}</p>
      <div className="mt-3 space-y-1.5">
        <label htmlFor="wf-action-comment" className="text-xs font-medium text-muted-foreground">
          Ghi chú {commentRequired ? <span className="text-destructive">*</span> : "(tuỳ chọn)"}
        </label>
        <textarea
          id="wf-action-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </AppModal>
  );
}
