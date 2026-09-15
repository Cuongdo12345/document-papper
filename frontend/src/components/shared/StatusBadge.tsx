import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-border bg-muted text-muted-foreground",
        success: "border-success/20 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive",
        info: "border-info/20 bg-info/10 text-info",
        primary: "border-primary/20 bg-primary/10 text-primary",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

interface StatusBadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode;
  className?: string;
  /** Tooltip native (vd hiện permission string kỹ thuật gốc — `PermissionBadge`). */
  title?: string;
}

/**
 * SHARED_COMPONENTS_LIBRARY.md: "StatusBadge" — visual language THỐNG NHẤT
 * cho mọi trạng thái (Mục 26 FE-01). KHÔNG chứa bảng mapping status→màu của
 * riêng domain nào ở đây — mỗi domain (`workflowStatus` 5 giá trị,
 * `AssetStatus` 6 giá trị...) tự định nghĩa bảng label+variant RIÊNG khi
 * code FE task tương ứng (đã ghi rõ ở SHARED_COMPONENTS_LIBRARY.md — 2 enum
 * độc lập, không dùng chung 1 bảng màu).
 *
 * ```tsx
 * <StatusBadge variant="success">Active</StatusBadge>
 * <StatusBadge variant="info">System Role</StatusBadge>
 * ```
 */
export function StatusBadge({ variant, children, className, title }: StatusBadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} title={title}>
      {children}
    </span>
  );
}
