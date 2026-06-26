// src/pages/dashboard/tabs/DamageTrendTab.tsx
//
// Tab 4 — Xu hướng hư hỏng. Ghép DeviceDamageTrendChart (self-contained, FE-08E Phần 2).
//
// Source: DASHBOARD_UI_SPEC.md §2.4

import { DeviceDamageTrendChart } from '../../../components/dashboard/charts';

interface DamageTrendTabProps {
  enabled: boolean;
}

export function DamageTrendTab({ enabled }: DamageTrendTabProps) {
  return <DeviceDamageTrendChart enabled={enabled} />;
}
