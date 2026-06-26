/**
 * StatusBadge.types.ts
 *
 * Types dành riêng cho StatusBadge component.
 * Các domain types (WorkflowStatus, DocumentSubType...) được import
 * từ types/ toàn cục — không re-define ở đây.
 */

import type { CSSProperties } from 'react';

// ─────────────────────────────────────────────
// Badge variant types — mapping với badgeColors.ts
// ─────────────────────────────────────────────

/**
 * Các loại badge được hệ thống hỗ trợ.
 * Mỗi type tương ứng với một BADGE_COLOR_MAPS key trong badgeColors.ts.
 */
export type BadgeType =
  | 'workflowStatus' // pending | approved | rejected
  | 'isActive'       // true | false (boolean as string)
  | 'subType'        // PROPOSE_REPAIR | PROPOSE_INK | ... | CHECK_DAMAGE | CONFIRM_STATUS
  | 'role'           // ADMIN | IT | USER
  | 'httpMethod'     // GET | POST | PUT | PATCH | DELETE
  | 'category';      // PROPOSAL | REPORT

// ─────────────────────────────────────────────
// Raw AntD tag color type
// ─────────────────────────────────────────────

/**
 * Các giá trị màu được AntD Tag component hỗ trợ.
 * Bao gồm preset colors và custom hex/css.
 *
 * Ref: https://ant.design/components/tag#color
 */
export type AntdTagColor =
  | 'default'
  | 'success'
  | 'processing'
  | 'error'
  | 'warning'
  | 'magenta'
  | 'red'
  | 'volcano'
  | 'orange'
  | 'gold'
  | 'lime'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'geekblue'
  | 'purple'
  | string; // custom hex

// ─────────────────────────────────────────────
// Component Props
// ─────────────────────────────────────────────

export interface StatusBadgeProps {
  /**
   * Loại badge — xác định color map và label map sẽ dùng.
   * Khi truyền `type`, component tự tra màu và label từ constants.
   */
  type: BadgeType;

  /**
   * Giá trị cần hiển thị.
   *
   * - Với `isActive`: truyền boolean hoặc string "true"/"false"
   * - Với các type khác: truyền đúng enum string
   *   (e.g. "pending", "PROPOSE_REPAIR", "ADMIN", "GET")
   */
  value: string | boolean;

  /**
   * Override label hiển thị.
   * Nếu không truyền, component tự lấy từ BADGE_LABELS[type][value].
   * Nếu không có trong map → fallback hiển thị value gốc.
   */
  label?: string;

  /**
   * Override màu AntD Tag.
   * Nếu không truyền, component tự lấy từ BADGE_COLOR_MAPS[type][value].
   * Nếu không có trong map → fallback 'default'.
   */
  color?: AntdTagColor;

  /**
   * Kích thước badge.
   * - 'small': font-size 11px, padding nhỏ hơn — dùng trong table cell chật
   * - 'default': AntD Tag default size — dùng trong card, detail view
   */
  size?: 'small' | 'default';

  /**
   * Hiển thị dạng chữ thuần (không có border/background của Tag).
   * Dùng khi cần badge inline trong text.
   */
  textOnly?: boolean;

  /**
   * Cho phép gán className để override style từ ngoài.
   */
  className?: string;

  /**
   * Inline style override — dùng tiết kiệm, ưu tiên className.
   */
  style?: CSSProperties;
}

// ─────────────────────────────────────────────
// Helper return type cho getStatusBadgeConfig
// ─────────────────────────────────────────────

export interface StatusBadgeConfig {
  color: AntdTagColor;
  label: string;
}
