import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Variant
// Ánh xạ từ ngữ cảnh nghiệp vụ sang AntD type + danger
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Semantic variants dựa trên ngữ cảnh sử dụng trong toàn bộ hệ thống DMS:
 *
 * primary    → Hành động chính: Tạo mới, Lưu, Xác nhận          (#1677ff)
 * secondary  → Hành động phụ: Hủy, Quay lại, Xem chi tiết       (default/outlined)
 * danger     → Xóa mềm (soft delete), Vô hiệu hóa user          (danger)
 * critical   → Xóa cứng (hard delete), Bulk delete, Không hoàn tác (danger + filled)
 * success    → Duyệt (Approve workflow step)                     (success color)
 * warning    → Từ chối (Reject), Cảnh báo                        (warning color)
 * ghost      → Action inline nhẹ trong table row                 (ghost)
 * link       → Navigate, breadcrumb action                       (link type)
 */
export type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'critical'
  | 'success'
  | 'warning'
  | 'ghost'
  | 'link'

// ─────────────────────────────────────────────────────────────────────────────
// Size
// ─────────────────────────────────────────────────────────────────────────────

/**
 * large  → Toolbar actions: "+ Tạo mới", "Export Excel"          (height: 40px)
 * middle → Default — dùng trong form submit, modal footer        (height: 32px)
 * small  → Table row inline actions: Xem, Sửa, Xóa              (height: 24px)
 */
export type AppButtonSize = 'large' | 'middle' | 'small'

// ─────────────────────────────────────────────────────────────────────────────
// Main Props Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface AppButtonProps {
  // ── Content ──────────────────────────────────────────────────────────────
  /** Text hoặc ReactNode bên trong button */
  children?: ReactNode

  /** Icon hiển thị trước children (AntD icon hoặc ReactNode bất kỳ) */
  icon?: ReactNode

  /** Icon hiển thị sau children (dùng khi cần icon trailing, ví dụ DownOutlined) */
  iconAfter?: ReactNode

  // ── Variant & Size ────────────────────────────────────────────────────────
  /**
   * Semantic variant — xác định màu sắc và visual weight
   * @default 'secondary'
   */
  variant?: AppButtonVariant

  /**
   * Kích thước button
   * @default 'middle'
   */
  size?: AppButtonSize

  // ── State ─────────────────────────────────────────────────────────────────
  /**
   * Hiển thị loading spinner + disable tương tác.
   * Dùng với `isPending` từ useMutation hoặc form submit state.
   * @default false
   */
  loading?: boolean

  /**
   * Disable button — không cho click, visual grayed out.
   * Khác loading: không hiện spinner.
   * @default false
   */
  disabled?: boolean

  // ── Shape ─────────────────────────────────────────────────────────────────
  /**
   * Block button — full width, dùng cho form submit trong modal/auth page.
   * @default false
   */
  block?: boolean

  /**
   * Shape của button — circle dùng khi không có text (icon-only).
   * @default 'default'
   */
  shape?: 'default' | 'circle' | 'round'

  // ── HTML & Style ──────────────────────────────────────────────────────────
  /**
   * HTML button type — quan trọng trong AntD Form context.
   * 'submit' → trigger AntD Form validation khi click.
   * @default 'button'
   */
  htmlType?: ButtonHTMLAttributes<HTMLButtonElement>['type']

  /** CSS class names bổ sung */
  className?: string

  /** Inline styles — dùng hạn chế, ưu tiên className */
  style?: CSSProperties

  // ── Events ───────────────────────────────────────────────────────────────
  /**
   * Click handler.
   * Không fire khi disabled hoặc loading.
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void

  // ── Accessibility ─────────────────────────────────────────────────────────
  /** aria-label — bắt buộc khi button chỉ có icon (không có text children) */
  'aria-label'?: string

  /** title tooltip khi hover — hiện tự động khi collapsed sidebar hoặc icon-only */
  title?: string

  // ── Test ─────────────────────────────────────────────────────────────────
  /** data-testid cho testing */
  'data-testid'?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Variant → AntD Button Props Mapping (internal)
// ─────────────────────────────────────────────────────────────────────────────

export interface AntdButtonMapping {
  type: 'primary' | 'default' | 'dashed' | 'link' | 'text'
  danger: boolean
  className: string
}
