import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useResetUserPassword } from "@/features/users/hooks/useResetUserPassword";
import { parseApiError } from "@/utils/parseApiError";
import type { UserListItem } from "@/types/user.types";

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  user: UserListItem | null;
}

/** Khớp `ResetPasswordByAdminDTO` — min 8 (đặt mật khẩu MỚI, DEV-021/SEC-02). */
const MIN_LENGTH = 8;

/**
 * Wrapper `key={user._id}` ép remount `Content` mỗi khi mở cho user khác —
 * state cục bộ tự reset qua `useState` initial value, KHÔNG cần `useEffect`
 * (cùng pattern `AssignRoleModal.tsx`, tránh cascading render).
 */
export function ResetPasswordModal({ open, onClose, user }: ResetPasswordModalProps) {
  if (!user) return null;
  return <ResetPasswordModalContent key={user._id} open={open} onClose={onClose} user={user} />;
}

function ResetPasswordModalContent({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: UserListItem;
}) {
  const mutation = useResetUserPassword();
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);

  const isTooShort = newPassword.length > 0 && newPassword.length < MIN_LENGTH;
  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={`Đặt lại mật khẩu — ${user.fullName}`}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button
            type="button"
            size="sm"
            loading={mutation.isPending}
            disabled={newPassword.length < MIN_LENGTH}
            onClick={() =>
              mutation.mutate({ id: user._id, body: { newPassword } }, { onSuccess: () => onClose() })
            }
          >
            Đặt lại mật khẩu
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <label htmlFor="reset-new-password" className="text-sm font-medium text-foreground">
          Mật khẩu mới
        </label>
        <div className="relative">
          <input
            id="reset-new-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            autoFocus
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onBlur={() => setTouched(true)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {touched && isTooShort && <p className="text-xs text-destructive">Mật khẩu mới tối thiểu {MIN_LENGTH} ký tự</p>}
      </div>

      {apiError && (
        <p role="alert" className="mt-3 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {apiError.message}
        </p>
      )}
    </AppModal>
  );
}
