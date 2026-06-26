import {
  ExclamationCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  Button,
  Drawer,
  Flex,
  Modal,
  Result,
  Skeleton,
  Space,
  Typography,
} from 'antd'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { buildDrawerFooter } from './AppDrawer.footer'
import type { AppDrawerProps, Role } from './AppDrawer.types'

const { Title, Text } = Typography

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE WIDTH UTILITY
// Trên màn hình < 640px → width 100%
// ─────────────────────────────────────────────────────────────────────────────

function resolveWidth(width: AppDrawerProps['width']): string | number {
  if (typeof window !== 'undefined' && window.innerWidth < 640) return '100%'
  return width ?? 520
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM HEADER
// title: string → AntD Typography.Title level 5
// title: ReactNode → render trực tiếp
// ─────────────────────────────────────────────────────────────────────────────

function DrawerHeader({
  title,
  subtitle,
  headerExtra,
}: {
  title: AppDrawerProps['title']
  subtitle?: string
  headerExtra?: React.ReactNode
}) {
  return (
    <Flex justify="space-between" align="flex-start" style={{ width: '100%' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? (
          <Title level={5} style={{ margin: 0, lineHeight: '22px' }}>
            {title}
          </Title>
        ) : (
          title
        )}
        {subtitle && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </div>
      {headerExtra && (
        <div style={{ marginLeft: 12, flexShrink: 0 }}>{headerExtra}</div>
      )}
    </Flex>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT LOADING — Skeleton placeholder
// ─────────────────────────────────────────────────────────────────────────────

function ContentSkeleton() {
  return (
    <div style={{ padding: '8px 0' }}>
      <Skeleton active paragraph={{ rows: 6 }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CONTENT
// ─────────────────────────────────────────────────────────────────────────────

function ErrorContent({
  message,
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <Result
      status="error"
      title="Không thể tải dữ liệu"
      subTitle={message ?? 'Đã xảy ra lỗi. Vui lòng thử lại hoặc liên hệ quản trị viên.'}
      extra={
        onRetry ? (
          <Button
            icon={<ReloadOutlined />}
            onClick={onRetry}
          >
            Thử lại
          </Button>
        ) : undefined
      }
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOSE GUARD CONFIRM
// Dùng AntD Modal.confirm — không cần mount thêm component
// ─────────────────────────────────────────────────────────────────────────────

function showCloseGuardConfirm(options: {
  title: string
  description: string
  confirmText: string
  cancelText: string
  onConfirm: () => void
}) {
  Modal.confirm({
    title: options.title,
    content: options.description,
    icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
    okText: options.confirmText,
    okType: 'danger',
    cancelText: options.cancelText,
    onOk: options.onConfirm,
    // Không có onCancel — user chọn "Tiếp tục chỉnh sửa" → không làm gì
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// APP DRAWER
// ─────────────────────────────────────────────────────────────────────────────

const AppDrawer: FC<AppDrawerProps> = ({
  // Visibility
  open,
  onClose,

  // Mode & Identity
  mode = 'view',
  title,
  subtitle,

  // Content
  children,

  // Footer
  footerActions,
  hideFooter = false,

  // Loading
  contentLoading = false,
  submitLoading = false,

  // Error
  error,

  // Close guard
  closeGuard,

  // Sizing
  width,
  height,
  placement = 'right',

  // Behavior
  maskClosable,
  keyboard = true,
  destroyOnClose = true,
  push = false,

  // Scroll
  bodyScrollable = true,

  // Extra header
  headerExtra,

  // Async submit
  onSubmit,
  submitText,

  // Display
  className,
  style,
  bodyStyle,
  zIndex,
}) => {

  // ── Resolve maskClosable ──────────────────────────────────────────────────
  // submitLoading → tự động false để tránh close giữa mutation
  const resolvedMaskClosable =
    submitLoading ? false : (maskClosable ?? true)

  // ── Role — đọc từ auth.store trong dự án thực ─────────────────────────────
  // Stub: import { useAuthStore } from '@/store/auth.store'
  // const roleName = useAuthStore(s => s.user?.role?.name ?? null) as Role | null
  // Đây là placeholder để AppDrawer folder tự đứng độc lập khi demo
  const roleName: Role | null = null // TODO: replace with useAuthStore selector

  // ── Handle close attempt ──────────────────────────────────────────────────
  const handleCloseAttempt = useCallback(() => {
    // Block close khi đang submit
    if (submitLoading) return

    // closeGuard active và form dirty → show confirm
    if (closeGuard && (mode === 'create' || mode === 'edit')) {
      const isDirty = closeGuard.isDirty()
      if (isDirty) {
        showCloseGuardConfirm({
          title:       closeGuard.title       ?? 'Bỏ thay đổi?',
          description: closeGuard.description ?? 'Thay đổi chưa lưu sẽ bị mất.',
          confirmText: closeGuard.confirmText ?? 'Bỏ thay đổi',
          cancelText:  closeGuard.cancelText  ?? 'Tiếp tục chỉnh sửa',
          onConfirm:   onClose,
        })
        return
      }
    }

    onClose()
  }, [submitLoading, closeGuard, mode, onClose])

  // ── Build footer ──────────────────────────────────────────────────────────
  const footer = buildDrawerFooter({
    mode,
    roleName,
    onClose: handleCloseAttempt,
    onSubmit,
    submitText,
    submitLoading,
    footerActions,
    hideFooter,
  })

  // ── Resolve body content ──────────────────────────────────────────────────
  let bodyContent: React.ReactNode

  if (contentLoading) {
    bodyContent = <ContentSkeleton />
  } else if (error?.hasError) {
    bodyContent = (
      <ErrorContent
        message={error.message}
        onRetry={error.onRetry}
      />
    )
  } else {
    bodyContent = children
  }

  // ── Drawer title slot — AntD Drawer `title` prop ─────────────────────────
  const drawerTitle = (
    <DrawerHeader
      title={title}
      subtitle={subtitle}
      headerExtra={headerExtra}
    />
  )

  return (
    <Drawer
      open={open}
      onClose={handleCloseAttempt}
      title={drawerTitle}
      placement={placement}
      width={resolveWidth(width)}
      height={height}
      footer={footer}
      maskClosable={resolvedMaskClosable}
      keyboard={keyboard}
      destroyOnClose={destroyOnClose}
      push={push}
      zIndex={zIndex}
      className={className}
      style={style}
      styles={{
        body: {
          overflowY: bodyScrollable ? 'auto' : 'hidden',
          padding: '24px',
          ...bodyStyle,
        },
        // Tắt default AntD footer padding để footer builder tự kiểm soát layout
        footer: {
          padding: '16px 24px',
          borderTop: '1px solid var(--ant-color-border-secondary, #f0f0f0)',
        },
      }}
      // Ẩn close button khi đang submit
      closable={!submitLoading}
    >
      {bodyContent}
    </Drawer>
  )
}

export default AppDrawer
