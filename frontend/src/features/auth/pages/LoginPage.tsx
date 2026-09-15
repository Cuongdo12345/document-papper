import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogin } from "@/features/auth/hooks/useLogin";
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

/**
 * Login page — Modern Healthcare Enterprise (FE-01 Mục 37/38): split layout
 * desktop (branding trái / form phải), clean, minimal, KHÔNG dùng ảnh stock.
 * Client validation (Zod) là UX only — backend vẫn là nguồn xác nhận cuối
 * (FE_FOUNDATION_SPEC.md Mục 13).
 */
export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const apiError = login.error ? parseApiError(login.error) : null;

  function onSubmit(values: LoginFormValues) {
    login.mutate(values, { onSuccess: () => navigate("/app", { replace: true }) });
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Branding panel — ẩn trên mobile, chỉ hiển thị ở desktop (Mục 37). */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative flex items-center gap-2">
          <Building2 className="size-6" aria-hidden="true" />
          <span className="text-lg font-semibold">Document Papper</span>
        </div>

        <div className="relative space-y-3">
          <h2 className="text-3xl font-semibold leading-tight">
            Hệ thống quản lý
            <br />
            tài liệu &amp; tài sản y tế
          </h2>
          <p className="max-w-md text-sm text-primary-foreground/80">
            Quản lý đề xuất, phê duyệt quy trình, tài sản/thiết bị y tế và báo cáo tập trung, an toàn — dành cho đội
            ngũ vận hành nội bộ bệnh viện.
          </p>
        </div>

        <p className="relative text-xs text-primary-foreground/60">© {new Date().getFullYear()} Document Papper</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 lg:hidden">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Building2 className="size-5" />
              <span className="font-semibold">Document Papper</span>
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
}
