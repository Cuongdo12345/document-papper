import { Layout } from 'antd'
import type { FC } from 'react'
import SidebarCollapseButton from './SidebarCollapseButton'
import SidebarLogo from './SidebarLogo'
import SidebarMenu from './SidebarMenu'
import type { Role } from './menu.config'

const { Sider } = Layout

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR — Desktop (≥ 768px)
// Inline mode, cố định bên trái.
// width: 240px (expanded) ↔ 64px (collapsed)
// background: #001529 (AntD dark sider default)
// Chứa: SidebarLogo + SidebarMenu + SidebarCollapseButton
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  isAdmin: boolean
  roleName: Role | null
}

const Sidebar: FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  isAdmin,
  roleName,
}) => {
  return (
    <Sider
      width={240}
      collapsedWidth={64}
      collapsed={collapsed}
      // collapsible=false — collapse button tự quản lý
      collapsible={false}
      theme="dark"
      style={{
        // Override AntD Sider để dùng flex column
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
        overflow: 'hidden',
        // AntD Sider transition tự xử lý qua width: 0.2s ease
      }}
    >
      {/* Wrapper flex column để Logo, Menu, Button phân bổ đúng */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* 1. Logo section */}
        <SidebarLogo collapsed={collapsed} />

        {/* 2. Menu — flex: 1 để chiếm hết không gian còn lại */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <SidebarMenu
            collapsed={collapsed}
            isAdmin={isAdmin}
            roleName={roleName}
          />
        </div>

        {/* 3. Collapse button — luôn ở bottom */}
        <SidebarCollapseButton
          collapsed={collapsed}
          onClick={onToggleCollapse}
        />
      </div>
    </Sider>
  )
}

export default Sidebar
