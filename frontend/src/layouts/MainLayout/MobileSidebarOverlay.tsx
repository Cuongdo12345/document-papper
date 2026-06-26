import type { FC } from 'react'
import SidebarCollapseButton from '../Sidebar/SidebarCollapseButton'
import SidebarLogo from '../Sidebar/SidebarLogo'
import SidebarMenu from '../Sidebar/SidebarMenu'
import type { Role } from '../Sidebar/menu.config'

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE SIDEBAR OVERLAY
// Nguồn: LAYOUT_ARCHITECTURE.md §8.6
//
// Mobile (< 768px):
//   - position: fixed, z-index: 100
//   - Default: hidden (translateX(-100%))
//   - Open: translateX(0), transition: 0.25s ease
//   - Backdrop: rgba(0,0,0,0.45), click → close
//   - State: local useState trong MainLayout (KHÔNG persist)
//   - Luôn expanded (collapsed = false trong overlay mode)
// ─────────────────────────────────────────────────────────────────────────────

interface MobileSidebarOverlayProps {
  open: boolean
  onClose: () => void
  isAdmin: boolean
  roleName: Role | null
}

const MobileSidebarOverlay: FC<MobileSidebarOverlayProps> = ({
  open,
  onClose,
  isAdmin,
  roleName,
}) => {
  return (
    <>
      {/* Backdrop — click để đóng */}
      {open && (
        <div
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 99,
            // Transition để backdrop fade in
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* Sidebar panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 240,
          height: '100vh',
          background: '#001529',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          overflow: 'hidden',
        }}
        role="navigation"
        aria-label="Navigation menu"
      >
        {/* Logo */}
        <SidebarLogo collapsed={false} />

        {/* Menu */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <SidebarMenu
            collapsed={false}     // Overlay luôn expanded
            isAdmin={isAdmin}
            roleName={roleName}
          />
        </div>

        {/* Close button thay cho collapse button trong overlay */}
        <SidebarCollapseButton
          collapsed={false}
          onClick={onClose}     // Đóng overlay thay vì collapse
        />
      </div>
    </>
  )
}

export default MobileSidebarOverlay
