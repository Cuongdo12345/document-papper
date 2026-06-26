import { Card, Flex, Typography } from 'antd'
import type { FC } from 'react'
import { resolveMetricCardColor } from './MetricCard.config'
import MetricCardSkeleton from './MetricCardSkeleton'
import type { MetricCardProps } from './MetricCard.types'

const { Text, Title } = Typography

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD
// Nguồn: DASHBOARD_UI_SPEC.md §3 (KPI Card Layout)
//
// Visual structure:
//   [Icon]      Label nhỏ      ← icon trái, label phải, cùng dòng, màu secondary
//   142                         ← số lớn, bold, font-size 28px
//
// Dùng cho: Tab 1 (5 cards), Tab 2 (4 cards) — DASHBOARD_UI_SPEC.md §2.1, §2.2
// KHÔNG có trong Shared Components Library (CMP-01 → CMP-10) — component mới hợp lệ.
// ─────────────────────────────────────────────────────────────────────────────

const MetricCard: FC<MetricCardProps> = ({
  label,
  value,
  icon,
  colorToken = 'colorPrimary',
  loading = false,
  formatter,
  className,
  style,
}) => {
  // Loading state → render skeleton, không render nội dung thật
  if (loading) {
    return <MetricCardSkeleton />
  }

  const iconColor = resolveMetricCardColor(colorToken)
  const displayValue = formatter ? formatter(value) : value

  return (
    <Card
      bordered
      styles={{ body: { padding: 20 } }}
      style={{ minHeight: 96, ...style }}
      className={className}
    >
      {/* Row 1: Icon + Label */}
      <Flex align="center" gap={8} style={{ marginBottom: 8 }}>
        <span
          style={{
            fontSize: 24,
            lineHeight: 1,
            color: iconColor,
            display: 'inline-flex',
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {label}
        </Text>
      </Flex>

      {/* Row 2: Value */}
      <Title level={3} style={{ margin: 0, fontWeight: 600, fontSize: 28 }}>
        {displayValue}
      </Title>
    </Card>
  )
}

export default MetricCard
