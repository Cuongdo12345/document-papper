// src/pages/dashboard/tabs/OverviewTab.tsx
//
// Tab 1 — Tổng quan. Toàn bộ widget (5 MetricCard + 3 Chart + 1 Table) đều phụ thuộc
// 1 query duy nhất: useAdminSummary. Nếu lỗi → 1 ErrorState lớn duy nhất thay toàn bộ
// nội dung tab (DASHBOARD_UI_SPEC.md §9.5) — không lặp lại error 5 lần.
//
// Source: DASHBOARD_UI_SPEC.md §2.1, §3.4, §9.5, §10.2

import { Row, Col } from 'antd';
import {
  FileTextOutlined,
  FormOutlined,
  FileDoneOutlined,
  TeamOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { useAdminSummary } from '../../../hooks/queries/useDashboard';
import { MetricCardGrid } from '../../../components/data-display/MetricCard';
import { BarChartWidget } from '../../../components/data-display/BarChartWidget';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { DataTable } from '../../../components/data-display/DataTable';
import StatusBadge from '../../../components/data-display/StatusBadge';
import { MONTH_LABEL_MAP } from '../../../constants/dashboard.constants';
import type { RecentDocument } from '../../../types/dashboard/dashboard.types';

interface OverviewTabProps {
  /** true khi Tab 1 đang active — lazy fetch */
  enabled: boolean;
}

export function OverviewTab({ enabled }: OverviewTabProps) {
  const { data, isLoading, isError, error, refetch } = useAdminSummary(enabled);

  // ── Error — toàn bộ Tab 1 (DASHBOARD_UI_SPEC.md §9.5) ─────────────────────
  if (isError) {
    const backendMsg = (error as any)?.response?.data?.message;
    return (
      <ErrorState
        message="Không thể tải dữ liệu tổng quan"
        description={backendMsg}
        onRetry={refetch}
      />
    );
  }

  // ── KPI items — DASHBOARD_KPI_COMPONENTS.md §10 Tab 1 ─────────────────────
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
    {
      key: 'totalDepartments',
      label: 'Tổng phòng ban',
      value: data?.totalDepartments ?? 0,
      icon: <ApartmentOutlined />,
      colorToken: 'colorPurple' as const,
    },
  ];

  // ── Map MonthCount[] → chart data có label tháng (DASHBOARD_ANALYSIS.md §21) ──
  const proposalsByMonthData = (data?.proposalsByMonth ?? []).map((m) => ({
    monthLabel: MONTH_LABEL_MAP[m._id] ?? `Tháng ${m._id}`,
    count: m.count,
  }));
  const reportsByMonthData = (data?.reportsByMonth ?? []).map((m) => ({
    monthLabel: MONTH_LABEL_MAP[m._id] ?? `Tháng ${m._id}`,
    count: m.count,
  }));

  // ── Table columns — recentDocuments (DASHBOARD_UI_SPEC.md §11.1) ──────────
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
    { key: 'department', title: 'Phòng ban', dataIndex: ['department', 'name'] },
    { key: 'createdBy', title: 'Người tạo', dataIndex: ['createdBy', 'fullName'] },
  ];

  return (
    <div>
      {/* Row 1 — 5 MetricCard */}
      <MetricCardGrid items={metricItems} loading={isLoading} />

      {/* Row 2 — 2 Chart side-by-side */}
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

      {/* Row 3 — Chart phòng ban full-width (horizontal bar) */}
      <div
        style={{
          marginTop: 16,
          background: '#fff',
          borderRadius: 8,
          padding: 16,
          border: '1px solid #f0f0f0',
        }}
      >
        <h4 style={{ marginBottom: 12 }}>Văn bản theo phòng ban</h4>
        <BarChartWidget
          data={data?.documentsByDepartment ?? []}
          loading={isLoading}
          dataKeyX="departmentName"
          dataKeyY="count"
          layout="horizontal"
          tooltipLabel="Số văn bản"
          emptyText="Chưa có dữ liệu theo phòng ban"
        />
      </div>

      {/* Row 4 — Table recentDocuments (5 dòng cố định, không pagination) */}
      <div style={{ marginTop: 16 }}>
        <DataTable<RecentDocument>
          dataSource={data?.recentDocuments ?? []}
          columns={columns as any}
          loading={isLoading}
          pagination={false}
          emptyText="Chưa có văn bản nào"
        />
      </div>
    </div>
  );
}
