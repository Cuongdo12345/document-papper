import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { useResetPassword } from "@/features/auth/hooks/useResetPassword";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";

/**
 * Khớp `ResetPasswordDTO` (`backend/src/dto/auth/auths.dto.ts`) —
 * `newPassword` tối thiểu 8 ký tự (KHÔNG phải 5 như `LoginDTO.password` —
 * đây là field ĐẶT MẬT KHẨU MỚI, DEV-021/SEC-02).
 */
const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(1, "Vui lòng nhập mật khẩu mới").min(8, "Mật khẩu mới tối thiểu 8 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

/**
 * Reset Password — AUTH_RBAC_MAP.md Mục 1.2: `token` BẮT BUỘC đọc từ query
 * string (`?token=...`) của link trong email, KHÔNG tự sinh URL khác. Token
 * hết hạn sau 15 phút — lỗi token invalid/expired hiển thị qua
 * `parseApiError` (message phẳng từ backend, không phải Zod field error).
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [showPassword, setShowPassword] = useState(false);

  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const apiError = resetPassword.error ? parseApiError(resetPassword.error) : null;

  function onSubmit(values: ResetPasswordFormValues) {
    if (!token) return;
    resetPassword.mutate(
      { token, newPassword: values.newPassword },
      {
        onSuccess: (data) => {
          toast.success(data.message);
          navigate("/login", { replace: true });
        },
      },
    );
  }

  // Link email thiếu/hỏng token — báo ngay, không hiển thị form vô nghĩa.
  if (!token) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <ShieldAlert className="mx-auto size-10 text-destructive" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-foreground">Đường dẫn không hợp lệ</h1>
          <p className="text-sm text-muted-foreground">
            Thiếu mã xác nhận trong đường dẫn. Vui lòng dùng lại link trong email hoặc yêu cầu gửi lại.
          </p>
          <Link to="/forgot-password" className="inline-block text-sm font-medium text-primary hover:underline">
            Yêu cầu gửi lại email
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Đặt lại mật khẩu</h1>
        <p className="text-sm text-muted-foreground">Nhập mật khẩu mới cho tài khoản của bạn.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
            Mật khẩu mới
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
              aria-invalid={!!errors.newPassword}
              aria-describedby={errors.newPassword ? "newPassword-error" : undefined}
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("newPassword")}
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
          {errors.newPassword && (
            <p id="newPassword-error" className="text-xs text-destructive">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Xác nhận mật khẩu mới
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {apiError && (
          <div role="alert" className="space-y-1 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.fieldErrors && apiError.fieldErrors.length > 0 ? (
              apiError.fieldErrors.map((fe, i) => <p key={i}>{fe.message}</p>)
            ) : apiError.messages && apiError.messages.length > 0 ? (
              apiError.messages.map((m, i) => <p key={i}>{m}</p>)
            ) : (
              <p>{apiError.message}</p>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" loading={resetPassword.isPending}>
          {resetPassword.isPending ? "Đang xử lý..." : "Đặt lại mật khẩu"}
        </Button>

        <Link to="/login" className="block text-center text-sm font-medium text-primary hover:underline">
          Quay lại đăng nhập
        </Link>
      </form>
    </AuthLayout>
  );
}
