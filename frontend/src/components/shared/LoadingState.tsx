import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  variant?: "spinner" | "skeleton-table" | "skeleton-card";
  label?: string;
  /** Chiếm toàn màn hình (vd lúc đang xác thực phiên) thay vì chỉ 1 khu vực trong trang. */
  fullScreen?: boolean;
  className?: string;
}

/**
 * SHARED_COMPONENTS_LIBRARY.md: "LoadingState" — skeleton/spinner chuẩn hoá,
 * dùng ở mọi nơi chờ data (tránh màn hình trắng, FE_FOUNDATION_SPEC.md Mục
 * 27). `skeleton-table`/`skeleton-card` là placeholder foundation cho FE-02+
 * (danh sách thật) — FE-01 chủ yếu dùng `spinner`.
 */
export function LoadingState({ variant = "spinner", label = "Đang tải dữ liệu...", fullScreen, className }: LoadingStateProps) {
  if (variant === "skeleton-table") {
    return (
      <div className={cn("space-y-2", className)} role="status" aria-label={label}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  if (variant === "skeleton-card") {
    return (
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)} role="status" aria-label={label}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-muted-foreground",
        fullScreen ? "min-h-screen" : "py-16",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
