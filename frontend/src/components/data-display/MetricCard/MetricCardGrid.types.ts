import type { CSSProperties } from 'react'
import type { MetricCardProps } from './MetricCard.types'

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD GRID — Types
// Nguồn: DASHBOARD_UI_SPEC.md §3.3
// ─────────────────────────────────────────────────────────────────────────────

// Một item trong grid — toàn bộ props của MetricCard trừ `loading`
// (loading được điều khiển tập trung ở cấp Grid, không set riêng từng card)
export interface MetricCardItem extends Omit<MetricCardProps, 'loading'> {
  key: string   // Định danh duy nhất cho item — dùng làm React key
}

export interface MetricCardGridProps {
  // 1. Data
  items: MetricCardItem[]

  // 2. Loading — áp dụng đồng thời cho TẤT CẢ card trong grid
  // Khớp thực tế: Tab 1/Tab 2 chỉ có 1 query duy nhất cung cấp toàn bộ MetricCard
  // → loading/error luôn đồng bộ giữa các card, không có trường hợp 1 card loading
  //   còn card khác đã có data trong cùng 1 Tab (DASHBOARD_ANALYSIS_V2.md §9.5)
  loading?: boolean

  // 3. Số cột tại mỗi breakpoint — caller truyền theo Tab (5 cards hoặc 4 cards)
  // Nguồn: DASHBOARD_UI_SPEC.md §3.3 — bảng breakpoint chính xác cho Tab 1 (5) / Tab 2 (4)
  columnsXs?: number   // Default 1
  columnsSm?: number   // Default 2
  columnsMd?: number   // Default — tính từ items.length nếu không truyền
  columnsLg?: number   // Default — items.length (1 dòng)
  columnsXl?: number   // Default — items.length (1 dòng)

  // 4. Khoảng cách giữa các card
  gutter?: number   // Default 16 — dùng cho cả horizontal và vertical gutter

  // 5. Display
  className?: string
  style?: CSSProperties
}
