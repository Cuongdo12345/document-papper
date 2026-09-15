import { useState } from "react";
import { ListChecks } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { MonthlyTrendBars } from "@/features/dashboard/components/MonthlyTrendBars";
import { useAuditDashboard } from "@/features/audit/hooks/useAuditDashboard";
import { getAuditActionLabel } from "@/features/audit/components/AuditActionBadge";
import { parseApiError } from "@/utils/parseApiError";

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";

/**
 * Tab "Thống kê" (`GET /user-audits/dashboard`, permission RIÊNG
 * `AUDIT_VIEW_DASHBOARD` — gate ở `AuditLogsPage`, component này không tự
 * gate lại). Tái dùng `MonthlyTrendBars` (đã có sẵn từ FE-09) cho cả 2 biểu
 * đồ đơn-series thay vì viết chart riêng (CLAUDE.md Mục 11 — ưu tiên
 * implementation có sẵn).
 */
export function AuditStatsTab() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const query = useAuditDashboard({ fromDate: fromDate || undefined, toDate: toDate || undefined });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 space-y-1.5">
          <label htmlFor="audit-stats-from" className="text-xs font-medium text-muted-foreground">
            Từ ngày
          </label>
          <input
            id="audit-stats-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="min-w-40 space-y-1.5">
          <label htmlFor="audit-stats-to" className="text-xs font-medium text-muted-foreground">
            Đến ngày
          </label>
          <input
            id="audit-stats-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {(fromDate || toDate) && (
          <button
            type="button"
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
            className="h-9 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Xoá bộ lọc
          </button>
        )}
      </div>

      {query.isLoading && <LoadingState variant="skeleton-table" />}

      {!query.isLoading && (query.isError || !query.data) && (
        <ErrorState message={query.error ? parseApiError(query.error).message : undefined} onRetry={() => query.refetch()} />
      )}

      {!query.isLoading && query.data && query.data.total === 0 && (
        <EmptyState title="Chưa có audit log nào" message="Không có bản ghi nào khớp khoảng thời gian đã chọn." />
      )}

      {!query.isLoading && query.data && query.data.total > 0 && (
        <>
          <KpiCard label="Tổng số nhật ký" value={query.data.total} icon={ListChecks} tone="primary" />

          <div className={SECTION_CLASS}>
            <h2 className="text-sm font-semibold text-foreground">Theo hành động</h2>
            <MonthlyTrendBars
              categories={query.data.byAction.map((a) => getAuditActionLabel(a._id))}
              series={[
                {
                  label: "Số lượng",
                  color: "primary",
                  data: query.data.byAction.map((a) => ({ label: getAuditActionLabel(a._id), value: a.count })),
                },
              ]}
            />
          </div>

          <div className={SECTION_CLASS}>
            <h2 className="text-sm font-semibold text-foreground">Theo ngày</h2>
            <MonthlyTrendBars
              categories={query.data.byDay.map((d) => d._id)}
              series={[{ label: "Số lượng", color: "chart-2", data: query.data.byDay.map((d) => ({ label: d._id, value: d.count })) }]}
            />
          </div>
        </>
      )}
    </div>
  );
}
