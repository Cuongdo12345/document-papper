// src/components/data-display/DataTable/DataTable.types.ts
//
// Types cho DataTable<T> (CMP-04).
// Nguồn: SHARED_COMPONENTS_LIBRARY.md §3 (Component Inventory), §4 (Props
// Interface Summary, dòng 276-304), §6 (Shared Types, dòng 428-460).
//
// LƯU Ý: SHARED_COMPONENTS_LIBRARY.md chỉ liệt kê TÊN type `DataTableColumn<T>`
// (dòng 281) mà không có định nghĩa field chi tiết — khác với `TableAction<T>`,
// `PageInfo`, `TableChangePayload` đã có đủ field. Định nghĩa `DataTableColumn<T>`
// dưới đây được suy ra hợp lý từ:
//   (a) AntD ColumnType<T> (base mà mọi AntD Table column cần),
//   (b) cách dùng thực tế trong ví dụ "List Page Anatomy" (SHARED_COMPONENTS_LIBRARY.md
//       dòng 832-846): "columns={proposalColumns} // render với StatusBadge, date format",
//   (c) cách dùng thực tế trong Dashboard module (BUILD_DASHBOARD_PAGE.md §2, §10).
// Nếu dự án đã có quy ước khác cho field này, cần điều chỉnh lại type này cho khớp.

import type { ReactNode } from 'react';

/** SHARED_COMPONENTS_LIBRARY.md §6 */
export type SortOrder = 'asc' | 'desc';

/** SHARED_COMPONENTS_LIBRARY.md §6 — map từ API res.pagination */
export interface PageInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** SHARED_COMPONENTS_LIBRARY.md §6 — payload của onTableChange */
export interface TableChangePayload {
  page: number;
  pageSize: number;
  sortBy?: string;
  order?: SortOrder;
}

/** SHARED_COMPONENTS_LIBRARY.md §4 dòng 304 */
export interface TableAction<T> {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: (record: T) => void;
  danger?: boolean;
  disabled?: boolean | ((record: T) => boolean);
  hidden?: boolean | ((record: T) => boolean);
}

/**
 * Định nghĩa 1 cột của DataTable.
 * Suy ra từ AntD ColumnType<T> + quy ước dự án (render với StatusBadge,
 * date format... theo ví dụ thực tế đã xác nhận).
 */
export interface DataTableColumn<T> {
  /** Header hiển thị */
  title: ReactNode;
  /** Field key trong record — bỏ qua nếu dùng render thuần với access qua record đầy đủ */
  dataIndex?: keyof T | string;
  /** Unique key cho cột — bắt buộc nếu dataIndex không unique hoặc dùng render-only */
  key: string;
  /** Custom render — value là field tại dataIndex (nếu có), record là toàn bộ dòng */
  render?: (value: unknown, record: T, index: number) => ReactNode;
  /** Căn lề nội dung cột */
  align?: 'left' | 'center' | 'right';
  /** Độ rộng cố định (px) hoặc responsive (%) */
  width?: number | string;
  /** true → cho phép sort qua onTableChange (field sort lấy từ `dataIndex` hoặc `key`) */
  sorter?: boolean;
  /** true → cắt ngắn nội dung dài kèm tooltip hover */
  ellipsis?: boolean;
  /** Ẩn cột trên màn hình nhỏ hơn breakpoint chỉ định (vd: 'md' = ẩn dưới 768px) */
  responsive?: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'>;
  /** Cố định cột trái/phải khi scroll ngang */
  fixed?: 'left' | 'right';
}

/** Cấu hình checkbox selection */
export interface RowSelectionConfig<T> {
  selectedRowKeys: React.Key[];
  onChange: (selectedKeys: React.Key[], selectedRows: T[]) => void;
  getCheckboxProps?: (record: T) => { disabled?: boolean };
}

/** Cấu hình search input inline (nếu không dùng FilterBar) */
export interface DataTableSearchConfig {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface DataTableProps<T extends object> {
  dataSource: T[];
  columns: DataTableColumn<T>[];
  /** Default: '_id' */
  rowKey?: keyof T | ((record: T) => string);
  /** Action column items — sticky right */
  actions?: TableAction<T>[];
  /** Override actions column width */
  actionsWidth?: number;
  /** Default: 'Thao tác' */
  actionsTitle?: string;
  /** Server pagination config — false để ẩn hoàn toàn (vd: recentDocuments cố định 5 dòng) */
  pagination?: PageInfo | false;
  /** Unified sort+page handler — bắt buộc nếu pagination !== false hoặc có sorter=true */
  onTableChange?: (change: TableChangePayload) => void;
  /** Controlled sort state — đồng bộ icon mũi tên trên header */
  currentSort?: { field: string; order: SortOrder };
  /** Inline search bar — KHÔNG dùng song song với FilterBar trên cùng page */
  search?: DataTableSearchConfig;
  rowSelection?: RowSelectionConfig<T>;
  /** Default: false */
  loading?: boolean;
  /** Default: 'Không có dữ liệu' */
  emptyText?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /** Default: { x: 'max-content' } */
  scroll?: { x?: number | string | true; y?: number | string };
  /** Default: 'middle' */
  size?: 'small' | 'middle' | 'large';
  /** Default: false */
  striped?: boolean;
  /** Default: true */
  stickyHeader?: boolean;
}
