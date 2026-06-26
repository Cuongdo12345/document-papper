// src/components/feedback/ErrorState/ErrorState.tsx
//
// Shared ErrorState — dùng khi lỗi ảnh hưởng TOÀN BỘ vùng nội dung (không phải 1 chart đơn).
// Source: DASHBOARD_UI_SPEC.md §9.2, §9.3, §9.5, §9.6
//
// Khác với ChartError (components/dashboard/charts/shared) — ChartError dùng riêng
// trong 1 chart Card. ErrorState dùng cho toàn bộ Tab Content khi chỉ có 1 API
// duy nhất cấp data cho nhiều widget (Tab 1: MetricCards + Charts + Table cùng 1 query).

import { Result } from 'antd';
import { AppButton } from '../../common/AppButton/AppButton';

export interface ErrorStateProps {
  /** Tiêu đề lỗi — default "Không thể tải dữ liệu" */
  message?: string;
  /** Mô tả phụ — lấy từ error.response?.data?.message nếu có */
  description?: string;
  /** Nếu truyền → hiện nút "Thử lại" gọi query.refetch() */
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Không thể tải dữ liệu',
  description,
  onRetry,
}: ErrorStateProps) {
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
    />
  );
}
