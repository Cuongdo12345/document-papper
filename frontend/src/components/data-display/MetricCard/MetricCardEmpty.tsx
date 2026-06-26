import { Card, Empty } from 'antd'
import type { FC, ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD EMPTY STATE
// Nguồn: DASHBOARD_UI_SPEC.md §10
//
// Áp dụng khi: toàn bộ MetricCardGrid không có dữ liệu để hiển thị
// (vd: chưa chọn phòng ban ở Tab 2 — DASHBOARD_UI_SPEC.md §10.3,
//  hoặc trường hợp hệ thống hoàn toàn chưa có dữ liệu).
//
// LƯU Ý: Khác với Empty state của Chart (đã thuộc phạm vi BUILD Charts —
// không build ở đây). Component này CHỈ dành cho vùng KPI Card.
// ─────────────────────────────────────────────────────────────────────────────

export interface MetricCardEmptyProps {
  // Text hiển thị — DASHBOARD_UI_SPEC.md §10.2/§10.3 đã định nghĩa text cụ thể theo từng case
  // Caller truyền đúng text theo ngữ cảnh (vd: "Chọn phòng ban để xem thống kê")
  text: string

  // Icon tùy chọn — vd: ApartmentOutlined cho case "chưa chọn phòng ban" (DASHBOARD_UI_SPEC.md §10.3)
  // Nếu không truyền → dùng AntD Empty.PRESENTED_IMAGE_SIMPLE mặc định
  icon?: ReactNode

  // min-height để tránh layout shift khi data load vào (DASHBOARD_UI_SPEC.md §10.3 — 240px)
  minHeight?: number   // Default 240
}

const MetricCardEmpty: FC<MetricCardEmptyProps> = ({
  text,
  icon,
  minHeight = 240,
}) => {
  return (
    <Card
      bordered
      style={{
        minHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      styles={{
        body: {
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      {icon ? (
        // Custom icon block — dùng cho case "chưa thực hiện hành động"
        // (vd: ApartmentOutlined 48px, màu colorTextQuaternary — DASHBOARD_UI_SPEC.md §10.3)
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 48,
              color: 'var(--ant-color-text-quaternary, #bfbfbf)',
              marginBottom: 12,
              display: 'flex',
              justifyContent: 'center',
            }}
            aria-hidden="true"
          >
            {icon}
          </div>
          <div
            style={{
              color: 'var(--ant-color-text-secondary, #595959)',
              fontSize: 14,
            }}
          >
            {text}
          </div>
        </div>
      ) : (
        // Default — AntD Empty cho case "no data" thật (DASHBOARD_UI_SPEC.md §10.2)
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={text}
        />
      )}
    </Card>
  )
}

export default MetricCardEmpty
