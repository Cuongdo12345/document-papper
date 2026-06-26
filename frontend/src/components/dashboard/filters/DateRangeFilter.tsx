// src/components/dashboard/filters/DateRangeFilter.tsx
//
// Tab 5 & 6 — Khoảng ngày filter (fromDate / toDate).
// Source: DASHBOARD_UI_SPEC.md §5.2
//
// ⚠️ Bắt buộc dùng DatePicker (không input text tự do) — DASHBOARD_ANALYSIS_V2.md §8:
//    backend không validate format fromDate/toDate, parse qua new Date().
//    DatePicker đảm bảo giá trị luôn convert được sang ISO string hợp lệ.

import { DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface DateRangeFilterProps {
  value: [Dayjs | null, Dayjs | null] | null;
  onChange: (value: [Dayjs | null, Dayjs | null] | null) => void;
  disabled?: boolean;
}

export function DateRangeFilter({
  value,
  onChange,
  disabled = false,
}: DateRangeFilterProps) {
  return (
    <RangePicker
      // allowEmpty cho phép chỉ chọn 1 đầu (chỉ fromDate hoặc chỉ toDate)
      // DASHBOARD_UI_SPEC.md §5.2
      allowEmpty={[true, true]}
      format="DD/MM/YYYY"
      value={value as any}
      onChange={onChange as any}
      disabled={disabled}
      placeholder={['Từ ngày', 'Đến ngày']}
    />
  );
}

/**
 * Helper: convert RangePicker value → ISO string params cho GetTopDamagedParams.
 * Dùng tại nơi build applied filter (component cha hoặc chart component).
 */
export function dateRangeToParams(
  range: [Dayjs | null, Dayjs | null] | null,
): { fromDate?: string; toDate?: string } {
  if (!range) return {};
  const [from, to] = range;
  return {
    fromDate: from ? from.toISOString() : undefined,
    toDate: to ? to.toISOString() : undefined,
  };
}
