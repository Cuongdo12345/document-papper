import type { ComponentType, ReactNode } from "react";
import { TrendingUp, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { MonthlyTrendBars } from "@/features/dashboard/components/MonthlyTrendBars";
import { RecentDocumentsList } from "@/features/dashboard/components/RecentDocumentsList";
import type { Document } from "@/types/document.types";
import type { MonthCount } from "@/types/dashboard.types";

interface KpiCardInput {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "destructive" | "info" | "default";
  /**
   * [MỚI FE-18, UI_DESIGN_SYSTEM.md Mục 4] Nhóm dữ liệu THẬT — 2 card liền
   * kề cùng `group` không có divider giữa; đổi `group` mới chèn 1 border
   * phân nhóm (VD tách "Đề xuất"/"Báo cáo" — con số THUỘC VỀ Document — khỏi
   * "Khoa/Phòng"/"Người dùng" — con số THUỘC VỀ tổ chức). CHỈ áp dụng cho
   * card từ vị trí thứ 2 trở đi — card ĐẦU TIÊN (`kpiCards[0]`) LUÔN là KPI
   * chính (`size="display"`), field này bị bỏ qua với card đó.
   */
  group?: string;
}

interface DashboardSummaryLayoutProps {
  kpiCards: KpiCardInput[];
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
  const [primary, ...secondary] = kpiCards;

  return (
    <div className="space-y-4">
      {/*
        FE-18 (UI_DESIGN_SYSTEM.md Mục 4, thí điểm CHỈ Dashboard) — trước đây
        MỌI KPI render đồng đều qua 1 grid, không phân biệt cái nào quan
        trọng hơn. Giờ: 1 KPI chính đứng riêng, to hơn rõ rệt (`size="display"`,
        Mục 3); KPI phụ gộp chung 1 khối nền `bg-muted` (thay vì mỗi cái 1
        border/bg-card riêng — Mục 2), chỉ chèn divider tại đúng ranh giới
        nhóm dữ liệu thật (`group` đổi giá trị), không trang trí đều khắp.
      */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {primary && (
          <KpiCard
            label={primary.label}
            value={primary.value}
            icon={primary.icon}
            tone={primary.tone}
            size="display"
            className="sm:w-72 sm:shrink-0"
          />
        )}

        {secondary.length > 0 && (
          <div className="flex flex-1 flex-wrap rounded-lg bg-muted">
            {secondary.map((card, i) => {
              const startsNewGroup = i > 0 && secondary[i - 1].group !== card.group;
              return (
                <KpiCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  icon={card.icon}
                  tone={card.tone}
                  className={cn(
                    "basis-1/2 rounded-none border-0 bg-transparent p-3 shadow-none hover:shadow-none sm:flex-1 sm:basis-auto",
                    startsNewGroup && "border-t border-border sm:border-t-0 sm:border-l",
                  )}
                />
              );
            })}
          </div>
        )}
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
