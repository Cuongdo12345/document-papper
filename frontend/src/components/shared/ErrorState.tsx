import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * SHARED_COMPONENTS_LIBRARY.md: "ErrorState" — hiển thị lỗi + nút thử lại.
 * `message` nên đã qua `parseApiError()` trước khi truyền vào (an toàn hiển
 * thị trực tiếp — ERROR_HANDLING.md).
 */
export function ErrorState({
  title = "Không thể tải dữ liệu",
  message = "Đã có lỗi xảy ra, vui lòng thử lại sau.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-16 text-center", className)} role="alert">
      <AlertTriangle className="size-10 text-destructive/70" aria-hidden="true" />
      <p className="font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
