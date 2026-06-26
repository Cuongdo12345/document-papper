// src/components/data-display/DataTable/DataTable.tsx
//
// CMP-04 — Generic AntD Table wrapper với server-side pagination, sorting,
// row selection, action column sticky, loading skeleton, empty state.
//
// Nguồn: SHARED_COMPONENTS_LIBRARY.md §3, §4 (dòng 145-151, 276-304), §6,
// ví dụ usage "List Page Anatomy" (dòng 800-847).
//
// KHÔNG dùng AntD `Table` trực tiếp trong page — luôn qua DataTable<T>.
// KHÔNG tự build pagination — luôn qua prop `pagination` + `onTableChange`.

import { Table, Skeleton, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import clsx from 'clsx';
import { ActionCell } from './ActionCell';
import { TableEmptyState } from './TableEmptyState';
import {
  buildPaginationConfig,
  buildTableChangePayload,
  sortOrderToAntd,
} from './DataTable.helpers';
import type { DataTableProps } from './DataTable.types';
import styles from './DataTable.module.css';

export function DataTable<T extends object>({
  dataSource,
  columns,
  rowKey = '_id' as keyof T,
  actions,
  actionsWidth,
  actionsTitle = 'Thao tác',
  pagination,
  onTableChange,
  currentSort,
  search,
  rowSelection,
  loading = false,
  emptyText = 'Không có dữ liệu',
  emptyDescription,
  emptyAction,
  scroll = { x: 'max-content' },
  size = 'middle',
  striped = false,
  stickyHeader = true,
}: DataTableProps<T>) {
  // ── Resolve rowKey thành function — AntD Table cần dạng (record) => key ──────
  // const resolvedRowKey =
  //   typeof rowKey === 'function' ? rowKey : (record: T) => String(record[rowKey]);

  const resolvedRowKey =
  typeof rowKey === 'function'
    ? rowKey
    : (record: T) => String((record as Record<string, unknown>)[rowKey as string]);

  // ── Map DataTableColumn<T>[] → AntD ColumnsType<T> ───────────────────────────
  const antdColumns: ColumnsType<T> = columns.map((col) => ({
    title: col.title,
    dataIndex: col.dataIndex as string | undefined,
    key: col.key,
    align: col.align,
    width: col.width,
    ellipsis: col.ellipsis,
    responsive: col.responsive,
    fixed: col.fixed,
    sorter: col.sorter ? true : undefined,
    sortOrder:
      col.sorter && currentSort?.field === (col.dataIndex ?? col.key)
        ? sortOrderToAntd(currentSort.order)
        : undefined,
    render: col.render
      ? (value: unknown, record: T, index: number) => col.render?.(value, record, index)
      : undefined,
  }));

  // ── Action column — sticky right, chỉ thêm nếu có actions ───────────────────
  if (actions && actions.length > 0) {
    antdColumns.push({
      title: actionsTitle,
      key: '__actions__',
      fixed: 'right',
      width: actionsWidth ?? Math.max(80, actions.length * 40),
      align: 'center',
      className: styles.actionColumn,
      render: (_, record: T) => <ActionCell record={record} actions={actions} />,
    });
  }

  // ── Search inline (KHÔNG dùng song song với FilterBar trên cùng page) ───────
  // Lưu ý: search chỉ render input — caller tự quản lý debounce nếu cần, vì
  // SHARED_COMPONENTS_LIBRARY.md §4 không xác nhận DataTable tự debounce search
  // (khác FilterBar field 'search' đã có debounce built-in).
  const searchInput = search ? (
    <Input
      prefix={<SearchOutlined />}
      placeholder={search.placeholder ?? 'Tìm kiếm...'}
      value={search.value}
      onChange={(e) => search.onChange(e.target.value)}
      style={{ maxWidth: 320, marginBottom: 16 }}
      allowClear
    />
  ) : null;

  // ── Handle table change (sort + page unified) ────────────────────────────────
  const handleChange: NonNullable<
    React.ComponentProps<typeof Table<T>>['onChange']
  > = (paginationConfig, _filters, sorter) => {
    if (!onTableChange) return;
    onTableChange(buildTableChangePayload(paginationConfig, sorter as never));
  };

  const paginationConfig = buildPaginationConfig(pagination, (page, pageSize) => {
    if (!onTableChange) return;
    onTableChange({
      page,
      pageSize,
      sortBy: currentSort?.field,
      order: currentSort?.order,
    });
  });

  // ── Loading skeleton — thay toàn bộ table bằng skeleton rows khi lần đầu load ─
  if (loading && dataSource.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        {searchInput}
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  }

  return (
    <>
      {searchInput}
      <Table<T>
        className={clsx({
          [styles.striped]: striped,
          [styles.stickyHeader]: stickyHeader,
        })}
        dataSource={dataSource}
        columns={antdColumns}
        rowKey={resolvedRowKey}
        loading={loading}
        pagination={paginationConfig}
        onChange={handleChange}
        rowSelection={
          rowSelection
            ? {
                selectedRowKeys: rowSelection.selectedRowKeys,
                onChange: rowSelection.onChange,
                getCheckboxProps: rowSelection.getCheckboxProps,
              }
            : undefined
        }
        scroll={scroll}
        size={size}
        sticky={stickyHeader}
        locale={{
          emptyText: (
            <TableEmptyState
              text={emptyText}
              description={emptyDescription}
              action={emptyAction}
            />
          ),
        }}
      />
    </>
  );
}

export default DataTable;
