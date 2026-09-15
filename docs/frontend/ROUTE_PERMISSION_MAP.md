# ROUTE / PERMISSION MAP

> Toàn bộ route dưới đây là **RECOMMENDED** — chưa có quyết định FE chính thức nào chốt route cuối cùng. Dựa trực tiếp trên domain backend + permission catalog (`AUTH_RBAC_MAP.md`), không tự tạo route cho chức năng backend không có.
>
> ✅ **CONFIRMED tại FE-01 (2026-09-05)**: cấu trúc route thật đã implement dùng tiền tố `/app/*` cho toàn bộ route protected (khác bảng dưới — bảng dưới ghi path KHÔNG tiền tố cho dễ đọc theo domain). Ví dụ thật: `/app` (dashboard placeholder), `/app/documents`, `/app/users`, `/app/departments`, `/app/audit-logs`. `/login` giữ nguyên không tiền tố (public). Chi tiết: `docs/frontend/tasks/FE-01.md`.

```text
Frontend Route
     ↓
   Page
     ↓
   API (xem API_REFERENCE.md)
     ↓
Required Permission
     ↓
Access (role thực tế hiện giữ permission đó — xem AUTH_RBAC_MAP.md Mục 2.2, KHÔNG hard-code, đọc effective permission runtime)
```

| FE Route | Page | API chính | Permission | Access ghi chú |
|---|---|---|---|---|
| `/login` | Đăng nhập | `POST /auths/login` | public | Tất cả |
| `/forgot-password` | Quên mật khẩu | `POST /auths/forgot-password` | public | Tất cả |
| `/reset-password?token=` | Đặt lại mật khẩu | `POST /auths/reset-password` | public | Tất cả — **PHẢI đọc query `token`**, backend sinh link cố định dạng này |
| `/register` | Đăng ký (RECOMMENDED — cân nhắc có bật public hay không, chưa có quyết định nghiệp vụ) | `POST /auths/register` | public | UNKNOWN — cần hỏi user có cho tự đăng ký hay chỉ ADMIN tạo user qua `/users` |
| `/` → redirect `/app` | — | — | authenticate | Mọi user đã login |
| `/app` (index) | Dashboard tổng quan | 12 endpoint `/dashboard/*` | KHÔNG gate route (mọi user login đều vào được — trang tự rẽ nhánh nội bộ theo `DASHBOARD_READ`) | ✅ **IMPLEMENTED (FE-09, 2026-09-07)**. `USER` là role DUY NHẤT không có `DASHBOARD_READ` (xác nhận `rolePermission.map.ts`) — role đó thấy "Welcome panel" tối giản thay vì dashboard đầy đủ. `GET /dashboard/department/:departmentId` KHÔNG kiểm tra `departmentId` khớp khoa người gọi (chỉ cần `DASHBOARD_READ`) — ghi nhận là khoảng trống ABAC tiềm ẩn, NGOÀI SCOPE FE-09 (không sửa backend); FE chỉ chủ động không mời non-ADMIN duyệt khoa khác (tự dùng `user.department`), ADMIN có dropdown chọn khoa (đằng nào cũng bypass mọi permission). |
| `/documents` | Danh sách Document | `GET /documents` | `DOCUMENT_VIEW` | |
| `/documents/create` | Tạo đề xuất | `POST /documents/proposal` | `DOCUMENT_CREATE` | |
| `/documents/:id` | Chi tiết + workflow | `GET /documents/:id`, `GET /workflows/document/:id` | `DOCUMENT_VIEW` (route guard) — xem ghi chú | **[CẬP NHẬT 2026-09-06]** KHÔNG guard bằng `DOCUMENT_VIEW_DETAIL` ở tầng route nữa: permission đó đã bị gỡ khỏi RBAC của 5 role thường ở DEV-009A (chỉ còn cấp qua ABAC Policy theo TỪNG document, không nằm trong `user.permissions[]` tĩnh) — guard tĩnh cũ chặn CỨNG mọi non-admin dù backend cho phép (đã xác nhận + sửa, xem `docs/development/tasks/DEV-030.md`). Backend (`GET /documents/:id`) là ranh giới thật (RBAC ADMIN bypass + ABAC same-department); FE chỉ hiển thị lỗi 403 qua `ErrorState` nếu backend từ chối. |
| `/workflows/pending` | Hộp thư chờ duyệt | `GET /workflows/pending` | `WORKFLOW_VIEW` | |
| `/workflows/templates` | Quản trị mẫu quy trình | `POST /workflows/templates` | `WORKFLOW_TEMPLATE_CREATE` | Thường ADMIN/IT |
| `/users` | Danh sách User | `GET /users` | `USER_VIEW` | ⚠️ **0 role hiện giữ → chỉ ADMIN xem được thực tế**, xem `AUTH_RBAC_MAP.md` |
| `/users/:id` | Chi tiết User | `GET /users/:id` | `USER_VIEW_DETAIL` | ⚠️ như trên |
| `/profile` | Thông tin cá nhân | `GET/PATCH /users/me` | authenticate | Mọi user |
| `/departments` | Danh sách Khoa/Phòng | `GET /departments` | `DEPARTMENT_VIEW` | |
| `/rbac/permissions` | Quản trị Permission | `GET /rbac/permissions` | `PERMISSION_VIEW` | ✅ **IMPLEMENTED (FE-08, 2026-09-07)** — Thường ADMIN (xác nhận qua HTTP thật) |
| `/rbac/roles` | Quản trị Role | `GET /rbac/roles` | `ROLE_VIEW` | ✅ IMPLEMENTED (FE-08) |
| `/rbac/roles/:id` | Chi tiết Role + permission matrix | `GET /rbac/roles/:id`, `POST /rbac/roles/:id/assign-permissions` | `ROLE_VIEW` (route guard); `ROLE_ASSIGN_PERMISSIONS` cho nút Lưu | ✅ IMPLEMENTED (FE-08) |
| `/rbac/policies` | Quản trị Policy (ABAC) | `GET /rbac/policies` | `POLICY_VIEW` | ✅ IMPLEMENTED (FE-08). **[CẬP NHẬT 2026-09-07]** Ghi chú "Beta/ABAC chưa hoạt động runtime" ở bản trước đây là OUTDATED — DEV-034 đã tạo + xác minh 1 Policy thật hoạt động đúng qua HTTP (200 khi điều kiện khớp, 403 khi không) ở `authorizePermission.middleware.ts`. ABAC ĐANG hoạt động runtime, trang này KHÔNG gắn nhãn Beta. |
| `/assets` | Danh sách Tài sản | `GET /assets` | `ASSET_VIEW` | ✅ **IMPLEMENTED (FE-06, 2026-09-06)** |
| `/assets/create` | Thêm tài sản mới | `POST /assets` | `ASSET_CREATE` | ✅ IMPLEMENTED (FE-06) |
| `/assets/:id` | Chi tiết Tài sản | `GET /assets/:id` | `ASSET_VIEW` (route guard, **KHÔNG** `ASSET_VIEW_DETAIL` như dự kiến ban đầu) | ✅ IMPLEMENTED (FE-06) — gồm assign/transfer/return + assignment history. **[CẬP NHẬT 2026-09-06]** `:id` chỉ kế thừa guard `ASSET_VIEW` của route cha, không gate riêng `ASSET_VIEW_DETAIL` — cùng bài học DEV-031 (route FE không nên tự gate 1 permission có thể lệch RBAC thật ở lần đổi RBAC sau, dù hiện tại mọi role có `ASSET_VIEW` cũng có `ASSET_VIEW_DETAIL`). Medical device profile/calibration **CHƯA có** ở trang này — phase riêng (roadmap Mục 13). |
| `/asset-categories` | Danh mục Tài sản | `GET /assets/asset-categories` | `ASSET_CATEGORY_VIEW` | ⏳ Chưa implement — FE-06 chỉ dùng list tối thiểu (dropdown chọn danh mục), CRUD đầy đủ là phase riêng (roadmap Mục 14) |
| `/uploads` | Quản lý file | `GET /upload` | `VIEW_FILES` | |
| `/notifications` | Trung tâm thông báo | `GET /notifications` | authenticate | Mọi user, self-scoped |
| `/audit-logs` | Nhật ký audit | `GET /user-audits` | `AUDIT_VIEW` | |
| `/import-export/documents` | Import/Export Document Excel | `/export/*` | `DOCUMENT_EXCEL_*` | |
| `/import-export/assets` | Import/Export Asset Excel | `/assets/import`, `/assets/export` | `ASSET_EXCEL_IMPORT/EXPORT` | |
| `/403` | Forbidden | — | — | Khi `ProtectedRoute` chặn do thiếu permission |
| `/404` | Not Found | — | — | Route không khớp |

## Quy tắc `ProtectedRoute`

```
authenticate?  → không → redirect /login
permission đủ? → không → redirect /403 (KHÔNG redirect /login — đã login, chỉ thiếu quyền)
                → có   → render page
```

## Ghi chú UNKNOWN

- Route `/register` public hay không — chưa có quyết định nghiệp vụ, cần hỏi user trước FE-01.
- Cấu trúc route con cho `/import-export` (gộp 1 trang tab hay tách riêng theo domain Document/Asset) — RECOMMENDED tách theo domain vì 2 luồng nghiệp vụ độc lập hoàn toàn.
