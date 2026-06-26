/**
 * AuthLayout.tsx
 * Layout bao bọc 3 màn hình xác thực: SCR-01, SCR-02, SCR-03.
 *
 * Cấu trúc theo LAYOUT_ARCHITECTURE.md §1.2:
 *   100vw × 100vh background (colorBgLayout)
 *   └── Flex center
 *       └── Card 420px
 *           ├── Logo block
 *           └── <Outlet /> (LoginPage | ForgotPasswordPage | ResetPasswordPage)
 *
 * Chỉ dùng Shared Components đã có:
 *   - AntD (Card, Typography, theme.useToken) — core lib, không phải custom component
 *   - react-router-dom Outlet
 *
 * KHÔNG dùng:
 *   - Sidebar, Header, AppPageHeader, FilterBar
 *   - GlobalToastProvider (đã mount ở App.tsx root)
 *   - Bất kỳ custom component mới nào
 */

import type { FC } from 'react'
import { Outlet } from 'react-router-dom'
import { Card, Flex, Typography, theme } from 'antd'
import type { AuthLayoutProps } from './AuthLayout.types'
import { AUTH_LAYOUT_CONSTANTS } from './AuthLayout.types'
import styles from './AuthLayout.module.css'

const { Title, Text } = Typography

// ─────────────────────────────────────────────────────────────────────────────
// Logo Block
// Render logo image (nếu có) + systemName + systemDescription.
// Luôn căn giữa theo LAYOUT_ARCHITECTURE §1.2.
// ─────────────────────────────────────────────────────────────────────────────

interface LogoBlockProps {
  systemName: string
  systemDescription?: string
  logo?: AuthLayoutProps['logo']
}

const LogoBlock: FC<LogoBlockProps> = ({ systemName, systemDescription, logo }) => (
  <Flex
    vertical
    align="center"
    style={{ marginBottom: AUTH_LAYOUT_CONSTANTS.LOGO_MARGIN_BOTTOM }}
    data-testid="auth-logo-block"
  >
    {/* Logo image — render khi có src */}
    {logo?.src && (
      <img
        src={logo.src}
        alt={logo.alt ?? 'Logo'}
        width={logo.width ?? AUTH_LAYOUT_CONSTANTS.LOGO_DEFAULT_WIDTH}
        height={logo.height ?? AUTH_LAYOUT_CONSTANTS.LOGO_DEFAULT_HEIGHT}
        className={styles.logoImage}
      />
    )}

    {/* Tên hệ thống */}
    <Title
      level={3}
      style={{
        margin: logo?.src ? '12px 0 0' : 0,
        textAlign: 'center',
        lineHeight: 1.3,
      }}
    >
      {systemName}
    </Title>

    {/* Mô tả ngắn (optional) */}
    {systemDescription && (
      <Text
        type="secondary"
        style={{
          fontSize: 13,
          marginTop: 4,
          textAlign: 'center',
          display: 'block',
        }}
      >
        {systemDescription}
      </Text>
    )}
  </Flex>
)

// ─────────────────────────────────────────────────────────────────────────────
// AuthLayout
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AuthLayout
 *
 * Public layout — không cần đăng nhập.
 * Render <Outlet /> bên trong Card căn giữa màn hình.
 *
 * Routes sử dụng:
 *   /login                → LoginPage (SCR-01)
 *   /forgot-password      → ForgotPasswordPage (SCR-02)
 *   /reset-password       → ResetPasswordPage (SCR-03)
 *
 * Route protection:
 *   AuthRoute guard bọc bên ngoài (trong router/index.tsx).
 *   AuthLayout KHÔNG tự kiểm tra auth — đó là trách nhiệm của AuthRoute.
 *
 * Responsive (LAYOUT_ARCHITECTURE §8.2):
 *   ≥ 480px: Card max-width 420px, padding 32px, centered
 *   < 480px: Card full-width, padding 20px, no box shadow
 *
 * @example
 * // router/index.tsx
 * {
 *   path: '/',
 *   element: <AuthRoute><AuthLayout /></AuthRoute>,
 *   children: [
 *     { path: 'login', element: <LoginPage /> },
 *     { path: 'forgot-password', element: <ForgotPasswordPage /> },
 *     { path: 'reset-password', element: <ResetPasswordPage /> },
 *   ]
 * }
 */
const AuthLayout: FC<AuthLayoutProps> = ({
  systemName = 'Quản lý Văn bản',
  systemDescription,
  logo,
  footerText,
  'data-testid': testId,
}) => {
  // ── AntD theme tokens ────────────────────────────────────────────────────
  // Dùng token thay vì hardcode màu — nhất quán với design system
  const { token } = theme.useToken()

  return (
    // ── Outer wrapper ─────────────────────────────────────────────────────
    // 100vw × 100vh, background = colorBgLayout (xám nhạt từ AntD theme)
    <div
      className={styles.wrapper}
      style={{ background: token.colorBgLayout }}
      data-testid={testId ?? 'auth-layout'}
    >
      {/* ── Flex center container ─────────────────────────────────────── */}
      {/* Vertical flex để footer có thể push xuống đáy nếu cần */}
      <Flex
        vertical
        align="center"
        justify="center"
        className={styles.centerFlex}
      >
        {/* ── Card chứa form ────────────────────────────────────────── */}
        {/*
          max-width: 420px (AUTH_LAYOUT_CONSTANTS.CARD_MAX_WIDTH)
          padding: 32px (CSS module override AntD Card padding)
          borderRadius: token.borderRadiusLG = 8px (theo FE-01 §6.1)
          boxShadow: AntD Card default shadow
        */}
        <Card
          className={styles.card}
          styles={{
            body: {
              padding: AUTH_LAYOUT_CONSTANTS.CARD_PADDING,
            },
          }}
          bordered={false}
          style={{ borderRadius: token.borderRadiusLG }}
          data-testid="auth-card"
        >
          {/* Logo + System name */}
          <LogoBlock
            systemName={systemName}
            systemDescription={systemDescription}
            logo={logo}
          />

          {/* Page content — LoginPage / ForgotPassword / ResetPassword */}
          <Outlet />
        </Card>

        {/* ── Footer text (optional) ────────────────────────────────── */}
        {footerText && (
          <Text
            type="secondary"
            className={styles.footerText}
          >
            {footerText}
          </Text>
        )}
      </Flex>
    </div>
  )
}

export default AuthLayout
