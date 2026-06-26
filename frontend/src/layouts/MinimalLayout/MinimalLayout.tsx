// src/layouts/MinimalLayout/MinimalLayout.tsx
//
// Nguồn: LAYOUT_IMPLEMENTATION_SUMMARY.md §2.5, §3.1 (route tree), §4.1-§4.3
// (Route Integration), §11 (Reuse Rules — "Dùng MinimalLayout cho error pages"),
// §13 (FE-06 Completion Status — component cuối còn thiếu).
//
// Structure: 100vh → Flex center → Error content (icon + title + desc + actions)
// Không có Sidebar, Header, AppPageHeader — tối giản hoàn toàn (đúng nguyên tắc
// "Layout không gọi API" — §1 nguyên tắc cốt lõi #1).
//
// Dùng cho: SCR-29 (404 NotFound) · SCR-30 (403 Forbidden) · ErrorBoundary.
// Route /403 và * KHÔNG có guard (§4.1 bảng UTILITY — "Không có guard").

import { Typography } from 'antd';
import { Outlet } from 'react-router-dom';
import type { MinimalLayoutProps } from './MinimalLayout.types';
import styles from './MinimalLayout.module.css';

const { Title, Text } = Typography;

export function MinimalLayout({ icon, title, description, actions, children }: MinimalLayoutProps) {
  // Nếu không truyền bất kỳ prop nội dung nào → đây là cách dùng route-based
  // (giống AuthLayout) — render <Outlet /> để page con (NotFoundPage/ForbiddenPage)
  // tự quyết định icon/title/description/actions.
  const hasOwnContent = icon || title || description || actions || children;

  if (!hasOwnContent) {
    return (
      <div className={styles.wrapper}>
        <Outlet />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        {children ?? (
          <>
            {icon && <div className={styles.icon}>{icon}</div>}
            {title && (
              <Title level={2} className={styles.title}>
                {title}
              </Title>
            )}
            {description && <Text className={styles.description}>{description}</Text>}
            {actions && <div className={styles.actions}>{actions}</div>}
          </>
        )}
      </div>
    </div>
  );
}

export default MinimalLayout;
