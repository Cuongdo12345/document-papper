/**
 * components/common/StatusBadge/index.ts
 *
 * Barrel export cho StatusBadge module.
 *
 * Import pattern cho consumers:
 *   import StatusBadge from '@/components/common/StatusBadge'
 *   import type { StatusBadgeProps, BadgeType } from '@/components/common/StatusBadge'
 *   import { getStatusBadgeConfig, BADGE_COLOR_MAPS } from '@/components/common/StatusBadge'
 */

// ── Component (default export) ──
export { default } from './StatusBadge';

// ── Types ──
export type {
  BadgeType,
  AntdTagColor,
  StatusBadgeProps,
  StatusBadgeConfig,
} from './StatusBadge.types';

// ── Mapping utilities ──
// Export để DataTable columns, WorkflowTimeline, PerformancePage
// có thể tra màu mà không cần mount component
export {
  // Color maps
  WORKFLOW_STATUS_COLORS,
  IS_ACTIVE_COLORS,
  SUB_TYPE_COLORS,
  ROLE_COLORS,
  HTTP_METHOD_COLORS,
  CATEGORY_COLORS,

  // Label maps
  WORKFLOW_STATUS_LABELS,
  IS_ACTIVE_LABELS,
  SUB_TYPE_LABELS,
  ROLE_LABELS,
  HTTP_METHOD_LABELS,
  CATEGORY_LABELS,

  // Combined maps
  BADGE_COLOR_MAPS,
  BADGE_LABEL_MAPS,

  // Fallback
  FALLBACK_COLOR,

  // Helper function
  getStatusBadgeConfig,
} from './StatusBadge.mapping';
