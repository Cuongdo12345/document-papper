import { Menu } from 'antd'
import type { MenuProps } from 'antd'
import type { FC } from 'react'
import { useMemo, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  MENU_GROUPS,
  resolveActiveKey,
  resolveOpenGroupKey,
  type Role,
} from './menu.config'

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION FILTER LOGIC
// Nguồn: LAYOUT_ARCHITECTURE.md §3.6
//
// Item hiển thị khi:
//   item.roles === undefined  → luôn (auth only)
//   isAdmin                   → bypass tất cả
//   item.roles.includes(role) → hiện
// ─────────────────────────────────────────────────────────────────────────────

function canShowItem(itemRoles: Role[] | undefined, isAdmin: boolean, roleName: Role | null): boolean {
  if (!roleName) return false           // Chưa auth — không hiển thị
  if (isAdmin) return true              // ADMIN bypass
  if (!itemRoles) return true           // undefined = tất cả auth
  return itemRoles.includes(roleName)
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD AntD MENU ITEMS
// Lọc theo role rồi convert sang MenuProps['items'] format
// ─────────────────────────────────────────────────────────────────────────────

function buildMenuItems(
  isAdmin: boolean,
  roleName: Role | null,
): MenuProps['items'] {
  const result: MenuProps['items'] = []

  for (const group of MENU_GROUPS) {
    // Kiểm tra group-level role: ẩn toàn bộ group nếu không đủ quyền
    if (!canShowItem(group.roles, isAdmin, roleName)) continue

    // Lọc items trong group
    const visibleItems = group.items.filter(item =>
      canShowItem(item.roles, isAdmin, roleName),
    )

    if (visibleItems.length === 0) continue

    // AntD Menu ItemGroup type
    result.push({
      type: 'group',
      key: group.groupKey,
      label: group.groupLabel,
      children: visibleItems.map(item => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
      })),
    })
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR MENU
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarMenuProps {
  collapsed: boolean
  isAdmin: boolean
  roleName: Role | null
}

const SidebarMenu: FC<SidebarMenuProps> = ({ collapsed, isAdmin, roleName }) => {
  const location  = useLocation()
  const navigate  = useNavigate()

  // ── Active key ─────────────────────────────────────────────────────────────
  const activeKey = useMemo(
    () => resolveActiveKey(location.pathname),
    [location.pathname],
  )

  // ── Open group keys ────────────────────────────────────────────────────────
  // Tự động mở group của active item khi mount hoặc navigate
  // Không persist — mỗi lần navigate group tương ứng tự mở
  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    const groupKey = resolveOpenGroupKey(location.pathname)
    return groupKey ? [groupKey] : []
  })

  // Sync openKeys khi pathname thay đổi (navigate đến route khác group)
  useEffect(() => {
    const groupKey = resolveOpenGroupKey(location.pathname)
    if (groupKey) setOpenKeys([groupKey])
  }, [location.pathname])

  // ── Menu items — memo để tránh rebuild khi pathname thay đổi ───────────────
  const items = useMemo(
    () => buildMenuItems(isAdmin, roleName),
    [isAdmin, roleName],
  )

  // ── Click handler ──────────────────────────────────────────────────────────
  const handleSelect: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  // Khi collapsed: AntD Menu tự handle tooltip và ẩn openKeys
  return (
    <Menu
      mode="inline"
      theme="dark"
      items={items}
      selectedKeys={[activeKey]}
      openKeys={collapsed ? [] : openKeys}
      onOpenChange={keys => setOpenKeys(keys as string[])}
      onClick={handleSelect}
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        border: 'none',
        // Tắt AntD inline padding mặc định
        paddingTop: 8,
      }}
      // Hiển thị tooltip khi hover item trong collapsed mode (AntD built-in)
      inlineCollapsed={collapsed}
    />
  )
}

export default SidebarMenu
