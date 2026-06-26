// src/components/dashboard/charts/shared/ChartEmpty.tsx
//
// Empty state cho mọi chart widget trong Dashboard.
// Source: DASHBOARD_UI_SPEC.md §10 — PRESENTED_IMAGE_SIMPLE + text theo ngữ cảnh

import { Empty } from 'antd';

interface ChartEmptyProps {
  /** Text mô tả theo ngữ cảnh cụ thể — DASHBOARD_UI_SPEC.md §10.2 */
  text: string;
  /** Khớp height với chart thật — tránh layout shift */
  height?: number;
}

export function ChartEmpty({ text, height = 300 }: ChartEmptyProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height,
        width: '100%',
      }}
    >
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={text}
      />
    </div>
  );
}
