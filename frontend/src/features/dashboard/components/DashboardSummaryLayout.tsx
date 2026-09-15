import type { ComponentType, ReactNode } from "react";
import { TrendingUp, History } from "lucide-react";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { MonthlyTrendBars } from "@/features/dashboard/components/MonthlyTrendBars";
import { RecentDocumentsList } from "@/features/dashboard/components/RecentDocumentsList";
import type { Document } from "@/types/document.types";
import type { MonthCount } from "@/types/dashboard.types";

interface DashboardSummaryLayoutProps {
  kpiCards: { label: string; value: ReactNode; icon?: ComponentType<{ className?: string }>; tone?: "primary" | "success" | "warning" | "destructive" | "info" | "default" }[];
  proposalsByMonth: MonthCount[];
  reportsByMonth: MonthCount[];
  recentDocuments: Document[];
  /** Widget phụ chèn giữa trend chart và recent documents — VD "Tài liệu theo khoa/phòng" (chỉ Admin Summary có). */
  extra?: ReactNode;
}

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => `Th${i + 1}`);

/** Merge `MonthCount[]` (sparse, chỉ tháng có dữ liệu) thành mảng đủ 12 tháng, tháng thiếu = 0 — cần cho trend chart không bị lệch trục. */
function fillMonths(data: MonthCount[]) {
  const byMonth = new Map(data.map((d) => [d._id, d.count]));
  return Array.from({ length: 12 }, (_, i) => ({ label: MONTH_LABELS[i], value: byMonth.get(i + 1) ?? 0 }));
}

/**
 * FE-09 — layout dùng chung cho Admin Summary + Department Summary (2 API
 * khác nhau nhưng CÙNG shape `{totalDocuments,totalProposals,totalReports,
 * proposalsByMonth,reportsByMonth,recentDocuments}` — chỉ khác `totalUsers`/
 * `totalDepartments` xử lý ở KPI cards do caller tự truyền vào).
 */
export function DashboardSummaryLayout({ kpiCards, proposalsByMonth, reportsByMonth, recentDocuments, extra }: DashboardSummaryLayoutProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} />
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <TrendingUp className="size-4 text-muted-foreground" aria-hidden="true" />
          Xu hướng Đề xuất / Báo cáo theo tháng (năm nay)
        </h3>
        <MonthlyTrendBars
          categories={MONTH_LABELS}
          series={[
            { label: "Đề xuất", color: "primary", data: fillMonths(proposalsByMonth) },
            { label: "Báo cáo", color: "chart-2", data: fillMonths(reportsByMonth) },
          ]}
        />
      </div>

      {extra}

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <History className="size-4 text-muted-foreground" aria-hidden="true" />
          Tài liệu mới nhất
        </h3>
        <RecentDocumentsList documents={recentDocuments} />
      </div>
    </div>
  );
}
