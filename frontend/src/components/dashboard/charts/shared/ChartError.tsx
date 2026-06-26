// src/components/dashboard/charts/shared/ChartError.tsx
//
// Error state cho mọi chart widget trong Dashboard.
// Source: DASHBOARD_UI_SPEC.md §9.2, §9.3
//
// Tái dùng AppButton (CMP-01) cho nút "Thử lại" — không tạo button riêng.
// Không full-page — chỉ chiếm vùng chart trong Card.

import { Result } from 'antd';
import { AppButton } from '../../../common/AppButton/AppButton';

interface ChartErrorProps {
  /** Tiêu đề lỗi — default "Không thể tải dữ liệu" */
  message?: string;
  /** Mô tả phụ — từ error.response?.data?.message nếu có */
  description?: string;
  /** Nếu truyền → hiện nút "Thử lại" */
  onRetry?: () => void;
  /** Khớp height với chart thật — tránh layout shift */
  height?: number;
}

export function ChartError({
  message = 'Không thể tải dữ liệu',
  description,
  onRetry,
  height = 300,
}: ChartErrorProps) {
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
      <Result
        status="error"
        title={message}
        subTitle={description}
        style={{ padding: '24px 0' }}
        extra={
          onRetry ? (
            <AppButton variant="secondary" onClick={onRetry}>
              Thử lại
            </AppButton>
          ) : undefined
        }
      />
    </div>
  );
}
