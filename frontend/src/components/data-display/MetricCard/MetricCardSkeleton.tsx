import { Card, Flex, Skeleton } from 'antd'
import type { FC } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD SKELETON
// Nguồn: DASHBOARD_UI_SPEC.md §8.2
//
// Skeleton layout:
//   [Skeleton circle 24px]      ← thay icon
//   [Skeleton text 60%]         ← thay label
//   [Skeleton text 40%, h=28]   ← thay value số lớn
//
// min-height: 96px — khớp với MetricCard thật để tránh layout shift
// khi data load xong (DASHBOARD_UI_SPEC.md §3.2 + §8.2)
// ─────────────────────────────────────────────────────────────────────────────

const MetricCardSkeleton: FC = () => {
  return (
    <Card
      bordered
      styles={{ body: { padding: 20 } }}
      style={{ minHeight: 96 }}
    >
      <Flex align="center" gap={8} style={{ marginBottom: 12 }}>
        {/* Icon placeholder — circle 24px */}
        <Skeleton.Avatar active size={24} shape="circle" />
        {/* Label placeholder — 60% width */}
        <Skeleton.Input
          active
          size="small"
          style={{ width: '60%', height: 14 }}
        />
      </Flex>

      {/* Value placeholder — 40% width, height ~28px để khớp Typography.Title level=3 */}
      <Skeleton.Input
        active
        size="small"
        style={{ width: '40%', height: 28 }}
      />
    </Card>
  )
}

export default MetricCardSkeleton
