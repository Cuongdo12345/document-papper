// src/components/dashboard/charts/TopDamagedDevicesChart/TopDamagedDevicesChart.tsx
//
// Tab 5 — Top thiết bị hỏng: HorizontalBarChart + inline filter panel.
//
// Source:
//   DASHBOARD_UI_SPEC.md §4.4, §4.6, §4.7, §5.2, §2.5, §12.3
//   DASHBOARD_DATA_DISCOVERY.md §5 API 5 response shape
//   BUILD_DASHBOARD_QUERY_HOOKS.md §7 useTopDamagedDevices
//
// Chart type: BarChart layout="vertical" (Horizontal Bar)
//   X-axis: totalBroken (value)
//   Y-axis: deviceName (category)
//   Tooltip: số nguyên thuần — DASHBOARD_UI_SPEC.md §4.7
//
// Filter panel: Select phòng ban + DatePicker.RangePicker + AppButton "Áp dụng"
//   Source: DASHBOARD_UI_SPEC.md §5.2
//   Filter state: local useState — KHÔNG sync URL — DASHBOARD_UI_SPEC.md §12.3
//
// ⚠️ deviceName = meta.items.description của REPORT/CHECK_DAMAGE (không phải deviceName)
//    — DASHBOARD_DATA_DISCOVERY.md §13
//
// Height: động theo số items: max(300, items.length * 40) — DASHBOARD_UI_SPEC.md §4.4
// Empty text: "Không có thiết bị hỏng nào khớp với bộ lọc" — §10.2

import { useState } from 'react';
import { Select, DatePicker, Flex, Space, theme } from 'antd';
import dayjs from 'dayjs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AppButton } from '../../../../components/common/AppButton/AppButton';
import { useTopDamagedDevices } from '../../../../hooks/queries/useDashboard';
import { DASHBOARD_TOP_DAMAGED_DEFAULTS } from '../../../../constants/dashboard.constants';
import type { GetTopDamagedParams } from '../../../../types/dashboard/dashboard.dto';
import { ChartCard, ChartSkeleton, ChartEmpty, ChartError } from '../shared';
import { formatTooltipValue } from '../../../../utils/chartTooltip';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DepartmentOption {
  value: string;
  label: string;
}

interface TopDamagedDevicesChartProps {
  /** enabled=true khi Tab 5 active */
  enabled?: boolean;
  /** Options cho Select phòng ban — load từ useDepartmentList (caller cung cấp) */
  departmentOptions?: DepartmentOption[];
  departmentOptionsLoading?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_TITLE = 'Top 10 thiết bị hỏng nhiều nhất';
const EMPTY_TEXT = 'Không có thiết bị hỏng nào khớp với bộ lọc';

// ─── Component ────────────────────────────────────────────────────────────────

export function TopDamagedDevicesChart({
  enabled = true,
  departmentOptions = [],
  departmentOptionsLoading = false,
}: TopDamagedDevicesChartProps) {
  const { token } = theme.useToken();

  // ── Filter state — local, không sync URL (DASHBOARD_UI_SPEC.md §12.3) ──────
  const [draftDept, setDraftDept] = useState<string | undefined>();
  const [draftDateRange, setDraftDateRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null);
  const [appliedFilters, setAppliedFilters] = useState<GetTopDamagedParams>(
    DASHBOARD_TOP_DAMAGED_DEFAULTS,
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useTopDamagedDevices(appliedFilters, enabled);

  // ── Apply filter handler ───────────────────────────────────────────────────
  const handleApply = () => {
    setAppliedFilters({
      ...DASHBOARD_TOP_DAMAGED_DEFAULTS,
      department: draftDept || undefined,
      fromDate: draftDateRange?.[0]?.toISOString() ?? undefined,
      toDate: draftDateRange?.[1]?.toISOString() ?? undefined,
    });
  };

  // ── Computed chart height — DASHBOARD_UI_SPEC.md §4.4 ────────────────────
  const items = data?.items ?? [];
  const chartHeight = Math.max(300, items.length * 40);

  // ── Render filter panel ────────────────────────────────────────────────────
  // DASHBOARD_UI_SPEC.md §5.2 — inline filter row (không dùng FilterBar đầy đủ)
  const filterPanel = (
    <Flex
      gap={12}
      wrap="wrap"
      style={{ marginBottom: 16 }}
      align="flex-end"
    >
      <Select
        placeholder="Tất cả phòng ban"
        allowClear
        loading={departmentOptionsLoading}
        options={departmentOptions}
        value={draftDept}
        onChange={setDraftDept}
        style={{ minWidth: 200 }}
      />
      <DatePicker.RangePicker
        allowEmpty={[true, true]}
        format="DD/MM/YYYY"
        value={draftDateRange}
        onChange={setDraftDateRange}
      />
      <AppButton variant="primary" onClick={handleApply}>
        Áp dụng
      </AppButton>
    </Flex>
  );

  // ── Loading — skeleton bên dưới filter (filter vẫn hiện) ─────────────────
  if (isLoading) {
    return (
      <ChartCard title={CHART_TITLE}>
        {filterPanel}
        <ChartSkeleton height={chartHeight} showTitle={false} />
      </ChartCard>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    const backendMsg = (error as any)?.response?.data?.message;
    return (
      <ChartCard title={CHART_TITLE}>
        {filterPanel}
        <ChartError
          message="Không thể tải dữ liệu thiết bị hỏng"
          description={backendMsg}
          onRetry={refetch}
          height={300}
        />
      </ChartCard>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <ChartCard title={CHART_TITLE}>
        {filterPanel}
        <ChartEmpty text={EMPTY_TEXT} height={300} />
      </ChartCard>
    );
  }

  // ── Chart ──────────────────────────────────────────────────────────────────
  return (
    <ChartCard title={CHART_TITLE} isFetching={isFetching && !isLoading}>
      {filterPanel}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={items}
          margin={{ top: 8, right: 32, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke={token.colorBorderSecondary}
          />

          {/* Y-axis: deviceName (category trong horizontal layout) */}
          <YAxis
            type="category"
            dataKey="deviceName"
            width={160}
            tick={{ fontSize: 12 }}
          />

          {/* X-axis: totalBroken (value) */}
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12 }}
          />

          {/* Tooltip: số nguyên thuần — DASHBOARD_UI_SPEC.md §4.7 */}
          <Tooltip
            // formatter={(value: number | string) => [Number(value), 'Số lượng hỏng']}
            formatter={formatTooltipValue('Số lượng hỏng')}
          />

          <Bar
            dataKey="totalBroken"
            fill={token.colorError}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
