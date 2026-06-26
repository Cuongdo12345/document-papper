// src/pages/dashboard/tabs/DepartmentTab.tsx
//
// Tab 2 — Theo phòng ban. 2 query độc lập:
//   departmentList (Select options) — KHÔNG thuộc Dashboard module, query module Departments
//   departmentDashboard (nội dung) — useDepartmentDashboard
//
// Nếu departmentDashboard lỗi → Select vẫn hoạt động, chỉ vùng kết quả hiện ErrorState
// (DASHBOARD_UI_SPEC.md §9.6 — khác Tab 1 vì 2 query độc lập về UI).

import { useState } from 'react';
import { Row, Col } from 'antd';
import {
  FileTextOutlined,
  FormOutlined,
  FileDoneOutlined,
  TeamOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { useDepartmentDashboard } from '../../../hooks/queries/useDashboard';
import { MetricCardGrid, MetricCardEmpty } from '../../../components/data-display/MetricCard';
import { BarChartWidget } from '../../../components/data-display/BarChartWidget';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { DataTable } from '../../../components/data-display/DataTable';
import StatusBadge from '../../../components/data-display/StatusBadge';
import { DepartmentFilterSelect } from '../../../components/dashboard/filters';
import { MONTH_LABEL_MAP } from '../../../constants/dashboard.constants';
import type { DepartmentRecentDocument } from '../../../types/dashboard/dashboard.types';
import type { DepartmentOption } from '../../../components/dashboard/filters';

interface DepartmentTabProps {
  enabled: boolean;
  /** Options Select phòng ban — từ departmentList query, caller cung cấp (ngoài Dashboard module) */
  departmentOptions: DepartmentOption[];
  departmentOptionsLoading?: boolean;
}

export function DepartmentTab({
  enabled,
  departmentOptions,
  departmentOptionsLoading = false,
}: DepartmentTabProps) {
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>();

  const { data, isLoading, isError, error, refetch } = useDepartmentDashboard(
    selectedDeptId,
    enabled,
  );

  // ── Columns table (không có cột Phòng ban — DASHBOARD_UI_SPEC.md §2.2) ────
  const columns = [
    { key: 'documentCode', title: 'Mã văn bản', dataIndex: 'documentCode' },
    { key: 'title', title: 'Tiêu đề', dataIndex: 'title' },
    {
      key: 'category',
      title: 'Loại',
      dataIndex: 'category',
      render: (value: string) => <StatusBadge type="category" value={value} />,
    },
    {
      key: 'workflowStatus',
      title: 'Trạng thái',
      dataIndex: 'workflowStatus',
      render: (value: string) => <StatusBadge type="workflowStatus" value={value} />,
    },
    { key: 'createdBy', title: 'Người tạo', dataIndex: ['createdBy', 'fullName'] },
  ];

  const proposalsByMonthData = (data?.proposalsByMonth ?? []).map((m) => ({
    monthLabel: MONTH_LABEL_MAP[m._id] ?? `Tháng ${m._id}`,
    count: m.count,
  }));
  const reportsByMonthData = (data?.reportsByMonth ?? []).map((m) => ({
    monthLabel: MONTH_LABEL_MAP[m._id] ?? `Tháng ${m._id}`,
    count: m.count,
  }));

  const metricItems = [
    {
      key: 'totalDocuments',
      label: 'Tổng văn bản',
      value: data?.totalDocuments ?? 0,
      icon: <FileTextOutlined />,
      colorToken: 'colorPrimary' as const,
    },
    {
      key: 'totalProposals',
      label: 'Tổng đề xuất',
      value: data?.totalProposals ?? 0,
      icon: <FormOutlined />,
      colorToken: 'colorInfo' as const,
    },
    {
      key: 'totalReports',
      label: 'Tổng biên bản',
      value: data?.totalReports ?? 0,
      icon: <FileDoneOutlined />,
      colorToken: 'colorSuccess' as const,
    },
    {
      key: 'totalUsers',
      label: 'Tổng người dùng',
      value: data?.totalUsers ?? 0,
      icon: <TeamOutlined />,
      colorToken: 'colorWarning' as const,
    },
  ];

  return (
    <div>
      {/* Row 1 — Select phòng ban (luôn hiển thị, không phụ thuộc query state) */}
      <div style={{ marginBottom: 16 }}>
        <DepartmentFilterSelect
          value={selectedDeptId}
          onChange={setSelectedDeptId}
          options={departmentOptions}
          loading={departmentOptionsLoading}
        />
      </div>

      {/* Chưa chọn phòng ban — DASHBOARD_UI_SPEC.md §10.3 */}
      {!selectedDeptId && (
        <MetricCardEmpty
          text="Chọn phòng ban để xem thống kê"
          icon={<ApartmentOutlined style={{ fontSize: 48 }} />}
          minHeight={240}
        />
      )}

      {/* Đã chọn nhưng lỗi (404/400/500) — chỉ vùng kết quả, Select vẫn hoạt động */}
      {selectedDeptId && isError && (
        <ErrorState
          message={
            (error as any)?.response?.status === 404
              ? 'Không tìm thấy phòng ban'
              : (error as any)?.response?.status === 400
                ? 'Phòng ban không hợp lệ'
                : 'Không thể tải dữ liệu phòng ban'
          }
          description={(error as any)?.response?.data?.message}
          onRetry={refetch}
        />
      )}

      {/* Đã chọn — hiển thị nội dung */}
      {selectedDeptId && !isError && (
        <>
          <MetricCardGrid items={metricItems} loading={isLoading} />

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col xs={24} md={12}>
              <div style={{ background: '#fff', borderRadius: 8, padding: 16, border: '1px solid #f0f0f0' }}>
                <h4 style={{ marginBottom: 12 }}>Đề xuất theo tháng</h4>
                <BarChartWidget
                  data={proposalsByMonthData}
                  loading={isLoading}
                  dataKeyX="monthLabel"
                  dataKeyY="count"
                  tooltipLabel="Số đề xuất"
                  emptyText="Chưa có dữ liệu trong năm nay"
                />
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div style={{ background: '#fff', borderRadius: 8, padding: 16, border: '1px solid #f0f0f0' }}>
                <h4 style={{ marginBottom: 12 }}>Biên bản theo tháng</h4>
                <BarChartWidget
                  data={reportsByMonthData}
                  loading={isLoading}
                  dataKeyX="monthLabel"
                  dataKeyY="count"
                  tooltipLabel="Số biên bản"
                  emptyText="Chưa có dữ liệu trong năm nay"
                  barColor="#52c41a"
                />
              </div>
            </Col>
          </Row>

          <div style={{ marginTop: 16 }}>
            <DataTable<DepartmentRecentDocument>
              dataSource={data?.recentDocuments ?? []}
              columns={columns as any}
              loading={isLoading}
              pagination={false}
              emptyText="Chưa có văn bản nào"
            />
          </div>
        </>
      )}
    </div>
  );
}
