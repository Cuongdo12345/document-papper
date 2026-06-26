// src/components/dashboard/filters/DeviceStatsFilterPanel.tsx
//
// Tab 7 — Filter Panel bắt buộc (Tháng + Năm).
// Source: DASHBOARD_UI_SPEC.md §5.3, §12.4
//
// Khác Tab 5/6: KHÔNG có nút "Áp dụng" — auto-trigger refetch ngay khi đổi giá trị
// (chỉ 2 Select đơn giản, đổi 1 trong 2 là đủ ý định rõ ràng — DASHBOARD_UI_SPEC.md §12.4).
//
// month/year BẮT BUỘC — không allowClear cho Select Tháng.
// Default value resolve tại nơi gọi (DashboardPage/Tab7), không phải tại đây.

import { Select, Flex } from 'antd';
import {
  MONTH_SELECT_OPTIONS,
  YEAR_SELECT_RANGE,
} from '../../../constants/dashboard.constants';
import type { DeviceStatsFilterValue } from './dashboard-filter.types';

// ─── Year options builder ───────────────────────────────────────────────────
// DASHBOARD_UI_SPEC.md §5.3: "Options từ năm hiện tại trở về 5 năm trước"

function buildYearOptions(currentYear: number): { value: number; label: string }[] {
  return Array.from({ length: YEAR_SELECT_RANGE }, (_, i) => {
    const year = currentYear - i;
    return { value: year, label: String(year) };
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DeviceStatsFilterPanelProps {
  value: DeviceStatsFilterValue;
  onChange: (value: DeviceStatsFilterValue) => void;
  /** Năm hiện tại — dayjs().year(), truyền từ caller để dễ test */
  currentYear: number;
  disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeviceStatsFilterPanel({
  value,
  onChange,
  currentYear,
  disabled = false,
}: DeviceStatsFilterPanelProps) {
  const yearOptions = buildYearOptions(currentYear);

  return (
    <Flex
      gap={12}
      wrap="wrap"
      style={{ marginBottom: 16 }}
      className="dashboard-filter-panel"
    >
      <Select
        // Không allowClear — DASHBOARD_UI_SPEC.md §5.3: "bắt buộc luôn có giá trị"
        allowClear={false}
        options={MONTH_SELECT_OPTIONS}
        value={value.month}
        onChange={(month) => onChange({ ...value, month })}
        disabled={disabled}
        style={{ width: 140 }}
        placeholder="Tháng"
      />

      <Select
        allowClear={false}
        options={yearOptions}
        value={value.year}
        onChange={(year) => onChange({ ...value, year })}
        disabled={disabled}
        style={{ width: 120 }}
        placeholder="Năm"
      />
    </Flex>
  );
}
