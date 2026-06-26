import { Typography } from 'antd'
import type { FC } from 'react'
import AppModal from './AppModal'
import type { ConfirmModalProps } from './AppModal.types'

const { Paragraph } = Typography

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
// Wrapper nhỏ của AppModal — dùng riêng bởi useConfirm hook.
// Page không mount component này trực tiếp — dùng qua useConfirm().

const ConfirmModal: FC<ConfirmModalProps> = ({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  variant     = 'standard',
  confirmText = 'Xác nhận',
  cancelText  = 'Hủy',
  warningText,
}) => {
  return (
    <AppModal
      open={open}
      onClose={onCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={title}
      variant={variant}
      confirmText={confirmText}
      cancelText={cancelText}
      warningText={warningText}
      width={440}
      destroyOnClose
    >
      {description && (
        typeof description === 'string'
          ? <Paragraph style={{ marginBottom: 0 }}>{description}</Paragraph>
          : description
      )}
    </AppModal>
  )
}

export default ConfirmModal
