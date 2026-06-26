import { Button, Flex, Space } from 'antd'
import type { ReactNode } from 'react'
import type { AppDrawerMode, DrawerFooterAction, Role } from './AppDrawer.types'

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SUBMIT TEXT PER MODE
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SUBMIT_TEXT: Record<AppDrawerMode, string> = {
  view:   'Đóng',
  create: 'Tạo mới',
  edit:   'Lưu thay đổi',
  custom: 'Xác nhận',
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION FILTER
// Lọc actions theo role hiện tại.
// ADMIN bypass — luôn thấy tất cả actions.
// Nếu action không có roles prop → luôn hiển thị (không check permission).
// ─────────────────────────────────────────────────────────────────────────────

export function filterActionsByRole(
  actions: DrawerFooterAction[],
  roleName: Role | null,
): DrawerFooterAction[] {
  if (!roleName) return []

  const isAdmin = roleName === 'ADMIN'

  return actions.filter(action => {
    // hidden: true → luôn lọc ra, priority cao nhất
    if (action.hidden) return false
    // Không có roles constraint → hiển thị cho tất cả
    if (!action.roles || action.roles.length === 0) return true
    // ADMIN bypass
    if (isAdmin) return true
    // Check role
    return action.roles.includes(roleName)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIANT → AntD Button props mapping
// ─────────────────────────────────────────────────────────────────────────────

type AntDButtonType = 'primary' | 'default' | 'text' | 'link' | 'dashed'

function resolveButtonProps(
  variant: DrawerFooterAction['variant'],
): { type: AntDButtonType; danger: boolean } {
  switch (variant) {
    case 'primary':  return { type: 'primary',  danger: false }
    case 'danger':   return { type: 'primary',  danger: true  }
    case 'text':     return { type: 'text',     danger: false }
    case 'default':
    default:         return { type: 'default',  danger: false }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER BUILDER
// ─────────────────────────────────────────────────────────────────────────────

interface BuildFooterArgs {
  mode: AppDrawerMode
  roleName: Role | null
  onClose: () => void
  onSubmit?: () => Promise<void>
  submitText?: string
  submitLoading?: boolean
  footerActions?: DrawerFooterAction[]
  hideFooter?: boolean
}

export function buildDrawerFooter(args: BuildFooterArgs): ReactNode | null {
  const {
    mode,
    roleName,
    onClose,
    onSubmit,
    submitText,
    submitLoading = false,
    footerActions,
    hideFooter = false,
  } = args

  if (hideFooter) return null

  // ── VIEW MODE — chỉ có nút Đóng ──────────────────────────────────────────
  if (mode === 'view') {
    return (
      <Flex justify="flex-end">
        <Button onClick={onClose}>Đóng</Button>
      </Flex>
    )
  }

  // ── CUSTOM MODE — page truyền footerActions hoàn toàn ────────────────────
  if (mode === 'custom' && footerActions) {
    const visibleActions = filterActionsByRole(footerActions, roleName)
    if (visibleActions.length === 0) return null

    return (
      <Flex justify="flex-end" gap={8}>
        {visibleActions.map(action => {
          const { type, danger } = resolveButtonProps(action.variant)
          return (
            <Button
              key={action.key}
              type={type}
              danger={danger}
              loading={action.loading}
              disabled={action.disabled || submitLoading}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )
        })}
      </Flex>
    )
  }

  // ── CREATE / EDIT MODE ────────────────────────────────────────────────────
  // Default: [Hủy] [Submit]
  // Nếu có footerActions → render thêm sau nút Hủy, trước nút Submit
  const resolvedSubmitText = submitText ?? DEFAULT_SUBMIT_TEXT[mode]
  const extraActions = footerActions
    ? filterActionsByRole(footerActions, roleName)
    : []

  return (
    <Flex justify="flex-end" gap={8} align="center">
      {/* Cancel */}
      <Button
        onClick={onClose}
        disabled={submitLoading}
      >
        Hủy
      </Button>

      {/* Extra custom actions (giữa Cancel và Submit) */}
      {extraActions.map(action => {
        const { type, danger } = resolveButtonProps(action.variant)
        return (
          <Button
            key={action.key}
            type={type}
            danger={danger}
            loading={action.loading}
            disabled={action.disabled || submitLoading}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )
      })}

      {/* Submit / Confirm */}
      {onSubmit && (
        <Button
          type="primary"
          loading={submitLoading}
          onClick={onSubmit}
        >
          {resolvedSubmitText}
        </Button>
      )}
    </Flex>
  )
}
