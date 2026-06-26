import React from 'react'
import {
  DashboardOutlined,
  FileTextOutlined,
  FileDoneOutlined,
  ApartmentOutlined,
  TeamOutlined,
  UserOutlined,
  SafetyOutlined,
  KeyOutlined,
  AuditOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'IT' | 'USER'

export interface MenuItemConfig {
  key: string        // Unique — dùng cho AntD Menu selectedKeys
  label: string      // Text hiển thị
  icon: React.ReactNode
  path: string       // Route path — navigate + active match
  roles?: Role[]     // undefined = tất cả authenticated users
}

export interface MenuGroupConfig {
  groupKey: string   // Unique group key cho AntD Menu ItemGroup
  groupLabel: string
  roles?: Role[]     // Ẩn toàn bộ group nếu user không đủ role
  items: MenuItemConfig[]
}

// ─── Menu Config ──────────────────────────────────────────────────────────────
// Nguồn: LAYOUT_ARCHITECTURE.md §3.2
// Thứ tự group = thứ tự hiển thị trong Sidebar

export const MENU_GROUPS: MenuGroupConfig[] = [
  {
    groupKey: 'overview',
    groupLabel: 'Tổng quan',
    roles: ['ADMIN'],          // Cả group ẩn với IT/USER
    items: [
      {
        key: '/dashboard',
        label: 'Dashboard',
        icon: React.createElement(DashboardOutlined),
        path: '/dashboard',
        roles: ['ADMIN'],
      },
    ],
  },

  {
    groupKey: 'documents',
    groupLabel: 'Tài liệu',
    items: [
      {
        key: '/documents/proposals',
        label: 'Đề xuất',
        icon: React.createElement(FileTextOutlined),
        path: '/documents/proposals',
        // undefined = tất cả auth users
      },
      {
        key: '/documents/reports',
        label: 'Biên bản',
        icon: React.createElement(FileDoneOutlined),
        path: '/documents/reports',
      },
    ],
  },

  {
    groupKey: 'workflow',
    groupLabel: 'Quy trình',
    items: [
      {
        key: '/workflow',
        label: 'Quy trình duyệt',
        icon: React.createElement(NodeIndexOutlined),
        path: '/workflow',
      },
    ],
  },

  {
    groupKey: 'management',
    groupLabel: 'Quản lý',
    items: [
      {
        key: '/departments',
        label: 'Phòng ban',
        icon: React.createElement(ApartmentOutlined),
        path: '/departments',
        roles: ['ADMIN', 'IT'],
      },
      {
        key: '/users',
        label: 'Người dùng',
        icon: React.createElement(UserOutlined),
        path: '/users',
        roles: ['ADMIN'],
      },
    ],
  },

  {
    groupKey: 'rbac',
    groupLabel: 'Phân quyền',
    roles: ['ADMIN'],          // Toàn bộ group chỉ ADMIN
    items: [
      {
        key: '/rbac/roles',
        label: 'Vai trò',
        icon: React.createElement(TeamOutlined),
        path: '/rbac/roles',
        roles: ['ADMIN'],
      },
      {
        key: '/rbac/permissions',
        label: 'Quyền hạn',
        icon: React.createElement(KeyOutlined),
        path: '/rbac/permissions',
        roles: ['ADMIN'],
      },
      {
        key: '/rbac/policies',
        label: 'Chính sách',
        icon: React.createElement(SafetyOutlined),
        path: '/rbac/policies',
        roles: ['ADMIN'],
      },
    ],
  },

  {
    groupKey: 'system',
    groupLabel: 'Hệ thống',
    items: [
      {
        key: '/audit',
        label: 'Nhật ký',
        icon: React.createElement(AuditOutlined),
        path: '/audit',
        roles: ['ADMIN', 'IT'],
      },
      {
        key: '/audit/dashboard',
        label: 'Thống kê nhật ký',
        icon: React.createElement(BarChartOutlined),
        path: '/audit/dashboard',
        roles: ['ADMIN'],
      },
      {
        key: '/system/performance',
        label: 'Hiệu suất API',
        icon: React.createElement(ThunderboltOutlined),
        path: '/system/performance',
        roles: ['ADMIN'],
      },
    ],
  },
]

// ─── Active Key Resolver ──────────────────────────────────────────────────────
// Tìm menu item key tương ứng với pathname hiện tại.
// Ưu tiên match dài nhất để /audit/dashboard không match /audit.
//
// Ví dụ:
//   /documents/proposals/abc123 → key '/documents/proposals'
//   /audit/dashboard            → key '/audit/dashboard' (không phải '/audit')

export function resolveActiveKey(pathname: string): string {
  const allItems = MENU_GROUPS.flatMap(g => g.items)

  // Sắp xếp theo độ dài path giảm dần — match dài nhất trước
  const sorted = [...allItems].sort((a, b) => b.path.length - a.path.length)

  const matched = sorted.find(item => {
    if (item.path === '/') return pathname === '/'
    return pathname === item.path || pathname.startsWith(item.path + '/')
  })

  return matched?.key ?? pathname
}

// ─── Open Group Resolver ──────────────────────────────────────────────────────
// Tìm groupKey của group chứa active item.
// Dùng để khởi tạo openKeys khi mount SidebarMenu.

export function resolveOpenGroupKey(pathname: string): string | null {
  const activeKey = resolveActiveKey(pathname)

  for (const group of MENU_GROUPS) {
    if (group.items.some(item => item.key === activeKey)) {
      return group.groupKey
    }
  }
  return null
}
