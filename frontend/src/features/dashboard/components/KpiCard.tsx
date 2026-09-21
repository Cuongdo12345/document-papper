import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type KpiTone = "primary" | "success" | "warning" | "destructive" | "info" | "default";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: KpiTone;
  className?: string;
  /**
   * [MỚI FE-18, UI_DESIGN_SYSTEM.md Mục 3/4] "display" = type scale MỚI
   * (`text-4xl`/700) dành RIÊNG cho ĐÚNG 1 KPI chính/section (đứng đầu,
   * `DashboardSummaryLayout.tsx`). Mặc định "default" (`text-2xl`/600, y hệt
   * hành vi cũ trước FE-18) — KHÔNG đổi bất kỳ nơi nào khác đang gọi
   * `KpiCard` (VD `AuditStatsTab.tsx`) trừ khi truyền tường minh `size`.
   */
  size?: "default" | "display";
}

const TONE_ICON_CLASS: Record<KpiTone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  default: "bg-muted text-muted-foreground",
};

const VALUE_SIZE_CLASS: Record<NonNullable<KpiCardProps["size"]>, string> = {
  default: "text-2xl font-semibold",
  display: "text-4xl font-bold",
};

/**
 * FE-09 (nâng cấp UI) — thẻ KPI, mỗi metric có icon + tông màu riêng để
 * quét nhanh bằng mắt (dataviz skill: "status colors reserved, ship with
 * icon + label — never color alone" — tone ở đây KHÔNG thay thế label, chỉ
 * hỗ trợ thêm). Roadmap Mục 15: "Không tự bịa trend/percentage nếu backend
 * không trả" — CỐ TÌNH không có prop `trend`/`delta`, không endpoint nào
 * trả dữ liệu so sánh kỳ trước (đã đọc toàn bộ 3 service file dashboard).
 */
export function KpiCard({ label, value, icon: Icon, tone = "default", className, size = "default" }: KpiCardProps) {
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm", className)}>
      {Icon && (
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", TONE_ICON_CLASS[tone])} aria-hidden="true">
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-0.5 tracking-tight text-foreground", VALUE_SIZE_CLASS[size])}>{value}</p>
      </div>
    </div>
  );
}
