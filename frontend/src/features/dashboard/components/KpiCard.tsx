import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type KpiTone = "primary" | "success" | "warning" | "destructive" | "info" | "default";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: KpiTone;
  className?: string;
}

const TONE_ICON_CLASS: Record<KpiTone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  default: "bg-muted text-muted-foreground",
};

/**
 * FE-09 (nâng cấp UI) — thẻ KPI, mỗi metric có icon + tông màu riêng để
 * quét nhanh bằng mắt (dataviz skill: "status colors reserved, ship with
 * icon + label — never color alone" — tone ở đây KHÔNG thay thế label, chỉ
 * hỗ trợ thêm). Roadmap Mục 15: "Không tự bịa trend/percentage nếu backend
 * không trả" — CỐ TÌNH không có prop `trend`/`delta`, không endpoint nào
 * trả dữ liệu so sánh kỳ trước (đã đọc toàn bộ 3 service file dashboard).
 */
export function KpiCard({ label, value, icon: Icon, tone = "default", className }: KpiCardProps) {
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm", className)}>
      {Icon && (
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", TONE_ICON_CLASS[tone])} aria-hidden="true">
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  );
}
