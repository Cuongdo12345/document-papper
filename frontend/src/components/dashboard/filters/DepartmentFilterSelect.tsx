// src/components/dashboard/filters/DepartmentFilterSelect.tsx
//
// Tab 2 — Department Selector (đơn field, không phải filter panel đầy đủ).
// Source: DASHBOARD_UI_SPEC.md §5.1
//
// Khác Tab 5/6/7: không có nút "Áp dụng" riêng — chọn xong áp dụng ngay
// (parent tự setSelectedDeptId(value) trong onChange).

import { Select } from 'antd';
import type { DepartmentOption } from './dashboard-filter.types';

interface DepartmentFilterSelectProps {
  value: string | undefined;
  onChange: (departmentId: string | undefined) => void;
  options: DepartmentOption[];
  loading?: boolean;
}

export function DepartmentFilterSelect({
  value,
  onChange,
  options,
  loading = false,
}: DepartmentFilterSelectProps) {
  return (
    <Select
      placeholder="Chọn phòng ban..."
      showSearch
      loading={loading}
      value={value}
      onChange={onChange}
      options={options}
      // Lọc theo label khi gõ tìm kiếm — DASHBOARD_UI_SPEC.md §5.1 "showSearch: true"
      filterOption={(input, option) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
      }
      // allowClear=false — DASHBOARD_UI_SPEC.md §5.1:
      // "không cần clear vì chọn lại trực tiếp là đủ"
      allowClear={false}
      style={{ maxWidth: 360, width: '100%' }}
      className="dashboard-department-select"
    />
  );
}
