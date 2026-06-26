// src/pages/dashboard/tabs/TopDamagedDevicesTab.tsx
//
// Tab 5 — Top thiết bị hỏng. Ghép TopDamagedDevicesChart (self-contained, đã có
// filter panel tích hợp sẵn — FE-08E Phần 2). Tab chỉ truyền departmentOptions
// xuống (load từ departmentList query, ngoài phạm vi Dashboard module).
//
// Source: DASHBOARD_UI_SPEC.md §2.5

import { TopDamagedDevicesChart } from '../../../components/dashboard/charts';
import type { DepartmentOption } from '../../../components/dashboard/filters';

interface TopDamagedDevicesTabProps {
  enabled: boolean;
  departmentOptions: DepartmentOption[];
  departmentOptionsLoading?: boolean;
}

export function TopDamagedDevicesTab({
  enabled,
  departmentOptions,
  departmentOptionsLoading = false,
}: TopDamagedDevicesTabProps) {
  return (
    <TopDamagedDevicesChart
      enabled={enabled}
      departmentOptions={departmentOptions}
      departmentOptionsLoading={departmentOptionsLoading}
    />
  );
}
