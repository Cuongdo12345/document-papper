import type { CSSProperties, ReactNode } from 'react'

// ─── Variant ─────────────────────────────────────────────────────────────────
//
// standard  — Form modal, thông tin, nhập liệu
//             Footer: [Hủy] [Xác nhận/custom]
//             Confirm button: primary (blue)
//
// critical  — Destructive action: xóa, vô hiệu hóa, reset password
//             Footer: [Hủy] [Xác nhận/custom]
//             Confirm button: danger (red)
//             Hiển thị WarningBox màu đỏ nhạt nếu có warningText

export type AppModalVariant = 'standard' | 'critical'

// ─── Footer Mode ─────────────────────────────────────────────────────────────
//
// confirm-cancel  — Hai nút: Hủy + Xác nhận (default)
// ok-only         — Một nút: OK — dùng cho modal thông báo read-only
// custom          — Hoàn toàn tự do: truyền footerActions prop
// none            — Không có footer — dùng khi form tự quản lý submit

export type AppModalFooterMode = 'confirm-cancel' | 'ok-only' | 'custom' | 'none'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AppModalProps {
  // 1. Visibility — controlled
  open: boolean
  onClose: () => void

  // 2. Content
  title: string
  children?: ReactNode

  // 3. Variant — ảnh hưởng màu confirm button và warning box
  variant?: AppModalVariant      // Default: 'standard'

  // 4. Footer
  footerMode?: AppModalFooterMode  // Default: 'confirm-cancel'

  // Confirm button
  onConfirm?: () => void | Promise<void>
  confirmText?: string             // Default: 'Xác nhận'
  confirmLoading?: boolean         // mutation.isPending

  // Cancel button
  onCancel?: () => void            // Nếu không truyền → gọi onClose
  cancelText?: string              // Default: 'Hủy'

  // Custom footer slot — chỉ dùng khi footerMode='custom'
  footerActions?: ReactNode

  // 5. Warning box — critical variant
  // Hiển thị alert box màu đỏ nhạt phía trên footer, dưới children
  warningText?: ReactNode

  // 6. Sizing
  width?: number | string          // Default: 520 (AntD default)

  // 7. Behavior
  // Ngăn đóng modal khi đang loading (confirmLoading=true)
  maskClosable?: boolean           // Default: true, tự động false khi confirmLoading

  // Đóng khi nhấn Escape
  keyboard?: boolean               // Default: true

  // Destroy children khi đóng — tiết kiệm RAM cho form nặng
  destroyOnClose?: boolean         // Default: true

  // 8. Display
  className?: string
  style?: CSSProperties
}

// ─── ConfirmModal Props (specialization) ─────────────────────────────────────
// Dùng riêng bởi useConfirm hook.
// Controlled bởi hook — page không dùng trực tiếp.

export interface ConfirmModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void

  title: string
  description?: ReactNode
  variant?: AppModalVariant      // Default: 'standard'
  confirmText?: string           // Default: 'Xác nhận'
  cancelText?: string            // Default: 'Hủy'
  warningText?: string
}
