import { ExclamationCircleFilled } from '@ant-design/icons'
import { Alert, Button, Flex, Modal, Space, Typography } from 'antd'
import type { FC } from 'react'
import type { AppModalProps } from './AppModal.types'

const { Text } = Typography

// ─── Footer Builder ───────────────────────────────────────────────────────────

interface FooterProps {
  footerMode:     AppModalProps['footerMode']
  variant:        NonNullable<AppModalProps['variant']>
  onClose:        () => void
  onConfirm?:     () => void | Promise<void>
  onCancel?:      () => void
  confirmText:    string
  cancelText:     string
  confirmLoading: boolean
  footerActions?: React.ReactNode
}

function ModalFooter({
  footerMode,
  variant,
  onClose,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  confirmLoading,
  footerActions,
}: FooterProps) {
  const handleCancel = onCancel ?? onClose

  if (footerMode === 'none') return null

  if (footerMode === 'custom') {
    return <Flex justify="flex-end" gap={8}>{footerActions}</Flex>
  }

  if (footerMode === 'ok-only') {
    return (
      <Flex justify="flex-end">
        <Button type="primary" onClick={onClose}>OK</Button>
      </Flex>
    )
  }

  // Default: 'confirm-cancel'
  return (
    <Flex justify="flex-end" gap={8}>
      <Button
        onClick={handleCancel}
        disabled={confirmLoading}
      >
        {cancelText}
      </Button>
      <Button
        type="primary"
        danger={variant === 'critical'}
        loading={confirmLoading}
        onClick={onConfirm}
      >
        {confirmText}
      </Button>
    </Flex>
  )
}

// ─── Warning Box ──────────────────────────────────────────────────────────────
// Hiển thị khi variant='critical' và warningText có giá trị.
// Render phía trên footer, dưới children.

function WarningBox({ text }: { text: React.ReactNode }) {
  return (
    <Alert
      type="error"
      showIcon
      icon={<ExclamationCircleFilled />}
      message={
        typeof text === 'string'
          ? <Text strong style={{ fontSize: 13 }}>{text}</Text>
          : text
      }
      style={{ marginTop: 16 }}
    />
  )
}

// ─── AppModal ─────────────────────────────────────────────────────────────────

const AppModal: FC<AppModalProps> = ({
  open,
  onClose,
  title,
  children,
  variant        = 'standard',
  footerMode     = 'confirm-cancel',
  onConfirm,
  confirmText    = 'Xác nhận',
  confirmLoading = false,
  onCancel,
  cancelText     = 'Hủy',
  footerActions,
  warningText,
  width          = 520,
  maskClosable,
  keyboard       = true,
  destroyOnClose = true,
  className,
  style,
}) => {
  // Khi đang loading → tự động khóa maskClosable để tránh close giữa chừng
  const resolvedMaskClosable =
    maskClosable !== undefined ? maskClosable : !confirmLoading

  const footer = (
    <ModalFooter
      footerMode={footerMode}
      variant={variant}
      onClose={onClose}
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmText={confirmText}
      cancelText={cancelText}
      confirmLoading={confirmLoading}
      footerActions={footerActions}
    />
  )

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      width={width}
      footer={footerMode === 'none' ? null : footer}
      maskClosable={resolvedMaskClosable}
      keyboard={keyboard}
      destroyOnClose={destroyOnClose}
      className={className}
      style={style}
      // Tắt nút X của AntD khi loading để tránh close giữa chừng
      closable={!confirmLoading}
    >
      {children}

      {/* Warning box — chỉ render khi có warningText */}
      {warningText && <WarningBox text={warningText} />}
    </Modal>
  )
}

export default AppModal
