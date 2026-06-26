// src/pages/dashboard/tabs/ProposalKpiTab.tsx
//
// Tab 3 — KPI Đề xuất. Đơn giản — chỉ ghép ProposalConversionChart
// (component self-contained đã build ở FE-08E Phần 2, tự gọi hook + xử lý mọi state).
//
// Source: DASHBOARD_UI_SPEC.md §2.3

import { ProposalConversionChart } from '../../../components/dashboard/charts';

interface ProposalKpiTabProps {
  enabled: boolean;
}

export function ProposalKpiTab({ enabled }: ProposalKpiTabProps) {
  return <ProposalConversionChart enabled={enabled} />;
}
