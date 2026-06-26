/**
 * MetricCard family — Usage Examples
 *
 * Import: import { MetricCardGrid, MetricCardEmpty, MetricCardError } from '@/components/data-display/MetricCard'
 *
 * Phủ Tab 1 (5 cards) và Tab 2 (4 cards) theo DASHBOARD_UI_SPEC.md §2.1, §2.2
 * và BUILD_DASHBOARD_QUERY_HOOKS.md §3, §4.
 */

import {
  ApartmentOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  FormOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import {
  MetricCardEmpty,
  MetricCardError,
  MetricCardGrid,
} from './index'
import type { MetricCardItem } from './MetricCardGrid.types'

// ─── 1. Tab 1 — Tổng quan (5 MetricCard) ─────────────────────────────────────
// Data nguồn: useAdminSummary() — BUILD_DASHBOARD_QUERY_HOOKS.md §3

export function ExampleTab1Overview() {
  // const { data, isLoading, isError, error, refetch } = useAdminSummary(activeTab === 'tab1')
  const data = {
    totalDocuments: 142,
    totalProposals: 98,
    totalReports: 44,
    totalUsers: 25,
    totalDepartments: 8,
  }
  const isLoading = false
  const isError = false

  if (isError) {
    return (
      <MetricCardError
        message="Không thể tải dữ liệu tổng quan"
        // onRetry={refetch}
      />
    )
  }

  const items: MetricCardItem[] = [
    {
      key: 'totalDocuments',
      label: 'Tổng văn bản',
      value: data.totalDocuments,
      icon: <FileTextOutlined />,
      colorToken: 'colorPrimary',
    },
    {
      key: 'totalProposals',
      label: 'Tổng đề xuất',
      value: data.totalProposals,
      icon: <FormOutlined />,
      colorToken: 'colorInfo',
    },
    {
      key: 'totalReports',
      label: 'Tổng biên bản',
      value: data.totalReports,
      icon: <FileDoneOutlined />,
      colorToken: 'colorSuccess',
    },
    {
      key: 'totalUsers',
      label: 'Tổng người dùng',
      value: data.totalUsers,
      icon: <TeamOutlined />,
      colorToken: 'colorWarning',
    },
    {
      key: 'totalDepartments',
      label: 'Tổng phòng ban',
      value: data.totalDepartments,
      icon: <ApartmentOutlined />,
      colorToken: 'colorPurple',
    },
  ]

  return <MetricCardGrid items={items} loading={isLoading} />
}

// ─── 2. Tab 2 — Theo phòng ban (4 MetricCard, có Empty state) ────────────────
// Data nguồn: useDepartmentDashboard(deptId, enabled) — BUILD_DASHBOARD_QUERY_HOOKS.md §4

export function ExampleTab2ByDepartment() {
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>()

  // const { data, isLoading, isError, error } = useDepartmentDashboard(selectedDeptId, activeTab === 'tab2')

  // Chưa chọn phòng ban → Empty state riêng (DASHBOARD_UI_SPEC.md §10.3)
  if (!selectedDeptId) {
    return (
      <MetricCardEmpty
        text="Chọn phòng ban để xem thống kê"
        icon={<ApartmentOutlined />}
        minHeight={240}
      />
    )
  }

  const data = {
    totalDocuments: 32,
    totalProposals: 20,
    totalReports: 12,
    totalUsers: 6,
  }
  const isLoading = false
  const isError = false

  if (isError) {
    return (
      <MetricCardError
        message="Không tìm thấy phòng ban"
        description="Phòng ban này có thể đã bị xóa hoặc không tồn tại."
        // onRetry={refetch}
      />
    )
  }

  const items: MetricCardItem[] = [
    {
      key: 'totalDocuments',
      label: 'Tổng văn bản',
      value: data.totalDocuments,
      icon: <FileTextOutlined />,
      colorToken: 'colorPrimary',
    },
    {
      key: 'totalProposals',
      label: 'Tổng đề xuất',
      value: data.totalProposals,
      icon: <FormOutlined />,
      colorToken: 'colorInfo',
    },
    {
      key: 'totalReports',
      label: 'Tổng biên bản',
      value: data.totalReports,
      icon: <FileDoneOutlined />,
      colorToken: 'colorSuccess',
    },
    {
      key: 'totalUsers',
      label: 'Tổng người dùng',
      value: data.totalUsers,
      icon: <TeamOutlined />,
      colorToken: 'colorWarning',
    },
  ]

  // Tab 2 chỉ 4 cards — columnsLg/Xl tự resolve = 4 (full 1 dòng), columnsMd tự resolve = 2
  return <MetricCardGrid items={items} loading={isLoading} />
}

// ─── 3. Conversion rate — value có formatter (%) ─────────────────────────────
// Ví dụ minh họa formatter prop, không thuộc Tab 1/2 cụ thể nhưng tái dùng được

export function ExampleWithFormatter() {
  const items: MetricCardItem[] = [
    {
      key: 'conversionRate',
      label: 'Tỷ lệ chuyển đổi trung bình',
      value: 62.5,
      icon: <FormOutlined />,
      colorToken: 'colorSuccess',
      formatter: (v) => `${v}%`,
    },
  ]

  return <MetricCardGrid items={items} columnsLg={1} columnsXl={1} />
}

// ─── 4. Loading state riêng lẻ (không qua Grid) ──────────────────────────────

export function ExampleSingleLoading() {
  return (
    <MetricCardGrid
      items={[
        { key: 'a', label: 'Tổng văn bản', value: 0, icon: <FileTextOutlined /> },
        { key: 'b', label: 'Tổng đề xuất', value: 0, icon: <FormOutlined /> },
      ]}
      loading={true}
    />
  )
}
