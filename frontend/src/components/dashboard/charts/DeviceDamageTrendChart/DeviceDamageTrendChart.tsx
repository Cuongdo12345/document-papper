// src/components/dashboard/charts/DeviceDamageTrendChart/DeviceDamageTrendChart.tsx
//
// Tab 4 — Xu hướng hư hỏng: LineChart số báo cáo CHECK_DAMAGE theo tháng.
//
// Source:
//   DASHBOARD_UI_SPEC.md §4.3, §4.6, §4.7, §2.4
//   DASHBOARD_DATA_DISCOVERY.md §5 API 4 response shape
//   BUILD_DASHBOARD_QUERY_HOOKS.md §6 useDamageTrend
//
// Chart type: LineChart
//   X-axis: monthLabel ("YYYY-MM") — đã sort ASC từ hook (DASHBOARD_DAMAGE_TREND_DEFAULTS)
//   Y-axis: totalReports (số lượng báo cáo)
//   Tooltip: số nguyên thuần (không đơn vị) — DASHBOARD_UI_SPEC.md §4.7
//
// ⚠️ monthLabel sort ASC được đảm bảo bởi DASHBOARD_DAMAGE_TREND_DEFAULTS.sortOrder = 'asc'
//    (override backend default 'desc') — không cần reverse() ở component này.
//
// Empty text: "Chưa có dữ liệu xu hướng hư hỏng" — DASHBOARD_UI_SPEC.md §10.2

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { theme } from 'antd';
import { useDamageTrend } from '../../../../hooks/queries/useDashboard';
import { DASHBOARD_DAMAGE_TREND_DEFAULTS } from '../../../../constants/dashboard.constants';
import { ChartCard, ChartSkeleton, ChartEmpty, ChartError } from '../shared';
import { formatTooltipValue } from '../../../../utils/chartTooltip';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_HEIGHT = 300;
const CHART_TITLE = 'Xu hướng báo cáo hư hỏng theo tháng';
const EMPTY_TEXT = 'Chưa có dữ liệu xu hướng hư hỏng';

// ─── Component ────────────────────────────────────────────────────────────────

interface DeviceDamageTrendChartProps {
  /** enabled=true khi Tab 4 active */
  enabled?: boolean;
}

export function DeviceDamageTrendChart({ enabled = true }: DeviceDamageTrendChartProps) {
  const { token } = theme.useToken();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useDamageTrend(DASHBOARD_DAMAGE_TREND_DEFAULTS, enabled);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ChartCard title={CHART_TITLE}>
        <ChartSkeleton height={CHART_HEIGHT} showTitle={false} />
      </ChartCard>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    const backendMsg = (error as any)?.response?.data?.message;
    return (
      <ChartCard title={CHART_TITLE}>
        <ChartError
          message="Không thể tải dữ liệu xu hướng hư hỏng"
          description={backendMsg}
          onRetry={refetch}
          height={CHART_HEIGHT}
        />
      </ChartCard>
    );
  }

  const items = data?.items ?? [];

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <ChartCard title={CHART_TITLE}>
        <ChartEmpty text={EMPTY_TEXT} height={CHART_HEIGHT} />
      </ChartCard>
    );
  }

  // ── Chart ──────────────────────────────────────────────────────────────────
  return (
    <ChartCard title={CHART_TITLE} isFetching={isFetching && !isLoading}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart
          data={items}
          margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />

          {/* X-axis: monthLabel "YYYY-MM" — sort ASC đảm bảo từ hook default */}
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 12 }}
            interval={items.length > 12 ? 1 : 0}
          />

          {/* Y-axis: số báo cáo — số nguyên, không đơn vị */}
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            width={40}
          />

          {/* Tooltip: số nguyên thuần — DASHBOARD_UI_SPEC.md §4.7 */}
          <Tooltip
            formatter={formatTooltipValue('Số báo cáo')}
            labelFormatter={(label) => `Tháng: ${label}`}
          />

          <Line
            type="monotone"
            dataKey="totalReports"
            stroke={token.colorError}
            strokeWidth={2}
            dot={<Dot r={4} />}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
