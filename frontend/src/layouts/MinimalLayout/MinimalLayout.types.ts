// src/layouts/MinimalLayout/MinimalLayout.types.ts
//
// MinimalLayout dùng cho 2 trường hợp khác nhau (LAYOUT_IMPLEMENTATION_SUMMARY.md §2.5):
//   1. Route-based: /403 (SCR-30), * (SCR-29) — render qua <Outlet />, page tự
//      truyền content qua children hoặc MinimalLayout tự nhận props khi dùng
//      trực tiếp làm page (không cần page con riêng).
//   2. ErrorBoundary: không có route/Outlet — cần truyền props trực tiếp.
//
// Vì tài liệu không chỉ định 404/403 có page riêng tách khỏi layout hay
// MinimalLayout tự kiêm luôn nội dung lỗi, thiết kế dưới đây cho phép CẢ HAI:
//   - Dùng <MinimalLayout> không props → render <Outlet /> (page con tự quyết nội dung)
//   - Dùng <MinimalLayout icon={...} title="..." .../> → tự render nội dung, bỏ qua Outlet

import type { ReactNode } from 'react';

export interface MinimalLayoutProps {
  /** Icon lớn hiển thị phía trên title — vd: <ExclamationCircleOutlined /> */
  icon?: ReactNode;
  /** Tiêu đề lỗi — vd: "404", "403" */
  title?: ReactNode;
  /** Mô tả phụ dưới title */
  description?: ReactNode;
  /** Action buttons (thường 1-2 nút: "Về trang chủ", "Quay lại") */
  actions?: ReactNode;
  /**
   * Nếu truyền — MinimalLayout tự render nội dung từ props trên, KHÔNG render <Outlet />.
   * Dùng cho ErrorBoundary (không có route con).
   * Nếu không truyền (undefined) — render <Outlet /> như AuthLayout, để page con
   * (NotFoundPage/ForbiddenPage) tự quyết định nội dung.
   */
  children?: ReactNode;
}
