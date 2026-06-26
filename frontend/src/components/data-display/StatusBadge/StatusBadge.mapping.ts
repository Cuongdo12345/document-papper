/**
 * StatusBadge.mapping.ts
 *
 * Centralized color + label mapping cho StatusBadge.
 * Nguồn dữ liệu: constants/badgeColors.ts (SHARED_COMPONENTS_IMPLEMENTATION.md § 7.4)
 *
 * Quy tắc:
 *  - Không hardcode màu trong JSX — tất cả màu đọc từ đây
 *  - Mọi thay đổi color/label chỉ cần sửa file này
 *  - Key phải khớp với value thực tế từ backend API
 */

import type { AntdTagColor, BadgeType, StatusBadgeConfig } from './StatusBadge.types';

// ─────────────────────────────────────────────
// COLOR MAPS
// Nguồn: BADGE_COLOR_MAPS trong badgeColors.ts
// ─────────────────────────────────────────────

/**
 * Workflow status colors
 * Từ: Document.workflowStatus, WorkflowInstance.status, WorkflowStep.status
 */
export const WORKFLOW_STATUS_COLORS: Record<string, AntdTagColor> = {
  pending:  'warning',   // AntD gold — đang chờ
  approved: 'success',   // AntD green — đã duyệt
  rejected: 'error',     // AntD red — từ chối
};

/**
 * isActive colors
 * Từ: User.isActive, Document.isActive
 * Lưu ý: value truyền vào có thể là boolean, cần .toString() trước khi lookup
 */
export const IS_ACTIVE_COLORS: Record<string, AntdTagColor> = {
  true:  'success',  // Hoạt động — xanh
  false: 'default',  // Vô hiệu — xám
};

/**
 * Document subType colors
 * Từ: Document.subType
 */
export const SUB_TYPE_COLORS: Record<string, AntdTagColor> = {
  PROPOSE_REPAIR:      'orange',  // Đề xuất sửa chữa
  PROPOSE_INK:         'cyan',    // Đề xuất mực in
  PROPOSE_PROCUREMENT: 'green',   // Đề xuất mua sắm
  CHECK_DAMAGE:        'orange',  // Biên bản kiểm tra hư hỏng
  CONFIRM_STATUS:      'cyan',    // Biên bản xác nhận mực
};

/**
 * User role colors
 * Từ: User.role.name, AuthUser.role.name
 */
export const ROLE_COLORS: Record<string, AntdTagColor> = {
  ADMIN: 'purple',   // Quản trị viên
  IT:    'blue',     // Nhân viên IT
  USER:  'default',  // Người dùng thường — xám
};

/**
 * HTTP method colors
 * Từ: Performance dashboard — endpoint method
 */
export const HTTP_METHOD_COLORS: Record<string, AntdTagColor> = {
  GET:    'green',
  POST:   'blue',
  PUT:    'gold',
  PATCH:  'purple',
  DELETE: 'red',
};

/**
 * Document category colors
 * Từ: Document.category
 */
export const CATEGORY_COLORS: Record<string, AntdTagColor> = {
  PROPOSAL: 'blue',    // Đề xuất
  REPORT:   'purple',  // Biên bản
};

// ─────────────────────────────────────────────
// LABEL MAPS
// Nguồn: BADGE_LABELS trong badgeColors.ts
// Ngôn ngữ: Tiếng Việt
// ─────────────────────────────────────────────

export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  pending:  'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};

export const IS_ACTIVE_LABELS: Record<string, string> = {
  true:  'Hoạt động',
  false: 'Vô hiệu',
};

export const SUB_TYPE_LABELS: Record<string, string> = {
  PROPOSE_REPAIR:      'Đề xuất sửa chữa',
  PROPOSE_INK:         'Đề xuất mực in',
  PROPOSE_PROCUREMENT: 'Đề xuất mua sắm',
  CHECK_DAMAGE:        'Biên bản kiểm tra',
  CONFIRM_STATUS:      'Biên bản xác nhận',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'ADMIN',
  IT:    'IT',
  USER:  'USER',
};

export const HTTP_METHOD_LABELS: Record<string, string> = {
  GET:    'GET',
  POST:   'POST',
  PUT:    'PUT',
  PATCH:  'PATCH',
  DELETE: 'DELETE',
};

export const CATEGORY_LABELS: Record<string, string> = {
  PROPOSAL: 'Đề xuất',
  REPORT:   'Biên bản',
};

// ─────────────────────────────────────────────
// COMBINED MAPS
// Type-keyed lookups — dùng trong component
// ─────────────────────────────────────────────

export const BADGE_COLOR_MAPS: Record<BadgeType, Record<string, AntdTagColor>> = {
  workflowStatus: WORKFLOW_STATUS_COLORS,
  isActive:       IS_ACTIVE_COLORS,
  subType:        SUB_TYPE_COLORS,
  role:           ROLE_COLORS,
  httpMethod:     HTTP_METHOD_COLORS,
  category:       CATEGORY_COLORS,
};

export const BADGE_LABEL_MAPS: Record<BadgeType, Record<string, string>> = {
  workflowStatus: WORKFLOW_STATUS_LABELS,
  isActive:       IS_ACTIVE_LABELS,
  subType:        SUB_TYPE_LABELS,
  role:           ROLE_LABELS,
  httpMethod:     HTTP_METHOD_LABELS,
  category:       CATEGORY_LABELS,
};

// ─────────────────────────────────────────────
// FALLBACKS
// ─────────────────────────────────────────────

/** Màu fallback khi value không có trong map */
export const FALLBACK_COLOR: AntdTagColor = 'default';

// ─────────────────────────────────────────────
// HELPER FUNCTION
// ─────────────────────────────────────────────

/**
 * Trả về { color, label } cho một badge.
 *
 * Xử lý:
 *  - boolean value → convert sang "true"/"false" string
 *  - value không có trong map → fallback color + fallback label (value gốc)
 *  - prop overrides (color, label) có priority cao nhất
 *
 * @example
 * getStatusBadgeConfig({ type: 'workflowStatus', value: 'pending' })
 * // → { color: 'warning', label: 'Chờ duyệt' }
 *
 * getStatusBadgeConfig({ type: 'isActive', value: true })
 * // → { color: 'success', label: 'Hoạt động' }
 *
 * getStatusBadgeConfig({ type: 'role', value: 'ADMIN', label: 'Quản trị' })
 * // → { color: 'purple', label: 'Quản trị' }   ← label override
 */
export function getStatusBadgeConfig(params: {
  type: BadgeType;
  value: string | boolean;
  labelOverride?: string;
  colorOverride?: AntdTagColor;
}): StatusBadgeConfig {
  const { type, value, labelOverride, colorOverride } = params;

  // Normalize boolean → string key
  const key = typeof value === 'boolean' ? String(value) : value;

  // Resolve color
  const resolvedColor: AntdTagColor =
    colorOverride ?? BADGE_COLOR_MAPS[type]?.[key] ?? FALLBACK_COLOR;

  // Resolve label
  const resolvedLabel: string =
    labelOverride ?? BADGE_LABEL_MAPS[type]?.[key] ?? key;

  return {
    color: resolvedColor,
    label: resolvedLabel,
  };
}
