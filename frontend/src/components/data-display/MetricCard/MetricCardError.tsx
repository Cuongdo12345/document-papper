import { Result } from 'antd'
import type { FC } from 'react'
import {AppButton} from '../../common/AppButton/AppButton'

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD ERROR STATE
// Nguồn: DASHBOARD_UI_SPEC.md §9.2 – §9.3
//
// Dùng khi query cung cấp data cho MetricCardGrid bị lỗi (4xx/5xx/network).
// Theo DASHBOARD_UI_SPEC.md §9.5: Tab 1 chỉ có 1 API duy nhất cấp data cho
// TẤT CẢ MetricCard + Charts + Table — nếu lỗi, hiện 1 ErrorState DUY NHẤT
// thay toàn bộ vùng nội dung, KHÔNG lặp lại 5 ErrorState riêng cho từng card.
//
// Component này dùng AppButton (CMP-01) — tái sử dụng, không tạo button riêng.
// ─────────────────────────────────────────────────────────────────────────────

export interface MetricCardErrorProps {
  message?: string        // Default: "Không thể tải dữ liệu"
  description?: string    // Mô tả phụ — lấy từ error.response?.data?.message nếu có
  onRetry?: () => void     // Nếu truyền → hiện nút "Thử lại" gọi query.refetch()
}

const MetricCardError: FC<MetricCardErrorProps> = ({
  message = 'Không thể tải dữ liệu',
  description,
  onRetry,
}) => {
  return (
    <Result
      status="error"
      title={message}
      subTitle={description}
      extra={
        onRetry ? (
          <AppButton variant="secondary" onClick={onRetry}>
            Thử lại
          </AppButton>
        ) : undefined
      }
      style={{ padding: '24px 0' }}
    />
  )
}

export default MetricCardError
