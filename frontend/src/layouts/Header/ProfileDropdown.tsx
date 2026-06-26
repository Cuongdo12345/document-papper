import {
  DownOutlined as ChevronDownOutlined,
  KeyOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar, Divider, Dropdown, Flex, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'

const { Text } = Typography

// ─── Avatar helpers ───────────────────────────────────────────────────────────

// 2 chữ cái đầu của fullName (uppercase)
// "Nguyễn Văn An" → "NA"
function getAvatarInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  // Lấy chữ đầu của từ đầu và từ cuối
  const first = words[0][0] ?? ''
  const last  = words[words.length - 1][0] ?? ''
  return (first + last).toUpperCase()
}

// Hash userId → màu cố định, nhất quán per user
// Trả 1 trong 8 màu sắc từ palette
function getAvatarColor(userId: string): string {
  const colors = [
    '#1677ff', // blue
    '#722ed1', // purple
    '#13c2c2', // cyan
    '#52c41a', // green
    '#fa8c16', // orange
    '#eb2f96', // pink
    '#faad14', // gold
    '#f5222d', // red
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// ─── StatusBadge inline cho role trong dropdown ────────────────────────────
// Không import StatusBadge component để tránh circular dep với shared/
// Dùng inline Tag thay thế

function RoleTag({ roleName }: { roleName: string }) {
  const colorMap: Record<string, string> = {
    ADMIN: '#722ed1',
    IT:    '#1677ff',
    USER:  '#8c8c8c',
  }
  const color = colorMap[roleName] ?? '#8c8c8c'
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: 4,
        border: `1px solid ${color}`,
        color,
        fontSize: 11,
        lineHeight: '18px',
        fontWeight: 500,
      }}
    >
      {roleName}
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileDropdownProps {
  user: {
    _id: string
    fullName: string
    username: string
    role: { name: string }
    department?: { name: string }
  }
  refreshToken: string | null
  onLogout: () => void  // Gọi auth.store.logout() + navigate('/login')
}

// ─── Component ────────────────────────────────────────────────────────────────

const ProfileDropdown: FC<ProfileDropdownProps> = ({
  user,
  refreshToken,
  onLogout,
}) => {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()

  // ── Avatar ────────────────────────────────────────────────────────────────
  const initials    = getAvatarInitials(user.fullName)
  const avatarColor = getAvatarColor(user._id)

  // ── Logout flow ───────────────────────────────────────────────────────────
  // Nguồn: LAYOUT_ARCHITECTURE.md §4.3
  // 1. POST /api/auths/logout (graceful — kể cả fail cũng tiếp tục)
  // 2. auth.store.logout()
  // 3. queryClient.clear()
  // 4. navigate('/login')
  const handleLogout = async () => {
    try {
      await fetch('/api/auths/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
    } catch {
      // Graceful — không block logout dù API fail
    } finally {
      queryClient.clear()
      onLogout()
      navigate('/login', { replace: true })
    }
  }

  // ── Dropdown header — non-clickable user info ─────────────────────────────
  const dropdownHeader = (
    <div style={{ padding: '12px 16px', minWidth: 200 }}>
      <Flex align="center" gap={10}>
        <Avatar
          size={36}
          style={{ background: avatarColor, flexShrink: 0 }}
        >
          {initials}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ display: 'block', fontSize: 13 }}>
            {user.fullName}
          </Text>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            @{user.username}
          </Text>
          <Flex gap={4} align="center" style={{ marginTop: 4 }}>
            <RoleTag roleName={user.role.name} />
            {user.department && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {user.department.name}
              </Text>
            )}
          </Flex>
        </div>
      </Flex>
    </div>
  )

  // ── Dropdown menu items ───────────────────────────────────────────────────
  const items: MenuProps['items'] = [
    // Non-clickable header
    {
      key: 'user-info',
      label: dropdownHeader,
      disabled: true,
      style: { cursor: 'default', padding: 0 },
    },
    { type: 'divider' },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ cá nhân',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'change-password',
      icon: <KeyOutlined />,
      label: 'Đổi mật khẩu',
      onClick: () => navigate('/profile/change-password'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: handleLogout,
    },
  ]

  return (
    <Dropdown
      menu={{ items }}
      trigger={['click']}
      placement="bottomRight"
      arrow={{ pointAtCenter: true }}
    >
      {/* Trigger: Avatar + fullName + ChevronDown */}
      <Space
        style={{ cursor: 'pointer', userSelect: 'none' }}
        align="center"
        size={8}
        role="button"
        tabIndex={0}
        aria-label="Tài khoản của tôi"
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.click()}
      >
        <Avatar
          size={32}
          style={{ background: avatarColor, flexShrink: 0 }}
        >
          {initials}
        </Avatar>
        <Text style={{ fontSize: 13, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.fullName}
        </Text>
        <ChevronDownOutlined style={{ fontSize: 11, color: '#8c8c8c' }} />
      </Space>
    </Dropdown>
  )
}

export default ProfileDropdown
