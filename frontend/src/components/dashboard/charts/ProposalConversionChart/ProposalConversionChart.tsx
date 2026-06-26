// src/components/dashboard/charts/ProposalConversionChart/ProposalConversionChart.tsx
//
// Tab 3 — KPI Đề xuất: BarChart tỷ lệ chuyển đổi Đề xuất → Biên bản theo phòng ban.
//
// Source:
//   DASHBOARD_UI_SPEC.md §4.2, §4.6, §4.7, §2.3
//   DASHBOARD_DATA_DISCOVERY.md §5 API 3 response shape
//   BUILD_DASHBOARD_QUERY_HOOKS.md §5 useProposalConversion
//
// Chart type: BarChart (vertical)
//   X-axis: departmentName
//   Y-axis: conversionRate (đơn vị %)
//   Tooltip: "{value}%" — xem DASHBOARD_UI_SPEC.md §4.7
//
// Không có filter UI — DASHBOARD_UI_SPEC.md §2.3:
//   "Không có filter UI — chỉ pagination ẩn trong chart, limit=50"
//
// Empty state text: "Chưa có dữ liệu đề xuất" — DASHBOARD_UI_SPEC.md §10.2

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { theme } from 'antd';
import { useProposalConversion } from '../../../../hooks/queries/useDashboard';
import { DASHBOARD_PROPOSAL_CONVERSION_DEFAULTS } from '../../../../constants/dashboard.constants';
import { ChartCard, ChartSkeleton, ChartEmpty, ChartError } from '../shared';
import { formatTooltipValueWith } from '../../../../utils/chartTooltip';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_HEIGHT = 300;
const CHART_TITLE = 'Tỷ lệ chuyển đổi Đề xuất → Biên bản theo phòng ban';
const EMPTY_TEXT = 'Chưa có dữ liệu đề xuất';

// ─── Tooltip formatter ────────────────────────────────────────────────────────
// DASHBOARD_UI_SPEC.md §4.7: conversionRate hiển thị có "%" suffix

const tooltipFormatter = formatTooltipValueWith('%', (v) => `${v}`);

// ─── Component ────────────────────────────────────────────────────────────────

interface ProposalConversionChartProps {
  /** enabled=true khi Tab 3 active — lazy load per tab */
  enabled?: boolean;
}

export function ProposalConversionChart({ enabled = true }: ProposalConversionChartProps) {
  const { token } = theme.useToken();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useProposalConversion(DASHBOARD_PROPOSAL_CONVERSION_DEFAULTS, enabled);

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
          message="Không thể tải dữ liệu KPI Đề xuất"
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
        <BarChart
          data={items}
          margin={{ top: 8, right: 24, left: 0, bottom: 48 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />

          {/* X-axis: departmentName — DASHBOARD_DATA_DISCOVERY.md §5 API 3 */}
          <XAxis
            dataKey="departmentName"
            tick={{ fontSize: 12 }}
            angle={-30}
            textAnchor="end"
            interval={0}
            height={64}
          />

          {/* Y-axis: conversionRate (%) */}
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 12 }}
            width={48}
          />

          {/* Tooltip: DASHBOARD_UI_SPEC.md §4.7 — hiện "%" */}
          <Tooltip formatter={tooltipFormatter} />

          <Bar dataKey="conversionRate" radius={[4, 4, 0, 0]}>
            {items.map((entry) => (
              <Cell
                key={entry.departmentId}
                fill={token.colorPrimary}
                fillOpacity={entry.conversionRate >= 50 ? 1 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
