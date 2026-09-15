import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useChangeMyPassword } from "@/features/profile/hooks/useChangeMyPassword";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";

/** Khớp `ChangePasswordDTO` — `oldPassword` GIỮ NGUYÊN ngưỡng cũ (min 5, xác thực mật khẩu đã tồn tại), chỉ `newPassword` nâng min(8) (DEV-021/SEC-02). */
const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(5, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * ⚠️ Backend thu hồi TOÀN BỘ refresh token (kể cả phiên hiện tại) ngay khi
 * đổi mật khẩu thành công (DEV-021/SEC-01, xem `changeMyPassword()` ở
 * `auth.api.ts`) — `onSuccess` PHẢI tự logout cục bộ + điều hướng `/login`,
 * không thể tiếp tục dùng phiên hiện tại (access token còn hạn nhưng lần
 * refresh kế tiếp chắc chắn fail).
 */
export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const navigate = useNavigate();
  const mutation = useChangeMyPassword();
  const logout = useLogout();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  function onSubmit(values: ChangePasswordFormValues) {
    mutation.mutate(values, {
      onSuccess: () => {
        onClose();
        toast.success("Đổi mật khẩu thành công — vui lòng đăng nhập lại.");
        logout.mutate(undefined, { onSettled: () => navigate("/login", { replace: true }) });
      },
    });
  }

  return (
    <AppModal open={open} onClose={onClose} title="Đổi mật khẩu" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="pwd-old" className="text-sm font-medium text-foreground">
            Mật khẩu hiện tại
          </label>
          <input
            id="pwd-old"
            type="password"
            autoFocus
            autoComplete="current-password"
            aria-invalid={!!errors.oldPassword}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("oldPassword")}
          />
          {errors.oldPassword && <p className="text-xs text-destructive">{errors.oldPassword.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pwd-new" className="text-sm font-medium text-foreground">
            Mật khẩu mới
          </label>
          <input
            id="pwd-new"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("newPassword")}
          />
          {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pwd-confirm" className="text-sm font-medium text-foreground">
            Xác nhận mật khẩu mới
          </label>
          <input
            id="pwd-confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}

        <p className="text-xs text-muted-foreground">Sau khi đổi mật khẩu thành công, bạn sẽ được đăng xuất và cần đăng nhập lại.</p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" loading={mutation.isPending}>
            Đổi mật khẩu
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
