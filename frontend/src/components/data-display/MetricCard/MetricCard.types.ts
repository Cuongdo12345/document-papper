import type { CSSProperties, ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD — Types
// Nguồn: DASHBOARD_UI_SPEC.md §3 (KPI Card Layout)
// ─────────────────────────────────────────────────────────────────────────────

// Màu icon theo semantic — map sang AntD design token (DASHBOARD_UI_SPEC.md §3.4)
// Không hardcode hex tùy ý ở component dùng MetricCard — luôn chọn 1 trong các giá trị này
export type MetricCardColorToken =
  | 'colorPrimary'
  | 'colorInfo'
  | 'colorSuccess'
  | 'colorWarning'
  | 'colorError'
  | 'colorPurple'

export interface MetricCardProps {
  // 1. Nội dung chính
  label: string
  value: number | string

  // 2. Icon — ReactNode để caller tự chọn icon từ @ant-design/icons
  icon: ReactNode
  colorToken?: MetricCardColorToken   // Default: 'colorPrimary'

  // 3. Loading state — khi true, render MetricCardSkeleton thay nội dung
  loading?: boolean

  // 4. Định dạng số — formatter tùy chọn (vd: thêm "%", dấu phân cách hàng nghìn)
  // Không tự động thêm dấu phẩy — caller chủ động truyền formatter nếu cần
  formatter?: (value: number | string) => string

  // 5. Display
  className?: string
  style?: CSSProperties
}
