import type { AppButtonVariant, AntdButtonMapping } from './AppButton.types'

// ─────────────────────────────────────────────────────────────────────────────
// Variant → AntD Button props mapping
//
// Nguồn màu từ PROJECT_UNDERSTANDING §11.1 AntD Theme Tokens:
//   colorPrimary  : #1677ff
//   colorSuccess  : #52c41a
//   colorWarning  : #faad14
//   colorError    : #ff4d4f
//
// Nguồn semantic từ màn hình:
//   primary   → Tạo, Lưu, Đăng nhập, Xác nhận     (SCR-01,06,07,08,09,14,17,18,19,20,22,23,27,28)
//   secondary → Hủy, Quay lại, Xem                 (mọi màn hình có cancel)
//   danger    → Vô hiệu hóa user, Xóa mềm doc      (SCR-07,10,17,19)
//   critical  → Hard delete dept, Bulk delete doc   (SCR-05,14,20,22,23) — xóa KHÔNG hoàn tác
//   success   → Approve workflow                    (SCR-07,10,13)
//   warning   → Reject workflow                     (SCR-07,10,13)
//   ghost     → Inline table actions (Xem, Sửa)    (SCR-05,08,11,14,17,20,22,23,24)
//   link      → Navigate, breadcrumb action         (PageHeader, table links)
// ─────────────────────────────────────────────────────────────────────────────

export const VARIANT_MAP: Record<AppButtonVariant, AntdButtonMapping> = {
  primary: {
    type: 'primary',
    danger: false,
    className: 'app-btn--primary',
  },
  secondary: {
    type: 'default',
    danger: false,
    className: 'app-btn--secondary',
  },
  danger: {
    type: 'default',
    danger: true,
    className: 'app-btn--danger',
  },
  critical: {
    type: 'primary',
    danger: true,
    className: 'app-btn--critical',
  },
  success: {
    type: 'primary',
    danger: false,
    // AntD 5 không có built-in success type trên Button
    // Dùng CSS override với colorSuccess token
    className: 'app-btn--success',
  },
  warning: {
    type: 'default',
    danger: false,
    // CSS override với colorWarning token
    className: 'app-btn--warning',
  },
  ghost: {
    type: 'default',
    danger: false,
    className: 'app-btn--ghost',
  },
  link: {
    type: 'link',
    danger: false,
    className: 'app-btn--link',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading text per variant
// Khi loading=true, hiện text thay thế nếu có children
// ─────────────────────────────────────────────────────────────────────────────

export const LOADING_TEXT_MAP: Partial<Record<AppButtonVariant, string>> = {
  primary:   'Đang xử lý...',
  critical:  'Đang xóa...',
  success:   'Đang duyệt...',
  warning:   'Đang xử lý...',
}
