// src/components/data-display/DataTable/TableEmptyState.tsx
//
// Internal component — đã xác nhận tồn tại tại SHARED_COMPONENTS_LIBRARY.md
// dòng 576: "DataTable | ActionCell (internal), TableEmptyState (internal)".
// KHÔNG export ra ngoài module DataTable — chỉ dùng nội bộ bởi DataTable.tsx.

import { Empty } from 'antd';
import type { ReactNode } from 'react';

interface TableEmptyStateProps {
  /** Default: 'Không có dữ liệu' — SHARED_COMPONENTS_LIBRARY.md §4 */
  text?: string;
  description?: string;
  action?: ReactNode;
}

export function TableEmptyState({
  text = 'Không có dữ liệu',
  description,
  action,
}: TableEmptyStateProps) {
  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <>
          <div>{text}</div>
          {description && (
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>
              {description}
            </div>
          )}
        </>
      }
      style={{ padding: '32px 0' }}
    >
      {action}
    </Empty>
  );
}

export default TableEmptyState;
