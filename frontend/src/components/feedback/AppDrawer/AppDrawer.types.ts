import type { CSSProperties, ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// 1. DRAWER MODE
// ─────────────────────────────────────────────────────────────────────────────
//
// view    — Read-only. Footer: [Đóng] only. Content không có inputs.
// create  — Blank form. Footer: [Hủy] [Tạo mới / custom].
// edit    — Pre-filled form. Footer: [Hủy] [Lưu thay đổi / custom].
// custom  — Page hoàn toàn kiểm soát footer via footerActions prop.

export type AppDrawerMode = 'view' | 'create' | 'edit' | 'custom'

// ─────────────────────────────────────────────────────────────────────────────
// 2. DRAWER PLACEMENT
// ─────────────────────────────────────────────────────────────────────────────

export type AppDrawerPlacement = 'right' | 'left' | 'top' | 'bottom'

// ─────────────────────────────────────────────────────────────────────────────
// 3. FOOTER ACTION ITEM
// ─────────────────────────────────────────────────────────────────────────────
//
// Từng action button trong footer.
// `roles` — nếu truyền: chỉ render khi user có đúng role (permission-aware).
// `hidden` — ẩn hoàn toàn (kể cả khi user có role) — dùng cho conditional logic.

export type Role = 'ADMIN' | 'IT' | 'USER'

export interface DrawerFooterAction {
  key: string
  label: string
  onClick: () => void | Promise<void>

  // Appearance
  variant?: 'primary' | 'default' | 'danger' | 'text'
  loading?: boolean
  disabled?: boolean

  // Permission-aware: chỉ render nếu roleName ∈ roles
  // Nếu không truyền roles → luôn render (không check permission)
  roles?: Role[]

  // Ẩn hoàn toàn — priority cao hơn roles check
  hidden?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CONFIRM BEFORE CLOSE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
//
// Khi user cố đóng drawer mà form đang dirty → hiển thị AntD Modal.confirm.
// `isDirty` — function trả true nếu form có unsaved changes.
// Page truyền vào: () => form.isFieldsTouched()

export interface DrawerCloseGuard {
  // Function kiểm tra dirty state tại thời điểm đóng
  isDirty: () => boolean

  // Text trong confirm dialog (optional — có default)
  title?: string              // Default: 'Bỏ thay đổi?'
  description?: string        // Default: 'Thay đổi chưa lưu sẽ bị mất.'
  confirmText?: string        // Default: 'Bỏ thay đổi'
  cancelText?: string         // Default: 'Tiếp tục chỉnh sửa'
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ERROR STATE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export interface DrawerErrorState {
  // true → thay thế toàn bộ children bằng ErrorContent
  hasError: boolean
  message?: string              // Override default error message
  onRetry?: () => void          // Nếu truyền → hiển thị nút "Thử lại"
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MAIN PROPS INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export interface AppDrawerProps {

  // ── 1. Visibility ────────────────────────────────────────────────────────
  open: boolean
  onClose: () => void                // Luôn gọi khi close confirmed

  // ── 2. Mode & Identity ───────────────────────────────────────────────────
  mode?: AppDrawerMode               // Default: 'view'

  // Title: string → dùng Typography, ReactNode → render tự do (custom header)
  title: string | ReactNode

  // Subtitle dưới title — dùng cho context info (vd: role name khi assign perms)
  subtitle?: string

  // ── 3. Content ───────────────────────────────────────────────────────────
  children?: ReactNode

  // ── 4. Footer ────────────────────────────────────────────────────────────
  // footerActions chỉ dùng khi mode='custom' hoặc cần ghi đè default footer
  footerActions?: DrawerFooterAction[]

  // Tắt hoàn toàn footer — dùng khi content tự quản lý actions
  hideFooter?: boolean               // Default: false

  // ── 5. Loading State ─────────────────────────────────────────────────────
  // contentLoading: true → hiện Skeleton bên trong content area
  contentLoading?: boolean           // Default: false

  // submitLoading: true → confirm button loading + block close
  submitLoading?: boolean            // Default: false

  // ── 6. Error State ───────────────────────────────────────────────────────
  error?: DrawerErrorState

  // ── 7. Confirm Before Close ──────────────────────────────────────────────
  // Chỉ active khi mode='create' hoặc 'edit' và closeGuard được truyền
  closeGuard?: DrawerCloseGuard

  // ── 8. Sizing & Placement ────────────────────────────────────────────────
  width?: number | string            // Default: 520. Responsive: 100% khi < 640px
  height?: number | string           // Chỉ dùng khi placement='top'|'bottom'
  placement?: AppDrawerPlacement     // Default: 'right'

  // ── 9. Behavior ──────────────────────────────────────────────────────────
  maskClosable?: boolean             // Default: true. Auto false khi submitLoading=true
  keyboard?: boolean                 // Default: true
  destroyOnClose?: boolean           // Default: true — unmount children khi đóng
  push?: boolean                     // Default: false — AntD nested drawer push

  // ── 10. Scrollable Content ───────────────────────────────────────────────
  // AntD Drawer body đã scroll mặc định — prop này chỉ để disable nếu cần
  bodyScrollable?: boolean           // Default: true

  // ── 11. Extra Header Area ────────────────────────────────────────────────
  // Render thêm content bên trong header bar, bên phải title
  // Dùng cho: status badge, extra info chips
  headerExtra?: ReactNode

  // ── 12. Async Submit Handler ─────────────────────────────────────────────
  // Khi truyền onSubmit, AppDrawer tự tạo confirm button trong footer
  // và gọi hàm này khi click — không cần tự quản lý footerActions
  onSubmit?: () => Promise<void>
  submitText?: string                // Default: mode=create → 'Tạo mới', edit → 'Lưu thay đổi'

  // ── 13. Display ──────────────────────────────────────────────────────────
  className?: string
  style?: CSSProperties
  bodyStyle?: CSSProperties          // Override body padding/scroll
  zIndex?: number                    // Default: AntD default (1000)
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. INTERNAL STATE DESIGN (reference — không export)
// ─────────────────────────────────────────────────────────────────────────────
//
// AppDrawer quản lý tối thiểu internal state — tất cả state quan trọng ở parent.
//
// Internal state:
//   isConfirmingClose: boolean
//     → true khi user nhấn X/mask và closeGuard.isDirty() === true
//     → trigger AntD Modal.confirm
//     → sau confirm (user chọn "Bỏ thay đổi") → gọi onClose()
//
// KHÔNG có internal state cho:
//   - open: controlled bởi parent
//   - form values: AntD Form instance trong children
//   - submitLoading: parent quản lý (mutation.isPending)
//   - error: parent quản lý (mutation.isError)
//
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 8. EVENTS REFERENCE (không export — documentation only)
// ─────────────────────────────────────────────────────────────────────────────
//
// onClose()         → Fired khi:
//                     (a) user nhấn X button
//                     (b) user nhấn mask (nếu maskClosable)
//                     (c) user nhấn Escape
//                     (d) closeGuard confirm → "Bỏ thay đổi"
//                     (e) cancel/close button trong footer
//                     KHÔNG fired khi submitLoading=true
//
// onSubmit()        → Fired khi user nhấn confirm/submit button trong footer
//                     AppDrawer tự set submitLoading UI nếu Promise pending
//                     Parent vẫn phải truyền submitLoading prop để block close
//
// footerAction.onClick() → Fired khi user nhấn custom action button
//                          AppDrawer không intercept — delegate trực tiếp
//
// ─────────────────────────────────────────────────────────────────────────────
