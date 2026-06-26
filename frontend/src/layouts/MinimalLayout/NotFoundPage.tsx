// src/pages/errors/NotFoundPage.tsx
//
// SCR-29 — route `*` (catch-all). Render qua MinimalLayout <Outlet />
// (LAYOUT_IMPLEMENTATION_SUMMARY.md §4.2: "* | SCR-29 NotFoundPage | MinimalLayout | —").
//
// Không có guard (§4.1 bảng UTILITY). "Về trang chủ" điều hướng theo
// usePermission().homeRoute — nhất quán với redirect logic toàn hệ thống
// (ADMIN → /dashboard, IT/USER → /documents/proposals, chưa login → /login).

import { useNavigate } from 'react-router-dom';
import { FrownOutlined } from '@ant-design/icons';
import { AppButton } from '../../components/common/AppButton';
import { usePermission } from '../../hooks/usePermission/usePermission';
import { MinimalLayout } from '../../layouts/MinimalLayout';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { homeRoute } = usePermission();

  return (
    <MinimalLayout
      icon={<FrownOutlined />}
      title="404"
      description="Trang bạn tìm không tồn tại hoặc đã bị di chuyển."
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

export default NotFoundPage;
