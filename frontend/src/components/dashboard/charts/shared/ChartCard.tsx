// src/components/dashboard/charts/shared/ChartCard.tsx
//
// Card wrapper chung cho tất cả chart trong Dashboard.
// Source: DASHBOARD_UI_SPEC.md §8.7 — background refetch Spin nhỏ góc phải
//
// Tất cả chart đều bọc trong AntD Card theo DASHBOARD_UI_SPEC.md §11.3.
// Tập trung title + refetch indicator tại đây — không lặp lại ở từng chart.

import type { ReactNode } from 'react';
import { Card, Spin } from 'antd';

interface ChartCardProps {
  /** Tiêu đề chart — ví dụ "Xu hướng báo cáo hư hỏng theo tháng" */
  title: string;
  children: ReactNode;
  /**
   * isFetching && !isLoading — background refetch đang chạy.
   * Hiện Spin nhỏ góc phải title, không che nội dung.
   */
  isFetching?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function ChartCard({
  title,
  children,
  isFetching = false,
  style,
  className,
}: ChartCardProps) {
  return (
    <Card
      bordered
      style={style}
      className={className}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{title}</span>
          {/* Background refetch indicator — DASHBOARD_UI_SPEC.md §8.7 */}
          {isFetching && <Spin size="small" />}
        </div>
      }
    >
      {children}
    </Card>
  );
}
