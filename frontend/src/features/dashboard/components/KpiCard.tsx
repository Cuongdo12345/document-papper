import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useCountUp } from "@/hooks/useCountUp";
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
  /**
   * [FE-37] Đường dẫn tới danh sách tương ứng — có thì cả thẻ thành link bấm
   * được. Caller tự quyết định có truyền hay không theo permission của trang đích.
   */
  to?: string;
  /** [FE-37] Số nguyên "đếm tăng" khi hiện ra — chỉ các widget Dashboard bật; `AuditStatsTab` giữ hiện ngay. */
  countUp?: boolean;
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
export function KpiCard({ label, value, icon: Icon, tone = "default", className, size = "default", to, countUp }: KpiCardProps) {
  const content = (
    <>
      {Icon && (
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", TONE_ICON_CLASS[tone])} aria-hidden="true">
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-0.5 tracking-tight tabular-nums text-foreground", VALUE_SIZE_CLASS[size])}>
          {typeof value !== "number" ? value : countUp && Number.isInteger(value) ? <AnimatedNumber value={value} /> : value.toLocaleString("vi-VN")}
        </p>
      </div>
    </>
  );
  const baseClass = "flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm";

  if (to) {
    return (
      <Link
        to={to}
        title={`Xem danh sách ${label.toLowerCase()}`}
        className={cn(
          baseClass,
          "transition-colors hover:border-primary/40 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn(baseClass, className)}>{content}</div>;
}

/** [FE-37] Số nguyên đếm tăng khi hiện ra + định dạng phân cách hàng nghìn kiểu Việt Nam (12.345). */
function AnimatedNumber({ value }: { value: number }) {
  const display = useCountUp(value);
  return <>{display.toLocaleString("vi-VN")}</>;
}
