import {
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { Typography } from 'antd'
import type { FC } from 'react'

const { Text } = Typography

// ─────────────────────────────────────────────────────────────────────────────
// COLLAPSE BUTTON
// Vị trí: cuối sidebar (bottom)
// Height: 48px
// Expanded: icon ← + text "Thu gọn"
// Collapsed: chỉ icon →
// border-top: 1px solid rgba(255,255,255,0.1)
// onClick: toggle ui.store.sidebarCollapsed
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarCollapseButtonProps {
  collapsed: boolean
  onClick: () => void
}

const SidebarCollapseButton: FC<SidebarCollapseButtonProps> = ({
  collapsed,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
      style={{
        width: '100%',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 0 : '0 20px',
        gap: 10,
        background: 'transparent',
        border: 'none',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.15s ease',
        // Hover effect
        outline: 'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {/* Icon — ← khi expanded, → khi collapsed */}
      {collapsed
        ? <RightOutlined style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }} />
        : <LeftOutlined  style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }} />
      }

      {/* Text — chỉ khi expanded */}
      {!collapsed && (
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1 }}>
          Thu gọn
        </Text>
      )}
    </button>
  )
}

export default SidebarCollapseButton
