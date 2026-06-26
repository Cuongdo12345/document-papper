import { Col, Row } from 'antd'
import type { FC } from 'react'
import MetricCard from './MetricCard'
import type { MetricCardGridProps } from './MetricCardGrid.types'

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD GRID
// Nguồn: DASHBOARD_UI_SPEC.md §3.3
//
// Responsive breakpoint mặc định (khi không truyền columnsXX):
//   xs: 1 cột · sm: 2 cột · md: 3 cột (Tab1) hoặc 2 cột (Tab2) · lg/xl: full 1 dòng
//
// Dùng AntD Row/Col chia 24 — mỗi Col span = 24 / số cột mong muốn.
// ─────────────────────────────────────────────────────────────────────────────

const MetricCardGrid: FC<MetricCardGridProps> = ({
  items,
  loading = false,
  columnsXs = 1,
  columnsSm = 2,
  columnsMd,
  columnsLg,
  columnsXl,
  gutter = 16,
  className,
  style,
}) => {
  const total = items.length

  // Resolve default columns nếu caller không truyền — dựa theo DASHBOARD_UI_SPEC.md §3.3
  // Tab 1 (5 cards): md=3, lg/xl=5 · Tab 2 (4 cards): md=2, lg/xl=4
  const resolvedMd = columnsMd ?? (total >= 5 ? 3 : 2)
  const resolvedLg = columnsLg ?? total
  const resolvedXl = columnsXl ?? total

  // Chuyển "số cột" → AntD col span (chia 24), floor để tránh tổng > 24
  const spanFor = (cols: number): number => Math.floor(24 / Math.max(cols, 1))

  return (
    <Row gutter={[gutter, gutter]} className={className} style={style}>
      {items.map((item) => (
        <Col
          key={item.key}
          xs={spanFor(columnsXs)}
          sm={spanFor(columnsSm)}
          md={spanFor(resolvedMd)}
          lg={spanFor(resolvedLg)}
          xl={spanFor(resolvedXl)}
        >
          <MetricCard
            label={item.label}
            value={item.value}
            icon={item.icon}
            colorToken={item.colorToken}
            formatter={item.formatter}
            loading={loading}
            className={item.className}
            style={item.style}
          />
        </Col>
      ))}
    </Row>
  )
}

export default MetricCardGrid
