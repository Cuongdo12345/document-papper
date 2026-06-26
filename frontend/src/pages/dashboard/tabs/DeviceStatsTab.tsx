// src/pages/dashboard/tabs/DeviceStatsTab.tsx
//
// Tab 7 — Thống kê thiết bị. month/year BẮT BUỘC (default = tháng/năm hiện tại).
// Filter auto-trigger khi đổi (không cần nút Áp dụng — DASHBOARD_UI_SPEC.md §12.4).
// Có Chart + Table với SERVER PAGINATION thật (khác Tab 1/2 — chỉ 5 dòng cố định).
//
// Source: DASHBOARD_UI_SPEC.md §2.7, §5.3, §10.2

import { useDeviceStats } from '../../../hooks/queries/useDashboard';
import { BarChartWidget } from '../../../components/data-display/BarChartWidget';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { DataTable } from '../../../components/data-display/DataTable';
import {
  DeviceStatsFilterPanel,
  useDeviceStatsFilter,
} from '../../../components/dashboard/filters';
import type { DeviceStatItem } from '../../../types/dashboard/dashboard.types';

interface DeviceStatsTabProps {
  enabled: boolean;
}

export function DeviceStatsTab({ enabled }: DeviceStatsTabProps) {
  // Hook tự resolve default month/year = hiện tại — DASHBOARD_UI_SPEC.md §5.3
  const { filter, setFilter, currentYear } = useDeviceStatsFilter();

  const { data, isLoading, isFetching, isError, error, refetch } = useDeviceStats(
    filter,
    enabled,
  );

  const columns = [
    { key: 'deviceName', title: 'Tên thiết bị', dataIndex: 'deviceName' },
    { key: 'totalQuantity', title: 'Số lượng', dataIndex: 'totalQuantity' },
  ];

  const emptyText = `Không có dữ liệu cho Tháng ${filter.month}/${filter.year}`;

  return (
    <div>
      {/* Filter bắt buộc — luôn hiển thị, auto-trigger khi đổi */}
      <DeviceStatsFilterPanel
        value={filter}
        onChange={setFilter}
        currentYear={currentYear}
        disabled={isLoading}
      />

      {isError ? (
        <ErrorState
          message="Không thể tải dữ liệu thống kê thiết bị"
          description={(error as any)?.response?.data?.message}
          onRetry={refetch}
        />
      ) : (
        <>
          {/* Chart */}
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 16,
              border: '1px solid #f0f0f0',
              marginBottom: 16,
            }}
          >
            <BarChartWidget
              data={data?.items ?? []}
              loading={isLoading}
              dataKeyX="deviceName"
              dataKeyY="totalQuantity"
              tooltipLabel="Số lượng"
              emptyText={emptyText}
            />
          </div>

          {/* Table — server pagination thật (khác Tab 1/2) */}
          <DataTable<DeviceStatItem>
            dataSource={data?.items ?? []}
            columns={columns as any}
            loading={isLoading || isFetching}
            pagination={data?.pagination}
            emptyText={emptyText}
            onTableChange={({ page, pageSize }) =>
              setFilter((prev) => ({ ...prev, page, limit: pageSize } as any))
            }
          />
        </>
      )}
    </div>
  );
}
