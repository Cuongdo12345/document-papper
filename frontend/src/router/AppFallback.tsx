// src/router/AppFallback.tsx
//
// Fallback UI cho Suspense khi lazy() page đang load bundle.
// Component phát sinh khi build router/index.tsx — chưa được xác nhận trong
// LAYOUT_IMPLEMENTATION_SUMMARY.md (tài liệu không mô tả loading fallback cho
// route-level Suspense), nên thiết kế tối giản nhất: Spin căn giữa toàn màn
// hình, không phụ thuộc Layout nào (vì fallback render TRƯỚC khi Layout kịp
// mount — không thể biết sẽ là AuthLayout/MainLayout/MinimalLayout).

import { Spin } from 'antd';

export function AppFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Spin size="large" />
    </div>
  );
}

export default AppFallback;
