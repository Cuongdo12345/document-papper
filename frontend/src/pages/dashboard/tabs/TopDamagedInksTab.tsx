// src/pages/dashboard/tabs/TopDamagedInksTab.tsx
//
// Tab 6 — Top mực hao hụt. Cấu trúc giống hệt TopDamagedDevicesTab —
// chỉ khác component chart (DASHBOARD_UI_SPEC.md §2.6: "Giống cấu trúc Tab 5").
//
// Source: DASHBOARD_UI_SPEC.md §2.6

import { TopDamagedInksChart } from '../../../components/dashboard/charts';
import type { DepartmentOption } from '../../../components/dashboard/filters';

interface TopDamagedInksTabProps {
  enabled: boolean;
  departmentOptions: DepartmentOption[];
  departmentOptionsLoading?: boolean;
}

export function TopDamagedInksTab({
  enabled,
  departmentOptions,
  departmentOptionsLoading = false,
}: TopDamagedInksTabProps) {
  return (
    <TopDamagedInksChart
      enabled={enabled}
      departmentOptions={departmentOptions}
      departmentOptionsLoading={departmentOptionsLoading}
    />
  );
}
