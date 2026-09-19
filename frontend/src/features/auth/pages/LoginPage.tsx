import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { useVerifyLoginOtp } from "@/features/auth/hooks/useVerifyLoginOtp";
import { parseApiError } from "@/utils/parseApiError";

/**
 * Khớp `LoginDTO` (`backend/src/dto/auth/auths.dto.ts`) — username min 3,
 * password min 5. Trước đây chỉ check `min(1)` nên giá trị quá ngắn vượt
 * qua validate client, request bay tới backend và bị Zod bounce với lỗi
 * generic "Dữ liệu gửi lên không hợp lệ" thay vì hiện rõ ngay tại field
 * (FE-01 MICRO-FIX — Login validation, không đổi rule nghiệp vụ, chỉ đồng
 * bộ lại con số đã có sẵn ở backend).
 */
const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập").min(3, "Tên đăng nhập tối thiểu 3 ký tự"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu").min(5, "Mật khẩu tối thiểu 5 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Mã xác thực phải gồm đúng 6 chữ số"),
});
type OtpFormValues = z.infer<typeof otpSchema>;

/**
 * Login page — Modern Healthcare Enterprise (FE-01 Mục 37/38): split layout
 * desktop (branding trái / form phải), clean, minimal, KHÔNG dùng ảnh stock.
 * Client validation (Zod) là UX only — backend vẫn là nguồn xác nhận cuối
 * (FE_FOUNDATION_SPEC.md Mục 13).
 *
 * [SỬA 2026-09-19, Roadmap C1] Thêm bước 2 (nhập mã OTP) khi tài khoản đã
 * bật 2FA — `useLogin` trả `requiresTwoFactor` thay vì điều hướng thẳng,
 * `pendingUsername` chuyển UI sang form nhập mã (`useVerifyLoginOtp`).
 */
export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const verifyOtp = useVerifyLoginOtp();
  const [showPassword, setShowPassword] = useState(false);
  const [pendingUsername, setPendingUsername] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const otpForm = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });

  const apiError = login.error ? parseApiError(login.error) : null;
  const otpApiError = verifyOtp.error ? parseApiError(verifyOtp.error) : null;

  function onSubmit(values: LoginFormValues) {
    login.mutate(values, {
      onSuccess: (result) => {
        if ("requiresTwoFactor" in result) {
          setPendingUsername(result.username);
        } else {
          navigate("/app", { replace: true });
        }
      },
    });
  }

  function onSubmitOtp(values: OtpFormValues) {
    if (!pendingUsername) return;
    verifyOtp.mutate(
      { username: pendingUsername, code: values.code },
      { onSuccess: () => navigate("/app", { replace: true }) },
    );
  }

  if (pendingUsername) {
    return (
      <AuthLayout>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Xác thực 2 lớp</h1>
          <p className="text-sm text-muted-foreground">
            Đã gửi mã xác thực 6 số qua email cho tài khoản <strong>{pendingUsername}</strong>. Nhập mã để hoàn tất đăng nhập.
          </p>
        </div>

        <form onSubmit={otpForm.handleSubmit(onSubmitOtp)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="otp-code" className="text-sm font-medium text-foreground">
              Mã xác thực
            </label>
            <input
              id="otp-code"
              autoFocus
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              aria-invalid={!!otpForm.formState.errors.code}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...otpForm.register("code")}
            />
            {otpForm.formState.errors.code && (
              <p className="text-xs text-destructive">{otpForm.formState.errors.code.message}</p>
            )}
          </div>

          {otpApiError && (
            <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {otpApiError.message}
            </p>
          )}

          <Button type="submit" className="w-full" loading={verifyOtp.isPending}>
            {verifyOtp.isPending ? "Đang xác thực..." : "Xác nhận"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setPendingUsername(null)}>
            Quay lại đăng nhập
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Đăng nhập</h1>
        <p className="text-sm text-muted-foreground">Nhập thông tin tài khoản để tiếp tục.</p>
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

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Mật khẩu
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("password")}
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
          {errors.password && (
            <p id="password-error" className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
          <div className="text-right">
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        {apiError && (
          <div role="alert" className="space-y-1 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {/* Ưu tiên message cụ thể theo field (Zod/Mongoose) hơn message chung
                của errorCode — tránh hiện "Dữ liệu gửi lên không hợp lệ" chung
                chung khi backend đã trả lý do rõ ràng (vd "Password tối thiểu
                5 ký tự"). Client validation (schema trên) đã chặn phần lớn case
                này trước khi gọi API — đây là lớp phòng vệ thứ 2. */}
            {apiError.fieldErrors && apiError.fieldErrors.length > 0 ? (
              apiError.fieldErrors.map((fe, i) => <p key={i}>{fe.message}</p>)
            ) : apiError.messages && apiError.messages.length > 0 ? (
              apiError.messages.map((m, i) => <p key={i}>{m}</p>)
            ) : (
              <p>{apiError.message}</p>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" loading={login.isPending}>
          {login.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>
    </AuthLayout>
  );
}
