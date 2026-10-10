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
| `/register` | Đăng ký (RECOMMENDED — cân nhắc có bật public hay không, chưa có quyết định nghiệp vụ) | `POST /auths/register` | public | **[ĐÃ QUYẾT 2026-09-29, DEV-090]** backend mặc định TẮT (404), chỉ bật khi ENV `ALLOW_SELF_REGISTER=true`. User được tạo qua `/users` (Admin). Không làm trang `/register` trừ khi bật lại. |
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
| `/it-assets` | Danh sách Thiết bị CNTT | `GET /it-assets` | `IT_ASSET_VIEW` | ✅ **FE-42 (2026-10-09)** — thay `/assets`. Trang/hook dùng chung với y tế, tham số hoá bằng loại (`AssetModuleLayout`) |
| `/it-assets/create` | Thêm thiết bị CNTT | `POST /it-assets` | `IT_ASSET_CREATE` | ✅ FE-42 |
| `/it-assets/categories` | Danh mục nhánh CNTT | `GET /it-assets/categories` | `IT_ASSET_CATEGORY_VIEW` | ✅ FE-42 — loại cố định theo module, không có ô chọn loại |
| `/it-assets/scan` | Quét QR kiểm kê | `GET /it-assets/lookup/:assetCode` | `IT_ASSET_INVENTORY_CHECK` | ✅ FE-42 |
| `/it-assets/maintenance-calendar` | Lịch bảo trì | `GET /it-assets/maintenance-plans/calendar` | `IT_ASSET_MAINTENANCE_PLAN_VIEW` | ✅ FE-42 |
| `/it-assets/:id` | Chi tiết Thiết bị CNTT | `GET /it-assets/:id` | `IT_ASSET_VIEW` (kế thừa route cha) | ✅ FE-42/43 — gồm cấp phát/luân chuyển/thu hồi, QR, lịch sử, **hồ sơ CNTT** (`GET/PUT /it-assets/:assetId/profile`, sửa cần `IT_ASSET_UPDATE`), **bản quyền đang gán** (cần `SOFTWARE_LICENSE_VIEW`). Tài sản loại y tế → backend 404 |
| `/medical-assets` | Danh sách Thiết bị y tế | `GET /medical-assets` | `MEDICAL_ASSET_VIEW` | ✅ FE-42 |
| `/medical-assets/create`, `/categories`, `/scan`, `/maintenance-calendar` | Như CNTT | `/medical-assets/...` | `MEDICAL_ASSET_CREATE` / `_CATEGORY_VIEW` / `_INVENTORY_CHECK` / `_MAINTENANCE_PLAN_VIEW` | ✅ FE-42 |
| `/medical-assets/:id` | Chi tiết Thiết bị y tế | `GET /medical-assets/:id` | `MEDICAL_ASSET_VIEW` (kế thừa route cha) | ✅ FE-42 — gồm hồ sơ y tế/kiểm định/chứng chỉ (`MEDICAL_DEVICE_*`, `OPERATOR_CERTIFICATE_*`). IT chỉ xem (DEV-117) |
| `/software-licenses` | Bản quyền phần mềm | `GET /software-licenses` | `SOFTWARE_LICENSE_VIEW` | ✅ **FE-43 (2026-10-09)** — thêm/sửa/xoá `_CREATE/_UPDATE/_DELETE`, gán máy `_ASSIGN`, chạy tay cảnh báo `_ALERTS_TRIGGER` |
| `/software-licenses/:id` | Chi tiết bản quyền | `GET /software-licenses/:id` | `SOFTWARE_LICENSE_VIEW` | ✅ FE-43 — máy đang dùng (gán/gỡ), chứng từ tải lên/xuống |
| `/assets`, `/assets/*` | **ĐƯỜNG DẪN CŨ — chuyển hướng** | `GET /assets/lookup-options/:id` (với `:id`) | — (trang đích tự gate) | ✅ FE-42/44 — `LegacyAssetsRedirect`: `/assets` và trang con tĩnh → module đầu tiên người dùng xem được; `/assets/:id` → hỏi backend loại tài sản rồi chuyển tới `/it-assets/:id` hoặc `/medical-assets/:id`. Giữ link/thông báo cũ hoạt động |
| `/uploads` | Quản lý file | `GET /upload` | `VIEW_FILES` | |
| `/notifications` | Trung tâm thông báo | `GET /notifications` | authenticate | Mọi user, self-scoped |
| `/audit-logs` | Nhật ký audit | `GET /user-audits` | `AUDIT_VIEW` | |
| `/import-export/documents` | Import/Export Document Excel | `/export/*` | `DOCUMENT_EXCEL_*` | |
| `/import-export/assets` | (chưa có trang riêng) Excel tài sản nằm ở menu Excel của từng danh sách | `/it-assets|/medical-assets` + `/import`, `/export` | `IT_ASSET_EXCEL_*` / `MEDICAL_ASSET_EXCEL_*` | Theo module (FE-42) |
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
