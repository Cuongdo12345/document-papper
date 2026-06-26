import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Button, Layout } from 'antd'
import type { FC } from 'react'
import ProfileDropdown from './ProfileDropdown'

const { Header: AntdHeader } = Layout

// ─────────────────────────────────────────────────────────────────────────────
// HEADER
// height: 64px, sticky top 0, z-index: 10
// background: #ffffff
// border-bottom: 1px solid colorBorderSecondary
// Left: hamburger (mobile < 768px) or empty
// Right: ProfileDropdown
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderProps {
  // User data từ auth.store
  user: {
    _id: string
    fullName: string
    username: string
    role: { name: string }
    department?: { name: string }
  }
  refreshToken: string | null
  onLogout: () => void

  // Mobile sidebar control
  // Chỉ dùng ở mobile (< 768px) — hamburger button
  isMobileOpen?: boolean
  onMobileToggle?: () => void
}

const Header: FC<HeaderProps> = ({
  user,
  refreshToken,
  onLogout,
  isMobileOpen = false,
  onMobileToggle,
}) => {
  return (
    <AntdHeader
      style={{
        height: 64,
        padding: '0 24px',
        background: '#ffffff',
        borderBottom: '1px solid var(--ant-color-border-secondary, #f0f0f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {/* ── Left section ──────────────────────────────────────────────────── */}
      {/* Chỉ hiển thị hamburger trên mobile (< 768px)
          Desktop: khoảng trống (breadcrumb ở AppPageHeader trong Content area)
          Nguồn: LAYOUT_ARCHITECTURE.md §4.5 */}
      <div>
        {onMobileToggle && (
          <Button
            type="text"
            icon={isMobileOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={onMobileToggle}
            aria-label={isMobileOpen ? 'Đóng menu' : 'Mở menu'}
            style={{
              fontSize: 16,
              // Chỉ hiện trên mobile — dùng CSS media query inline
              display: 'flex',
              alignItems: 'center',
            }}
            className="header-hamburger"
          />
        )}
      </div>

      {/* ── Right section ─────────────────────────────────────────────────── */}
      <ProfileDropdown
        user={user}
        refreshToken={refreshToken}
        onLogout={onLogout}
      />
    </AntdHeader>
  )
}

export default Header
