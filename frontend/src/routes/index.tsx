import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { PublicRoute } from "@/routes/PublicRoute";
import { RootRedirect } from "@/routes/RootRedirect";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { UsersListPage } from "@/features/users/pages/UsersListPage";
import { SessionsMonitorPage } from "@/features/users/pages/SessionsMonitorPage";
import { DepartmentsListPage } from "@/features/departments/pages/DepartmentsListPage";
import { RolesListPage } from "@/features/rbac/pages/RolesListPage";
import { RoleDetailPage } from "@/features/rbac/pages/RoleDetailPage";
import { PermissionsListPage } from "@/features/rbac/pages/PermissionsListPage";
import { PoliciesListPage } from "@/features/rbac/pages/PoliciesListPage";
import { DocumentsListPage } from "@/features/documents/pages/DocumentsListPage";
import { DocumentCreatePage } from "@/features/documents/pages/DocumentCreatePage";
import { DocumentDetailPage } from "@/features/documents/pages/DocumentDetailPage";
import { PendingApprovalsPage } from "@/features/documents/pages/PendingApprovalsPage";
import { AssetsListPage } from "@/features/assets/pages/AssetsListPage";
import { AssetCreatePage } from "@/features/assets/pages/AssetCreatePage";
import { AssetDetailPage } from "@/features/assets/pages/AssetDetailPage";
import { AssetCategoriesListPage } from "@/features/assets/pages/AssetCategoriesListPage";
import { AssetScanPage } from "@/features/assets/pages/AssetScanPage";
import { MaintenanceCalendarPage } from "@/features/assets/pages/MaintenanceCalendarPage";
import { ConsumablesListPage } from "@/features/inventory/pages/ConsumablesListPage";
import { ConsumableDetailPage } from "@/features/inventory/pages/ConsumableDetailPage";
import { ConsumableCategoriesListPage } from "@/features/inventory/pages/ConsumableCategoriesListPage";
import { ConsumableRequestsListPage } from "@/features/inventory/pages/ConsumableRequestsListPage";
import { VendorsListPage } from "@/features/vendors/pages/VendorsListPage";
import { VendorDetailPage } from "@/features/vendors/pages/VendorDetailPage";
import { ContractsListPage } from "@/features/vendors/pages/ContractsListPage";
import { ContractDetailPage } from "@/features/vendors/pages/ContractDetailPage";
import { AuditLogsPage } from "@/features/audit/pages/AuditLogsPage";
import { NotificationsPage } from "@/features/notifications/pages/NotificationsPage";
import { ProfilePage } from "@/features/profile/pages/ProfilePage";
import { FilesListPage } from "@/features/files/pages/FilesListPage";
import { ForbiddenPage } from "@/pages/ForbiddenPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PERMISSIONS } from "@/constants/permissions";

/**
 * Route foundation (FE-01 Mục 33) — `/app/*` là namespace bảo vệ chính.
 * FE-03: `users`/`departments` đã thay `PlaceholderPage` bằng trang thật
 * (`UsersListPage`/`DepartmentsListPage`) — cấu trúc route/layout GIỮ NGUYÊN
 * như thiết kế gốc (ROUTE_PERMISSION_MAP.md). FE-04: `documents` đã thay
 * bằng 3 route thật (list/create/detail, đúng `ROUTE_PERMISSION_MAP.md`).
 * FE-08: `rbac/{roles,roles/:id,permissions,policies}` đã thay bằng trang
 * thật (RBAC Admin — Roles/Permissions/Policies CRUD + permission matrix).
 * FE-10: `assets/categories` — CRUD danh mục tài sản. FE-11: `audit-logs`
 * đã thay `PlaceholderPage` bằng trang thật (Nhật ký + Thống kê). FE-12:
 * `notifications` MỚI THÊM (self-scoped, không permission riêng) + chuông
 * thông báo thật ở `Header.tsx` (`NotificationBell`).
 */
export const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },

  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
          { path: "/reset-password", element: <ResetPasswordPage /> },
        ],
      },
    ],
  },

  {
    path: "/app",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          // Notifications UI (roadmap Mục 18) — self-scoped (route backend chỉ
          // `authenticate`, không `authorizePermission`, xem `notification.routes.ts`
          // comment gốc), KHÔNG cần permission riêng — cùng nhóm `/app`/`/app/profile`
          // đã ghi chú sẵn ở `ProtectedRoute.tsx`.
          { path: "notifications", element: <NotificationsPage /> },
          // FE-14 (roadmap Mục 19) — Profile UI. Self-scoped (route backend
          // `PATCH /users/me`/`GET /users/me` chỉ `authenticate`) — cùng
          // nhóm không-cần-permission đã ghi ở `ProtectedRoute.tsx`.
          { path: "profile", element: <ProfilePage /> },
          {
            element: <ProtectedRoute permission={PERMISSIONS.DOCUMENT_VIEW} />,
            children: [
              {
                path: "documents",
                children: [
                  { index: true, element: <DocumentsListPage /> },
                  {
                    element: <ProtectedRoute permission={PERMISSIONS.DOCUMENT_CREATE} />,
                    children: [{ path: "create", element: <DocumentCreatePage /> }],
                  },
                  // ⚠️ FIX (2026-09-06, phát hiện khi chuẩn bị FE-05): trước đây route này
                  // gate bằng `DOCUMENT_VIEW_DETAIL` — permission đó đã bị GỠ khỏi RBAC của
                  // 5 role thường (IT/USER/TRUONG_KHOA/DIEU_DUONG_TRUONG/BAN_GIAM_DOC) ở
                  // DEV-009A, chỉ còn cấp qua ABAC Policy theo TỪNG document (department
                  // khớp) — KHÔNG BAO GIỜ xuất hiện trong `user.permissions[]` tĩnh
                  // (`GET /users/me`) của các role đó. Guard tĩnh này vì vậy chặn CỨNG
                  // 100% non-admin khỏi xem BẤT KỲ document nào, kể cả tài liệu cùng khoa
                  // mà backend cho phép (200) — xác nhận qua HTTP thật với tài khoản
                  // `thuykhth`. Bỏ guard permission tĩnh ở đây, giữ nguyên guard
                  // `DOCUMENT_VIEW` của nhóm cha (`documents/`) — backend (RBAC ADMIN
                  // bypass + ABAC department Policy) là ranh giới an toàn thật cho từng
                  // document cụ thể (FE_UI_DEVELOPMENT_ROADMAP.md Mục 5: "Permission UI
                  // chỉ là UX; backend vẫn là security boundary"), 403 từ backend đã được
                  // `DocumentDetailPage` hiển thị gọn qua `ErrorState` sẵn có.
                  { path: ":id", element: <DocumentDetailPage /> },
                ],
              },
            ],
          },
          {
            // FE-05 (roadmap Mục 11) — "Hộp thư chờ duyệt". `WORKFLOW_VIEW` đã
            // cấp cho mọi role có liên quan tới workflow (IT/USER/TRUONG_KHOA/
            // DIEU_DUONG_TRUONG/BAN_GIAM_DOC) — role không bao giờ xuất hiện ở
            // `steps[].role` nào (vd USER) sẽ chỉ luôn thấy EmptyState, không
            // cần permission riêng cho "được duyệt" ở tầng route.
            element: <ProtectedRoute permission={PERMISSIONS.WORKFLOW_VIEW} />,
            children: [{ path: "workflows/pending", element: <PendingApprovalsPage /> }],
          },
          {
            // FE-06 (roadmap Mục 12) — `:id` KHÔNG gate riêng bằng
            // `ASSET_VIEW_DETAIL` (chỉ kế thừa `ASSET_VIEW` của nhóm cha) —
            // cùng bài học DEV-031: mọi role có `ASSET_VIEW` hiện cũng có
            // `ASSET_VIEW_DETAIL` (`rolePermission.map.ts`, không tách ABAC
            // như Document), nhưng tránh lặp lại việc route FE tự gate 1
            // permission riêng có thể lệch RBAC thật ở lần đổi sau.
            element: <ProtectedRoute permission={PERMISSIONS.ASSET_VIEW} />,
            children: [
              {
                path: "assets",
                children: [
                  { index: true, element: <AssetsListPage /> },
                  {
                    element: <ProtectedRoute permission={PERMISSIONS.ASSET_CREATE} />,
                    children: [{ path: "create", element: <AssetCreatePage /> }],
                  },
                  {
                    // Asset Categories UI (roadmap Mục 14) — resource RIÊNG
                    // (`ASSET_CATEGORY_VIEW`, khác `ASSET_VIEW` của nhóm cha
                    // ở trên) — gate tường minh thêm ở đây thay vì chỉ dựa
                    // permission cha, đúng nguyên tắc mỗi resource RBAC Admin
                    // tự gate riêng (cùng cách `rbac/{roles,permissions,policies}`).
                    element: <ProtectedRoute permission={PERMISSIONS.ASSET_CATEGORY_VIEW} />,
                    children: [{ path: "categories", element: <AssetCategoriesListPage /> }],
                  },
                  {
                    // Giai đoạn 5 (roadmap A1) — QR code kiểm kê. Gate RIÊNG
                    // `ASSET_INVENTORY_CHECK` (khác `ASSET_VIEW` của nhóm cha)
                    // — cùng nguyên tắc "categories" ở trên. Đặt trước ":id"
                    // cho dễ đọc (React Router v6 tự ưu tiên path tĩnh hơn
                    // `:id` khi ranking route — khác Express, không bắt buộc
                    // thứ tự khai báo để tránh bị ":id" nuốt mất).
                    element: <ProtectedRoute permission={PERMISSIONS.ASSET_INVENTORY_CHECK} />,
                    children: [{ path: "scan", element: <AssetScanPage /> }],
                  },
                  {
                    // Roadmap B2 (2026-09-15) — Lịch bảo trì chủ động. Gate
                    // RIÊNG `ASSET_MAINTENANCE_PLAN_VIEW`, cùng nguyên tắc
                    // "categories"/"scan" ở trên.
                    element: <ProtectedRoute permission={PERMISSIONS.ASSET_MAINTENANCE_PLAN_VIEW} />,
                    children: [{ path: "maintenance-calendar", element: <MaintenanceCalendarPage /> }],
                  },
                  { path: ":id", element: <AssetDetailPage /> },
                ],
              },
            ],
          },
          {
            // Roadmap B3 (2026-09-15) — Quản lý vật tư tiêu hao, module MỚI
            // hoàn toàn tách biệt với "assets" ở trên (không lồng route con).
            element: <ProtectedRoute permission={PERMISSIONS.CONSUMABLE_VIEW} />,
            children: [
              {
                path: "inventory",
                children: [
                  { index: true, element: <ConsumablesListPage /> },
                  {
                    // Nhóm vật tư (2026-09-16) — resource RIÊNG
                    // (`CONSUMABLE_CATEGORY_VIEW`, khác `CONSUMABLE_VIEW` của
                    // nhóm cha ở trên) — gate tường minh thêm ở đây, cùng
                    // nguyên tắc "categories" của Asset (`asset-categories`).
                    // Đặt TRƯỚC ":id" để React Router không bị ":id" nuốt mất.
                    element: <ProtectedRoute permission={PERMISSIONS.CONSUMABLE_CATEGORY_VIEW} />,
                    children: [{ path: "categories", element: <ConsumableCategoriesListPage /> }],
                  },
                  {
                    // Roadmap B8 (DEV-067, 2026-09-18) — resource RIÊNG
                    // (`CONSUMABLE_REQUEST_VIEW`, khác `CONSUMABLE_VIEW` của
                    // nhóm cha) — gate tường minh, cùng nguyên tắc "categories"
                    // ở trên. Đặt TRƯỚC ":id" để React Router không nuốt mất.
                    element: <ProtectedRoute permission={PERMISSIONS.CONSUMABLE_REQUEST_VIEW} />,
                    children: [{ path: "requests", element: <ConsumableRequestsListPage /> }],
                  },
                  { path: ":id", element: <ConsumableDetailPage /> },
                ],
              },
            ],
          },
          {
            // Roadmap B4 (2026-09-16) — Quản lý nhà cung cấp, module MỚI,
            // 2 nhóm route riêng (Vendors/Contracts) vì gate permission khác
            // nhau (VENDOR_VIEW vs CONTRACT_VIEW).
            element: <ProtectedRoute permission={PERMISSIONS.VENDOR_VIEW} />,
            children: [
              {
                path: "vendors",
                children: [
                  { index: true, element: <VendorsListPage /> },
                  { path: ":id", element: <VendorDetailPage /> },
                ],
              },
            ],
          },
          {
            element: <ProtectedRoute permission={PERMISSIONS.CONTRACT_VIEW} />,
            children: [
              {
                path: "contracts",
                children: [
                  { index: true, element: <ContractsListPage /> },
                  { path: ":id", element: <ContractDetailPage /> },
                ],
              },
            ],
          },
          {
            element: <ProtectedRoute permission={PERMISSIONS.USER_VIEW} />,
            children: [
              {
                path: "users",
                element: <UsersListPage />,
              },
            ],
          },
          {
            // Roadmap C3 (Giám sát phiên đăng nhập toàn hệ thống, DEV-070,
            // 2026-09-19) — trang RIÊNG, dùng LẠI permission SESSION_VIEW_ALL
            // (đã có từ C2/DEV-069, KHÔNG tạo permission mới).
            element: <ProtectedRoute permission={PERMISSIONS.SESSION_VIEW_ALL} />,
            children: [
              {
                path: "sessions",
                element: <SessionsMonitorPage />,
              },
            ],
          },
          {
            element: <ProtectedRoute permission={PERMISSIONS.DEPARTMENT_VIEW} />,
            children: [
              {
                path: "departments",
                element: <DepartmentsListPage />,
              },
            ],
          },
          {
            // FE-08 (roadmap Mục 16) — RBAC Admin UI (Roles/Permissions/Policies).
            // Gate NGOÀI bằng "any" trong 3 permission (chỉ để tránh user hoàn
            // toàn không có quyền RBAC nào lọt vào layout `/rbac` rỗng) — mỗi
            // route CON vẫn tự gate ĐÚNG permission riêng của resource đó (3
            // resource độc lập, KHÔNG có quan hệ cha/con thật như Document/
            // DocumentDetail — không dùng chung 1 gate như Document/Asset).
            element: (
              <ProtectedRoute permission={[PERMISSIONS.ROLE_VIEW, PERMISSIONS.PERMISSION_VIEW, PERMISSIONS.POLICY_VIEW]} />
            ),
            children: [
              {
                path: "rbac",
                children: [
                  { index: true, element: <Navigate to="roles" replace /> },
                  {
                    element: <ProtectedRoute permission={PERMISSIONS.ROLE_VIEW} />,
                    children: [
                      { path: "roles", element: <RolesListPage /> },
                      { path: "roles/:id", element: <RoleDetailPage /> },
                    ],
                  },
                  {
                    element: <ProtectedRoute permission={PERMISSIONS.PERMISSION_VIEW} />,
                    children: [{ path: "permissions", element: <PermissionsListPage /> }],
                  },
                  {
                    element: <ProtectedRoute permission={PERMISSIONS.POLICY_VIEW} />,
                    children: [{ path: "policies", element: <PoliciesListPage /> }],
                  },
                ],
              },
            ],
          },
          {
            element: <ProtectedRoute permission={PERMISSIONS.AUDIT_VIEW} />,
            children: [
              {
                path: "audit-logs",
                element: <AuditLogsPage />,
              },
            ],
          },
          {
            // FE-15 (roadmap Mục 20) — thư viện file độc lập (không gắn với
            // Document/Asset nào, xem `types/file.types.ts`).
            element: <ProtectedRoute permission={PERMISSIONS.VIEW_FILES} />,
            children: [{ path: "files", element: <FilesListPage /> }],
          },
        ],
      },
    ],
  },

  { path: "/403", element: <ForbiddenPage /> },
  { path: "*", element: <NotFoundPage /> },
]);
