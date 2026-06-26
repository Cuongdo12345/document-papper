import { Layout } from 'antd'
import type { FC } from 'react'
import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar/Sidebar'
import Header from '../Header/Header'
import GlobalToastConsumer from './GlobalToastConsumer'
import MobileSidebarOverlay from './MobileSidebarOverlay'
import type { Role } from '../Sidebar/menu.config'

// ─── Store thực — đã thay stub ────────────────────────────────────────────────
import { useAuthStore } from '../../store/auth.store'
import { useUIStore } from '../../store/ui.store'

// ─── Responsive hook ──────────────────────────────────────────────────────────
// Detect mobile viewport (< 768px)
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )

  // ResizeObserver để reactive
  useState(() => {
    if (typeof window === 'undefined') return
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  })

  return isMobile
}

// ─── Content Area Loading Skeleton ────────────────────────────────────────────
// Suspense fallback khi lazy page đang load
// Nguồn: LAYOUT_ARCHITECTURE.md §9.2 Cấp 2
function PageLoadingSkeleton() {
  return (
    <div
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
      aria-label="Đang tải trang..."
    >
      {/* Simulate AppPageHeader skeleton */}
      <div style={{ height: 32, background: '#f0f0f0', borderRadius: 4, width: '30%' }} />
      {/* Simulate table skeleton */}
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} style={{ height: 48, background: '#f5f5f5', borderRadius: 4 }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LAYOUT
// Nguồn: LAYOUT_ARCHITECTURE.md §2
//
// Cấu trúc:
//   Viewport 100vw × 100vh
//   └── AntD Layout (flex row)
//       ├── Sidebar [desktop ≥ 768px]
//       └── AntD Layout (flex column)
//           ├── Header (sticky top)
//           └── Content Area (overflow-y: auto, padding: 24px)
//               └── <Outlet />
//
// Mobile (< 768px):
//   Sidebar ẩn → MobileSidebarOverlay khi click hamburger
// ─────────────────────────────────────────────────────────────────────────────

const MainLayout: FC = () => {
  // ── State — đọc từ Zustand store thật ────────────────────────────────────
  const user = useAuthStore((s) => s.user)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const logout = useAuthStore((s) => s.logout)

  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  const isMobile = useIsMobile()

  // Mobile sidebar overlay state — không persist
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // ── Derived ───────────────────────────────────────────────────────────────
  const roleName = (user?.role?.name ?? null) as Role | null
  const isAdmin  = roleName === 'ADMIN'

  // ── Content padding — responsive ──────────────────────────────────────────
  // Desktop: 24px, Mobile: 16px
  // Nguồn: LAYOUT_ARCHITECTURE.md §8.2
  const contentPadding = isMobile ? 16 : 24

  // ── Null guard — không bao giờ render nếu user chưa load ─────────────────
  // PrivateRoute đã đảm bảo user tồn tại trước khi MainLayout mount.
  // Nếu vẫn null tại đây (race condition hiếm) → return null tạm thời,
  // PrivateRoute sẽ redirect /login ở lần re-render kế tiếp.
  if (!user) return null

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>

      {/* ── Sidebar — chỉ hiển thị desktop ≥ 768px ─────────────────────── */}
      {!isMobile && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          isAdmin={isAdmin}
          roleName={roleName}
        />
      )}

      {/* ── Mobile Sidebar Overlay ──────────────────────────────────────── */}
      {isMobile && (
        <MobileSidebarOverlay
          open={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
          isAdmin={isAdmin}
          roleName={roleName}
        />
      )}

      {/* ── Right side: Header + Content ────────────────────────────────── */}
      <Layout
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >

        {/* GlobalToastConsumer — bridge notification.store → AntD message */}
        <GlobalToastConsumer />

        {/* ── Header ──────────────────────────────────────────────────── */}
        <Header
          user={user}
          refreshToken={refreshToken}
          onLogout={logout}
          // Mobile: truyền hamburger control
          isMobileOpen={isMobile ? isMobileOpen : undefined}
          onMobileToggle={isMobile ? () => setIsMobileOpen(v => !v) : undefined}
        />

        {/* ── Content Area ────────────────────────────────────────────── */}
        {/* flex: 1 + overflow-y: auto để chỉ content scroll */}
        {/* Header và Sidebar sticky — không scroll */}
        <Layout.Content
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: contentPadding,
            background: 'var(--ant-color-bg-layout, #f5f5f5)',
          }}
        >
          {/* Suspense wraps Outlet — catch lazy page loading */}
          <Suspense fallback={<PageLoadingSkeleton />}>
            {/* ── Route Outlet ── */}
            {/* Pages render here:
                - AppPageHeader (breadcrumb + title + actions)
                - FilterBar? (list pages)
                - DataTable / Form / Detail view
                - Feature Modals/Drawers (mount cuối page JSX) */}
            <Outlet />
          </Suspense>
        </Layout.Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout