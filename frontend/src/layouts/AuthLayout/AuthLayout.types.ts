/**
 * AuthLayout.types.ts
 *
 * Types cho AuthLayout và các sub-elements.
 *
 * Nguồn:
 *   LAYOUT_ARCHITECTURE.md §1 — Auth Layout spec
 *   SHARED_COMPONENTS_LIBRARY.md — Component contracts
 */

// ─────────────────────────────────────────────────────────────────────────────
// Logo config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cấu hình logo block phía trên form.
 * Theo LAYOUT_ARCHITECTURE §1.2: Logo image + tên hệ thống, căn giữa.
 */
export interface AuthLogoConfig {
  /**
   * Source của logo image.
   * Nếu không có → chỉ hiện systemName text.
   */
  src?: string

  /**
   * Alt text cho image (accessibility).
   * @default 'Logo'
   */
  alt?: string

  /**
   * Width của logo image (px).
   * @default 48
   */
  width?: number

  /**
   * Height của logo image (px).
   * @default 48
   */
  height?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthLayout props
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthLayoutProps {
  /**
   * Tên hệ thống hiển thị dưới logo.
   * LAYOUT_ARCHITECTURE §1.2: "Logo image + tên hệ thống".
   * @default 'Quản lý Văn bản'
   */
  systemName?: string

  /**
   * Mô tả ngắn dưới system name (optional).
   * Ví dụ: "Hệ thống quản lý giấy tờ nội bộ"
   */
  systemDescription?: string

  /**
   * Cấu hình logo image.
   * Nếu không có logo → chỉ hiện systemName.
   */
  logo?: AuthLogoConfig

  /**
   * Footer text dưới Card (copyright, version...).
   * Nếu không truyền → không render footer.
   */
  footerText?: string

  /**
   * data-testid cho outer wrapper (test automation).
   */
  'data-testid'?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout dimension constants (từ LAYOUT_ARCHITECTURE §1.3)
// Tập trung tại đây để dễ thay đổi global.
// ─────────────────────────────────────────────────────────────────────────────

export const AUTH_LAYOUT_CONSTANTS = {
  /** Max width của Card chứa form — 420px theo spec */
  CARD_MAX_WIDTH: 420,

  /** Padding trong Card ở viewport ≥ 480px — 32px theo spec */
  CARD_PADDING: 32,

  /** Padding trong Card ở viewport < 480px (mobile) — giảm xuống */
  CARD_PADDING_MOBILE: 20,

  /** Breakpoint mobile (px) — dưới mức này Card full width */
  MOBILE_BREAKPOINT: 480,

  /** Margin bottom của logo block — 32px theo spec */
  LOGO_MARGIN_BOTTOM: 32,

  /** Width mặc định của logo image */
  LOGO_DEFAULT_WIDTH: 48,

  /** Height mặc định của logo image */
  LOGO_DEFAULT_HEIGHT: 48,
} as const
