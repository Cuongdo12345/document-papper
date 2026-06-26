// src/pages/errors/ForbiddenPage.tsx
//
// SCR-30 — route `/403`. Render qua MinimalLayout <Outlet />
// (LAYOUT_IMPLEMENTATION_SUMMARY.md §4.2: "/403 | SCR-30 ForbiddenPage | MinimalLayout | —").
//
// Đích đến thực tế của PrivateRoute khi hasRole(allowedRoles) === false
// (§4.3 Guard Decision Flow: "❌ → Navigate /403"). Không có guard riêng cho
// chính route /403 (§4.1 bảng UTILITY).

import { useNavigate } from 'react-router-dom';
import { LockOutlined } from '@ant-design/icons';
import { AppButton } from '../../components/common/AppButton';
import { usePermission } from '../../hooks/usePermission/usePermission';
import { MinimalLayout } from '../../layouts/MinimalLayout';

export function ForbiddenPage() {
  const navigate = useNavigate();
  const { homeRoute } = usePermission();

  return (
    <MinimalLayout
      icon={<LockOutlined />}
      title="403"
      description="Bạn không có quyền truy cập trang này."
      actions={
        <>
          <AppButton variant="secondary" onClick={() => navigate(-1)}>
            Quay lại
          </AppButton>
          <AppButton variant="primary" onClick={() => navigate(homeRoute)}>
            Về trang chủ
          </AppButton>
        </>
      }
    />
  );
}

export default ForbiddenPage;
