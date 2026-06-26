// src/components/dashboard/filters/TopDamagedFilterPanel.tsx
//
// Tab 5 & 6 — Filter Panel hoàn chỉnh (Department + DateRange + Áp dụng + Reset).
// Source: DASHBOARD_UI_SPEC.md §5.2, §6.4 (responsive), §12.3 (flow)
//
// Inline filter row — KHÔNG dùng FilterBar (CMP-05), lý do xem dashboard-filter.types.ts.
//
// Pattern draft/applied:
//   draft  — giá trị user đang chỉnh, CHƯA gửi API
//   applied — giá trị đã submit, truyền vào hook (useTopDamagedDevices/useTopDamagedInks)
//
// "Áp dụng" → copy draft → applied → query key đổi → React Query tự fetch.
// "Xóa bộ lọc" (Reset) → đưa cả draft và applied về mặc định.

import { useState } from 'react';
import { Flex } from 'antd';
import { AppButton } from '../../common/AppButton';
import { DepartmentFilterSelect } from './DepartmentFilterSelect';
import { DateRangeFilter, dateRangeToParams } from './DateRangeFilter';
import {
  TOP_DAMAGED_FILTER_DRAFT_DEFAULT,
  type DepartmentOption,
  type TopDamagedFilterApplied,
  type TopDamagedFilterDraft,
} from './dashboard-filter.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TopDamagedFilterPanelProps {
  departmentOptions: DepartmentOption[];
  departmentOptionsLoading?: boolean;
  /** Gọi khi user click "Áp dụng" — truyền params đã build sẵn (department/fromDate/toDate) */
  onApply: (applied: TopDamagedFilterApplied) => void;
  /** Gọi khi user click "Xóa bộ lọc" — truyền params rỗng */
  onReset: () => void;
  /** Disable toàn bộ filter khi query đang loading lần đầu (không disable khi background refetch) */
  disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TopDamagedFilterPanel({
  departmentOptions,
  departmentOptionsLoading = false,
  onApply,
  onReset,
  disabled = false,
}: TopDamagedFilterPanelProps) {
  // Draft state — local, chưa submit
  const [draft, setDraft] = useState<TopDamagedFilterDraft>(
    TOP_DAMAGED_FILTER_DRAFT_DEFAULT,
  );

  // ── Áp dụng ──────────────────────────────────────────────────────────────
  const handleApply = () => {
    const dateParams = dateRangeToParams(draft.dateRange);
    onApply({
      department: draft.department,
      ...dateParams,
    });
  };

  // ── Xóa bộ lọc — DASHBOARD_UI_SPEC.md không có nút Reset riêng tường minh,
  //    nhưng FE-08 Filter task yêu cầu "Reset Filter" — bổ sung hợp lý dựa
  //    trên pattern reset chuẩn của hệ thống (FilterBar CMP-05 cũng có onReset) ──
  const handleReset = () => {
    setDraft(TOP_DAMAGED_FILTER_DRAFT_DEFAULT);
    onReset();
  };

  const hasActiveDraft =
    !!draft.department || !!draft.dateRange?.[0] || !!draft.dateRange?.[1];

  return (
    <Flex
      gap={12}
      wrap="wrap"
      align="flex-end"
      style={{ marginBottom: 16 }}
      // DASHBOARD_UI_SPEC.md §6.4: stack vertical < 768px, row ≥ 768px
      className="dashboard-filter-panel"
    >
      <DepartmentFilterSelect
        value={draft.department}
        onChange={(department) => setDraft((prev) => ({ ...prev, department }))}
        options={departmentOptions}
        loading={departmentOptionsLoading}
      />

      <DateRangeFilter
        value={draft.dateRange}
        onChange={(dateRange) => setDraft((prev) => ({ ...prev, dateRange }))}
        disabled={disabled}
      />

      <AppButton variant="primary" size="middle" onClick={handleApply} disabled={disabled}>
        Áp dụng
      </AppButton>

      {hasActiveDraft && (
        <AppButton variant="secondary" size="middle" onClick={handleReset} disabled={disabled}>
          Xóa bộ lọc
        </AppButton>
      )}
    </Flex>
  );
}
