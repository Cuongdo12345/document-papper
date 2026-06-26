import { Button } from 'antd'
import clsx from 'clsx'
import type { AppButtonProps } from './AppButton.types'
import { VARIANT_MAP, LOADING_TEXT_MAP } from './AppButton.config'
import styles from './AppButton.module.css'

/**
 * AppButton — Shared button component cho toàn bộ DMS
 *
 * Wrapper trên AntD Button với:
 * - Semantic variants thay vì raw AntD type/danger props
 * - Loading text tự động theo variant
 * - Strict disabled khi loading (không fire onClick)
 * - aria-label enforcement khi icon-only
 * - data-testid passthrough cho testing
 *
 * @example
 * // Primary — form submit
 * <AppButton variant="primary" htmlType="submit" loading={isPending}>
 *   Tạo đề xuất
 * </AppButton>
 *
 * @example
 * // Critical — hard delete (không hoàn tác)
 * <AppButton variant="critical" onClick={handleBulkDelete}>
 *   Xóa vĩnh viễn
 * </AppButton>
 *
 * @example
 * // Icon-only — table row action
 * <AppButton variant="ghost" size="small" icon={<EyeOutlined />} aria-label="Xem chi tiết" />
 */
export function AppButton({
  children,
  icon,
  iconAfter,
  variant = 'secondary',
  size = 'middle',
  loading = false,
  disabled = false,
  block = false,
  shape = 'default',
  htmlType = 'button',
  className,
  style,
  onClick,
  'aria-label': ariaLabel,
  title,
  'data-testid': testId,
}: AppButtonProps) {
  const { type, danger, className: variantClass } = VARIANT_MAP[variant]

  // ── Loading text ───────────────────────────────────────────────────────────
  // Khi loading=true và có children text, thay bằng loading text của variant
  // Giữ nguyên nếu không có mapping (vd: secondary, ghost)
  const resolvedChildren = (() => {
    if (!loading || !children) return children
    const loadingText = LOADING_TEXT_MAP[variant]
    return loadingText ?? children
  })()

  // ── Disabled logic ─────────────────────────────────────────────────────────
  // loading luôn disable button (không fire onClick, visual grayed)
  const isDisabled = disabled || loading

  // ── Compound icon layout ───────────────────────────────────────────────────
  // AntD Button hỗ trợ `icon` prop natively cho icon trước text
  // iconAfter cần wrap thủ công trong children
  const content = iconAfter ? (
    <>
      {resolvedChildren}
      <span className={styles.iconAfter}>{iconAfter}</span>
    </>
  ) : (
    resolvedChildren
  )

  // ── className composition ──────────────────────────────────────────────────
  const composedClassName = clsx(
    styles.base,
    styles[`size-${size}`],
    variantClass,
    {
      [styles.loading]: loading,
      [styles.iconOnly]: !children && icon,
    },
    className,
  )

  return (
    <Button
      type={type}
      danger={danger}
      size={size}
      loading={loading}
      disabled={isDisabled}
      block={block}
      shape={shape}
      htmlType={htmlType}
      icon={icon}
      className={composedClassName}
      style={style}
      onClick={isDisabled ? undefined : onClick}
      aria-label={ariaLabel}
      title={title}
      data-testid={testId}
    >
      {content}
    </Button>
  )
}
