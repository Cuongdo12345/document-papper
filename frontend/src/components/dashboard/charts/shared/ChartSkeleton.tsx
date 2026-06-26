// src/components/dashboard/charts/shared/ChartSkeleton.tsx
//
// Loading skeleton cho mọi chart widget trong Dashboard.
// Source: DASHBOARD_UI_SPEC.md §8.3

import { Skeleton } from 'antd';

interface ChartSkeletonProps {
  /** Khớp đúng với height của chart thật — tránh layout shift khi data về */
  height?: number;
  /** Title giả ở trên — 30% width theo spec §8.3 */
  showTitle?: boolean;
}

export function ChartSkeleton({ height = 300, showTitle = true }: ChartSkeletonProps) {
  return (
    <div style={{ width: '100%' }}>
      {showTitle && (
        <Skeleton.Input
          active
          style={{ width: '30%', height: 20, marginBottom: 16 }}
        />
      )}
      <Skeleton.Node
        active
        style={{ width: '100%', height, borderRadius: 8 }}
      >
        {/* Nội dung rỗng — Skeleton.Node render block placeholder */}
        <span />
      </Skeleton.Node>
    </div>
  );
}
