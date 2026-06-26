/**
 * AppPageHeader.types.ts
 *
 * Types cho AppPageHeader component — CMP-07, Layer 1 Layout.
 *
 * AppPageHeader xuất hiện ở tất cả private screens:
 *   - List screens  : title + toolbar actions (Tạo, Export, Import…)
 *   - Detail screens: breadcrumb + title + edit / save / cancel / delete
 *   - Create screens: breadcrumb + title
 *   - Dashboard tabs: title + optional tab switcher (handled ngoài component)
 *   - Utility screens: title đơn giản
 *
 * Nguồn thiết kế:
 *   SHARED_COMPONENTS_IMPLEMENTATION.md § 1.3 Component Contract
 *   PROJECT_UNDERSTANDING.md §11.3 — 6 loại màn hình
 *   PROJECT_UNDERSTANDING.md CHECKLIST — 32 screens
 */

import type { CSSProperties, ReactNode } from 'react';

// ─────────────────────────────────────────────
// Breadcrumb
// ─────────────────────────────────────────────

/**
 * Một item trong breadcrumb trail.
 *
 * - Nếu có `href` hoặc `onClick` → render dạng link/button
 * - Nếu không có → render dạng text (item cuối cùng)
 */
export interface BreadcrumbItem {
  /** Nhãn hiển thị */
  label: string;

  /**
   * Đường dẫn điều hướng (react-router-dom `to`).
   * Nếu truyền `href`, ưu tiên dùng `<Link to={href}>`.
   */
  href?: string;

  /**
   * Icon tuỳ chọn phía trước label.
   * Nhận ReactNode để tương thích với antd icons và custom SVG.
   */
  icon?: ReactNode;
}

// ─────────────────────────────────────────────
// Action Buttons
// ─────────────────────────────────────────────

/**
 * Variant của action button — ánh xạ sang AntD Button type.
 *
 * - `primary`  : nút chính — "Tạo mới", "Lưu thay đổi"
 * - `default`  : nút phụ  — "Chỉnh sửa", "Export"
 * - `danger`   : nút nguy hiểm — "Xóa", "Vô hiệu hóa"  (màu đỏ)
 * - `text`     : nút không viền — "Hủy"
 * - `link`     : nút dạng link
 */
export type ActionButtonVariant = 'primary' | 'default' | 'danger' | 'text' | 'link';

/**
 * Định nghĩa một action button trong toolbar.
 *
 * Thứ tự render: trái → phải theo thứ tự trong mảng `actions`.
 * Thông thường: [secondary actions...] [primary action] ở cuối bên phải.
 */
export interface PageAction {
  /** Định danh duy nhất — dùng cho React key */
  key: string;

  /** Nhãn nút */
  label: ReactNode;

  /** Variant của nút */
  variant?: ActionButtonVariant;

  /** Icon phía trước label */
  icon?: ReactNode;

  /** Handler khi click */
  onClick?: () => void;

  /** Nút bị disabled */
  disabled?: boolean;

  /**
   * Nút đang loading — hiển thị spinner, disable click.
   * Dùng cho: đang gọi API export, import, save...
   */
  loading?: boolean;

  /**
   * Tooltip text khi hover — hữu ích khi nút bị disabled.
   * Ví dụ: "Chỉ ADMIN mới có thể xóa"
   */
  tooltip?: string;

  /**
   * Ẩn hoàn toàn nút — không render vào DOM.
   * Dùng khi PermissionGate check role ở tầng page,
   * hoặc khi điều kiện nghiệp vụ không thoả (e.g. document đã approved).
   */
  hidden?: boolean;
}

// ─────────────────────────────────────────────
// Component Props
// ─────────────────────────────────────────────

export interface AppPageHeaderProps {
  // ── Core display ──────────────────────────

  /**
   * Tiêu đề trang — luôn bắt buộc.
   * Ví dụ: "Danh sách Đề xuất", "Chi tiết Đề xuất", "Tạo Biên bản"
   */
  title: ReactNode;

  /**
   * Mô tả phụ bên dưới title — tùy chọn.
   * Dùng khi cần thêm context: "Hiển thị 50 tài liệu", "Cập nhật lần cuối: 10/06/2026"
   */
  description?: ReactNode;

  // ── Breadcrumb ────────────────────────────

  /**
   * Danh sách breadcrumb items.
   * - Không truyền → không render breadcrumb
   * - Truyền mảng → render AntD Breadcrumb phía trên title
   *
   * Item cuối cùng thường là trang hiện tại (không có href).
   *
   * @example
   * breadcrumbs={[
   *   { label: 'Trang chủ', href: '/dashboard', icon: <HomeOutlined /> },
   *   { label: 'Tài liệu', href: '/documents/proposals' },
   *   { label: 'Chi tiết Đề xuất' },
   * ]}
   */
  breadcrumbs?: BreadcrumbItem[];

  // ── Back button ───────────────────────────

  /**
   * Hiển thị nút "← Quay lại" phía trước title.
   * Khi click → navigate(-1) bằng react-router.
   *
   * Thường dùng ở: Detail pages, Create pages.
   * Không dùng ở: List pages (không cần back button).
   */
  showBack?: boolean;

  /**
   * Custom handler cho nút quay lại.
   * Nếu không truyền → dùng `navigate(-1)` mặc định.
   */
  onBack?: () => void;

  // ── Actions toolbar ───────────────────────

  /**
   * Danh sách action buttons render ở phía phải của header.
   * Thứ tự: trái → phải theo index trong mảng.
   *
   * Không truyền hoặc mảng rỗng → không render toolbar.
   *
   * @example
   * actions={[
   *   { key: 'export', label: 'Export Excel', variant: 'default', icon: <DownloadOutlined />, onClick: handleExport },
   *   { key: 'create', label: 'Tạo mới', variant: 'primary', icon: <PlusOutlined />, onClick: handleCreate },
   * ]}
   */
  actions?: PageAction[];

  // ── Extra slot ────────────────────────────

  /**
   * Slot tuỳ ý phía phải, sau actions.
   * Dùng cho: Tab switcher nhỏ, Status indicator, custom controls.
   * Tránh đặt quá nhiều thứ ở đây — dùng tiết kiệm.
   */
  extra?: ReactNode;

  // ── Layout ────────────────────────────────

  /**
   * Khoảng cách bottom của header — mặc định 24px (spacing-lg).
   * Một số trang muốn kéo sát xuống content (0 hoặc 16px).
   */
  marginBottom?: number;

  /**
   * Thêm đường kẻ ngang bên dưới header (AntD Divider).
   * Hữu ích khi nền page không có card wrapper.
   * Mặc định: false
   */
  divider?: boolean;

  // ── Override ──────────────────────────────

  /** CSS class name tuỳ chọn cho wrapper ngoài cùng */
  className?: string;

  /** Inline style cho wrapper ngoài cùng */
  style?: CSSProperties;
}
