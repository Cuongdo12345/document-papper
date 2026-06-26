import { FileProtectOutlined } from '@ant-design/icons'
import { Typography } from 'antd'
import type { FC } from 'react'

const { Text } = Typography

// ─────────────────────────────────────────────────────────────────────────────
// LOGO SECTION
// Height: 64px — bằng Header để căn hàng ngang
// Expanded: logo icon + tên hệ thống
// Collapsed: chỉ logo icon (32×32)
// background: #002140 (tối hơn sidebar body #001529)
// border-bottom: 1px solid rgba(255,255,255,0.1)
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarLogoProps {
  collapsed: boolean
}

const SidebarLogo: FC<SidebarLogoProps> = ({ collapsed }) => {
  return (
    <div
      style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 0 : '0 20px',
        background: '#002140',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'padding 0.2s ease',
      }}
    >
      {/* Logo icon — luôn hiển thị */}
      <div
        style={{
          width: 32,
          height: 32,
          background: 'var(--ant-color-primary, #1677ff)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <FileProtectOutlined style={{ fontSize: 18, color: '#fff' }} />
      </div>

      {/* App name — chỉ hiển thị khi expanded */}
      {!collapsed && (
        <Text
          strong
          style={{
            color: '#ffffff',
            fontSize: 14,
            marginLeft: 10,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.4,
          }}
        >
          Quản lý Văn bản
        </Text>
      )}
    </div>
  )
}

export default SidebarLogo
