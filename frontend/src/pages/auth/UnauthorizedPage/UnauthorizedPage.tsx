// src/pages/auth/UnauthorizedPage/UnauthorizedPage.tsx
//
// SCR-30 — /403
// Layout: MinimalLayout (không có Sidebar, không có Header)
// Guard: Không có guard — render trực tiếp
// Trigger: PrivateRoute redirect khi user đã đăng nhập nhưng sai role
//
// AUTH_UI_SPEC.md §4 · AUTH_MODULE_ANALYSIS.md §8.3

import { useNavigate } from 'react-router-dom';
import { Result, Space, Typography, Flex } from 'antd';
import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons';

import { AppButton } from '../../../components/common/AppButton/AppButton';
import StatusBadge from '../../../components/data-display/StatusBadge';
import { usePermission } from '../../../hooks/usePermission/usePermission';

import styles from './UnauthorizedPage.module.css';

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const { isAuthenticated, roleName, homeRoute } = usePermission();

  // ── Sub-title động theo trạng thái auth ────────────────────────────────────
  // AUTH_UI_SPEC.md §4.2
  const subTitle = isAuthenticated
    ? 'Bạn không có quyền vào trang này. Vui lòng liên hệ quản trị viên nếu cần trợ giúp.'
    : 'Vui lòng đăng nhập để truy cập.';

  return (
    // MinimalLayout — Flex center × center toàn viewport
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* ── AntD Result 403 ───────────────────────────────────────────── */}
        <Result
          status="403"
          title="403"
          subTitle={subTitle}
          extra={
            <Space
              direction="horizontal"
              size="middle"
              className={styles.actions}
            >
              {/* Nút "Quay lại" — navigate(-1) */}
              <AppButton
                variant="secondary"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
              >
                Quay lại
              </AppButton>

              {/* Nút "Về trang chủ" — navigate theo role */}
              <AppButton
                variant="primary"
                icon={<HomeOutlined />}
                onClick={() => navigate(homeRoute)}
              >
                Về trang chủ
              </AppButton>
            </Space>
          }
        />

        {/* ── Role badge — hiện khi đã đăng nhập ───────────────────────── */}
        {/* AUTH_UI_SPEC.md §4.2 */}
        {isAuthenticated && roleName && (
          <Flex
            align="center"
            justify="center"
            gap={8}
            className={styles.roleBadge}
          >
            <Text type="secondary">Vai trò hiện tại:</Text>
            <StatusBadge
              type="role"
              value={roleName}
              size="default"
            />
          </Flex>
        )}
      </div>
    </div>
  );
}
