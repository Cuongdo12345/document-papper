import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { useForgotPassword } from "@/features/auth/hooks/useForgotPassword";
import { parseApiError } from "@/utils/parseApiError";

/** Khớp `ForgotPasswordDTO` (`backend/src/dto/auth/auths.dto.ts`). */
const forgotPasswordSchema = z.object({
  username: z.string().trim().min(1, "Vui lòng nhập tên đăng nhập").max(50, "Tên đăng nhập tối đa 50 ký tự"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

/**
 * Forgot Password — AUTH_RBAC_MAP.md Mục 1.2/1.3 + UI_REQUIREMENTS.md Mục 1:
 * backend LUÔN trả 200 + CÙNG 1 message trung tính dù username tồn tại hay
 * không (chống user enumeration) — page chỉ hiển thị lại đúng message đó,
 * KHÔNG tự suy diễn/rẽ nhánh theo "tài khoản có tồn tại hay không". Lỗi thật
 * (network/rate-limit 429) vẫn hiển thị bình thường qua `parseApiError` —
 * đây là lỗi kỹ thuật, không phải thông tin có thể bị khai thác để dò tài
 * khoản.
 */
export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const apiError = forgotPassword.error ? parseApiError(forgotPassword.error) : null;

  function onSubmit(values: ForgotPasswordFormValues) {
    forgotPassword.mutate(values.username);
  }

  if (forgotPassword.isSuccess) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto size-10 text-primary" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-foreground">Kiểm tra email của bạn</h1>
          <p className="text-sm text-muted-foreground">{forgotPassword.data.message}</p>
          <Link to="/login" className="inline-block text-sm font-medium text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Quên mật khẩu</h1>
        <p className="text-sm text-muted-foreground">
          Nhập tên đăng nhập, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu qua email nếu tài khoản tồn tại.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="username" className="text-sm font-medium text-foreground">
            Tên đăng nhập
          </label>
          <input
            id="username"
            autoComplete="username"
            autoFocus
            aria-invalid={!!errors.username}
            aria-describedby={errors.username ? "username-error" : undefined}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("username")}
          />
          {errors.username && (
            <p id="username-error" className="text-xs text-destructive">
              {errors.username.message}
            </p>
          )}
        </div>

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}

        <Button type="submit" className="w-full" loading={forgotPassword.isPending}>
          {forgotPassword.isPending ? "Đang gửi..." : "Gửi hướng dẫn đặt lại mật khẩu"}
        </Button>

        <Link to="/login" className="block text-center text-sm font-medium text-primary hover:underline">
          Quay lại đăng nhập
        </Link>
      </form>
    </AuthLayout>
  );
}
