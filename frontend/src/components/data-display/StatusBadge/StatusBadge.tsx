/**
 * StatusBadge.tsx
 * CMP-11 — Layer 2 Primitive
 *
 * Centralized badge component cho toàn bộ hệ thống.
 * Dùng trong: mọi DataTable column, WorkflowTimeline, Detail views,
 *             Header ProfileDropdown, Performance table.
 *
 * Dependencies:
 *  - antd: Tag
 *  - ./StatusBadge.types
 *  - ./StatusBadge.mapping
 *
 * KHÔNG import từ: pages/, features/, hooks/queries/, api/
 */

import React from 'react';
import { Tag } from 'antd';
import { getStatusBadgeConfig } from './StatusBadge.mapping';
import type { StatusBadgeProps } from './StatusBadge.types';

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

/**
 * StatusBadge
 *
 * Hiển thị giá trị dạng colored tag với label tiếng Việt.
 * Màu và label được tra tự động từ mapping — không cần truyền thủ công.
 *
 * @example
 * // Workflow status
 * <StatusBadge type="workflowStatus" value="pending" />
 * // → Tag màu vàng "Chờ duyệt"
 *
 * // isActive (boolean)
 * <StatusBadge type="isActive" value={user.isActive} />
 * // → Tag xanh "Hoạt động" hoặc xám "Vô hiệu"
 *
 * // Override label
 * <StatusBadge type="subType" value="PROPOSE_REPAIR" label="Sửa chữa" />
 *
 * // Override màu
 * <StatusBadge type="role" value="USER" color="blue" />
 *
 * // Size nhỏ trong table
 * <StatusBadge type="httpMethod" value="DELETE" size="small" />
 *
 * // Text only — không có border/background
 * <StatusBadge type="category" value="PROPOSAL" textOnly />
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  value,
  label,
  color,
  size = 'default',
  textOnly = false,
  className,
  style,
}) => {
  // Tra màu và label từ mapping
  const { color: resolvedColor, label: resolvedLabel } = getStatusBadgeConfig({
    type,
    value,
    labelOverride: label,
    colorOverride: color,
  });

  // ── Text-only variant ──
  // Hiển thị chữ màu không có background — dùng inline trong text
  if (textOnly) {
    return (
      <span
        className={className}
        style={{
          color: resolvedColor === 'default' ? 'inherit' : undefined,
          fontWeight: 500,
          ...style,
        }}
      >
        {resolvedLabel}
      </span>
    );
  }

  // ── Small size styles ──
  // AntD Tag không có size prop → override qua style
  const smallStyle: React.CSSProperties =
    size === 'small'
      ? { fontSize: 11, padding: '0 5px', lineHeight: '18px' }
      : {};

  return (
    <Tag
      color={resolvedColor}
      className={className}
      style={{ ...smallStyle, ...style }}
      // Không truyền onClick — badge là display only, borrow interactivity từ row nếu cần
    >
      {resolvedLabel}
    </Tag>
  );
};

export default StatusBadge;
