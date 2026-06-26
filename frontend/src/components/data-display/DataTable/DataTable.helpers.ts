// src/components/data-display/DataTable/DataTable.helpers.ts
//
// Helper functions cho DataTable.
// Folder structure xác nhận file này tồn tại với mục đích:
//   "sortConverter, buildPaginationConfig..." (SHARED_COMPONENTS_LIBRARY.md dòng 70)

import type { SorterResult } from 'antd/es/table/interface';
import type { TablePaginationConfig } from 'antd';
import type { PageInfo, SortOrder, TableChangePayload } from './DataTable.types';

/**
 * Chuyển AntD sorter (ascend/descend) sang SortOrder ('asc'/'desc') dùng nội bộ dự án.
 * AntD trả 'ascend' | 'descend' | null — cần map sang convention 'asc'/'desc'.
 */
export const sortConverter = (
  sorter: SorterResult<unknown> | SorterResult<unknown>[],
): { sortBy?: string; order?: SortOrder } => {
  // AntD Table chỉ hỗ trợ single-column sort trong phần lớn trường hợp dự án dùng
  const single = Array.isArray(sorter) ? sorter[0] : sorter;

  if (!single || !single.order) {
    return { sortBy: undefined, order: undefined };
  }

  const order: SortOrder = single.order === 'ascend' ? 'asc' : 'desc';
  const sortBy =
    typeof single.field === 'string'
      ? single.field
      : Array.isArray(single.field)
        ? single.field.join('.')
        : (single.columnKey as string | undefined);

  return { sortBy, order };
};

/**
 * Convert order ('asc'/'desc') ngược lại sang AntD sortOrder ('ascend'/'descend')
 * — dùng cho prop `currentSort` để hiển thị đúng mũi tên sort trên header.
 */
export const sortOrderToAntd = (order?: SortOrder): 'ascend' | 'descend' | undefined => {
  if (order === 'asc') return 'ascend';
  if (order === 'desc') return 'descend';
  return undefined;
};

/**
 * Build AntD TablePaginationConfig từ PageInfo (server-side) đã xác nhận trong
 * SHARED_COMPONENTS_LIBRARY.md §6: "map từ API res.pagination".
 *
 * @param pageInfo - PageInfo từ response API, hoặc `false` để ẩn hoàn toàn pagination
 *                   (vd: Dashboard Tab 1/2 — recentDocuments cố định 5 dòng)
 * @param onChange - gọi khi user đổi trang/pageSize qua AntD Table built-in control
 */
export const buildPaginationConfig = (
  pageInfo: PageInfo | false | undefined,
  onChange?: (page: number, pageSize: number) => void,
): TablePaginationConfig | false => {
  if (pageInfo === false || pageInfo === undefined) return false;

  return {
    current: pageInfo.page,
    pageSize: pageInfo.limit,
    total: pageInfo.total,
    showSizeChanger: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
    onChange,
  };
};

/**
 * Build TableChangePayload thống nhất từ AntD Table onChange callback —
 * dùng để gọi onTableChange (1 handler duy nhất cho cả sort + page, theo
 * SHARED_COMPONENTS_LIBRARY.md §4: "Unified sort+page handler").
 */
export const buildTableChangePayload = (
  pagination: TablePaginationConfig,
  sorter: SorterResult<unknown> | SorterResult<unknown>[],
): TableChangePayload => {
  const { sortBy, order } = sortConverter(sorter);

  return {
    page: pagination.current ?? 1,
    pageSize: pagination.pageSize ?? 20,
    sortBy,
    order,
  };
};
