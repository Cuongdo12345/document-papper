// src/components/data-display/DataTable/ActionCell.tsx
//
// Internal component — đã xác nhận tồn tại tại SHARED_COMPONENTS_LIBRARY.md
// dòng 576. Render danh sách TableAction<T> dưới dạng icon-button ngang hàng
// trong action column (sticky right).

import { Space, Tooltip } from 'antd';
import { AppButton } from '../../../components/common/AppButton';
import type { TableAction } from './DataTable.types';

interface ActionCellProps<T> {
  record: T;
  actions: TableAction<T>[];
}

export function ActionCell<T>({ record, actions }: ActionCellProps<T>) {
  const visibleActions = actions.filter((action) => {
    const hidden =
      typeof action.hidden === 'function' ? action.hidden(record) : action.hidden;
    return !hidden;
  });

  if (visibleActions.length === 0) return null;

  return (
    <Space size={4}>
      {visibleActions.map((action) => {
        const disabled =
          typeof action.disabled === 'function'
            ? action.disabled(record)
            : action.disabled;

        return (
          <Tooltip key={action.key} title={action.label}>
            <AppButton
              variant={action.danger ? 'danger' : 'ghost'}
              size="small"
              shape="circle"
              icon={action.icon}
              disabled={disabled}
              aria-label={action.label}
              onClick={() => action.onClick(record)}
            />
          </Tooltip>
        );
      })}
    </Space>
  );
}

export default ActionCell;
