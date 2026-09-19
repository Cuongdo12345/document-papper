import type { ReactNode } from "react";
import { Building2 } from "lucide-react";

/**
 * Layout dùng chung cho MỌI trang auth (Login/ForgotPassword/ResetPassword) —
 * split layout "Modern Healthcare Enterprise" (FE-01 Mục 37/38): panel
 * branding bên trái (ẩn trên mobile) + panel nội dung bên phải. Tách ra từ
 * `LoginPage.tsx` (nơi duy nhất từng có layout này) — `ForgotPasswordPage`/
 * `ResetPasswordPage` trước đây dùng layout RIÊNG, đơn giản hơn hẳn (chỉ
 * `flex items-center justify-center` không panel branding), gây khoảng
 * trắng lớn bao quanh 1 form nhỏ giữa màn hình trống — user báo lỗi UI qua
 * `ForgotPasswordPage`, phát hiện `ResetPasswordPage` bị y hệt nên sửa LUÔN
 * cả 2 bằng cách dùng chung layout đã có sẵn ở Login, thay vì thiết kế mới.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Branding panel — ẩn trên mobile, chỉ hiển thị ở desktop. */}
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

      {/* Content panel */}
      <div className="flex flex-col items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 lg:hidden">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Building2 className="size-5" />
              <span className="font-semibold">Document Papper</span>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
