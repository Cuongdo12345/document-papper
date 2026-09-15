import type { ComponentType, ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title?: string;
  message?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** SHARED_COMPONENTS_LIBRARY.md: "EmptyState" — trạng thái rỗng có action gợi ý. */
export function EmptyState({
  icon: Icon = Inbox,
  title = "Không có dữ liệu",
  message,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-16 text-center", className)}>
      <Icon className="size-10 text-muted-foreground/50" aria-hidden="true" />
      <p className="font-medium text-foreground">{title}</p>
      {message && <p className="max-w-sm text-sm text-muted-foreground">{message}</p>}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
