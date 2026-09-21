import { useState } from "react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Action phá huỷ (destructive) — đổi màu nút confirm sang `destructive`. */
  danger?: boolean;
  isLoading?: boolean;
  /** Bắt buộc gõ đúng chuỗi này mới bấm được confirm — dùng cho action KHÔNG THỂ hoàn tác. */
  requireTypedConfirm?: string;
}

/**
 * SHARED_COMPONENTS_LIBRARY.md: "ConfirmDialog" — xác nhận trước hành động
 * phá huỷ. Compose lại `AppModal` (KHÔNG tự viết Radix Dialog riêng).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  danger,
  isLoading,
  requireTypedConfirm,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState("");
  const confirmDisabled = isLoading || (!!requireTypedConfirm && typedValue !== requireTypedConfirm);

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            // FE-19 (UI_DESIGN_SYSTEM.md Mục 2) — `primary` phải dành riêng
            // cho ĐÚNG 1 CTA chính/trang; đa số call site không-phá-huỷ
            // (Khôi phục/Hoàn tất/Duyệt...) không truyền `danger`, nên trước
            // đây mặc định `primary` khiến chúng trùng trọng lượng thị giác
            // với CTA chính của trang. `secondary` vẫn đủ nổi bật cho 1 xác
            // nhận không-phá-huỷ trong modal riêng.
            variant={danger ? "destructive" : "secondary"}
            size="sm"
            onClick={onConfirm}
            disabled={confirmDisabled}
            loading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-foreground">{message}</p>
      {requireTypedConfirm && (
        <div className="mt-3 space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Gõ <span className="font-mono font-medium text-foreground">{requireTypedConfirm}</span> để xác nhận
          </label>
          <input
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoComplete="off"
          />
        </div>
      )}
    </AppModal>
  );
}
