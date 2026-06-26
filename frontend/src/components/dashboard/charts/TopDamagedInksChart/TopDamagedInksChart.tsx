// src/components/dashboard/charts/TopDamagedInksChart/TopDamagedInksChart.tsx
//
// Tab 6 — Top mực hao hụt: HorizontalBarChart + inline filter panel.
//
// Source:
//   DASHBOARD_UI_SPEC.md §4.4, §4.6, §2.6
//   DASHBOARD_DATA_DISCOVERY.md §5 API 6 response shape
//   BUILD_DASHBOARD_QUERY_HOOKS.md §8 useTopDamagedInks
//
// Cấu trúc GIỐNG HỆT TopDamagedDevicesChart — chỉ khác:
//   1. Hook: useTopDamagedInks (API 6 — source CONFIRM_STATUS)
//   2. Chart title / empty text / error message
//   3. Bar fill color: colorWarning thay vì colorError
//
// DASHBOARD_UI_SPEC.md §2.6: "Giống cấu trúc Tab 5 — chỉ khác data source"
//
// ⚠️ deviceName = meta.items.description của REPORT/CONFIRM_STATUS
//    — DASHBOARD_DATA_DISCOVERY.md §13

import { useState } from 'react';
import { Select, DatePicker, Flex, theme } from 'antd';
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
import { useTopDamagedInks } from '../../../../hooks/queries/useDashboard';
import { DASHBOARD_TOP_DAMAGED_DEFAULTS } from '../../../../constants/dashboard.constants';
import type { GetTopDamagedParams } from '../../../../types/dashboard/dashboard.dto';
import { ChartCard, ChartSkeleton, ChartEmpty, ChartError } from '../shared';
import { formatTooltipValue } from '../../../../utils/chartTooltip';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DepartmentOption {
  value: string;
  label: string;
}

interface TopDamagedInksChartProps {
  enabled?: boolean;
  departmentOptions?: DepartmentOption[];
  departmentOptionsLoading?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_TITLE = 'Top 10 mực hao hụt nhiều nhất';
const EMPTY_TEXT = 'Không có dữ liệu mực hao hụt khớp với bộ lọc';

// ─── Component ────────────────────────────────────────────────────────────────

export function TopDamagedInksChart({
  enabled = true,
  departmentOptions = [],
  departmentOptionsLoading = false,
}: TopDamagedInksChartProps) {
  const { token } = theme.useToken();

  // ── Filter state — local, không sync URL ──────────────────────────────────
  const [draftDept, setDraftDept] = useState<string | undefined>();
  const [draftDateRange, setDraftDateRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null);
  const [appliedFilters, setAppliedFilters] = useState<GetTopDamagedParams>(
    DASHBOARD_TOP_DAMAGED_DEFAULTS,
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useTopDamagedInks(appliedFilters, enabled);

  const handleApply = () => {
    setAppliedFilters({
      ...DASHBOARD_TOP_DAMAGED_DEFAULTS,
      department: draftDept || undefined,
      fromDate: draftDateRange?.[0]?.toISOString() ?? undefined,
      toDate: draftDateRange?.[1]?.toISOString() ?? undefined,
    });
  };

  const items = data?.items ?? [];
  const chartHeight = Math.max(300, items.length * 40);

  // ── Filter panel — DASHBOARD_UI_SPEC.md §5.2 ─────────────────────────────
  const filterPanel = (
    <Flex gap={12} wrap="wrap" style={{ marginBottom: 16 }} align="flex-end">
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

  // ── Loading ────────────────────────────────────────────────────────────────
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
          message="Không thể tải dữ liệu mực hao hụt"
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
          <YAxis
            type="category"
            dataKey="deviceName"
            width={160}
            tick={{ fontSize: 12 }}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            // formatter={(value: number) => [value, 'Số lượng hao hụt']}
            // formatter={(value) => [Number(value ?? 0), 'Số lượng hao hụt']}
            formatter={formatTooltipValue('Số lượng hao hụt')}
          />
          <Bar
            dataKey="totalBroken"
            // Màu khác với Tab 5 để phân biệt ink vs device
            fill={token.colorWarning}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
