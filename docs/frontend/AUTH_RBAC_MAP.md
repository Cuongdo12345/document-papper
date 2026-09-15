# AUTH / RBAC MAP

> Nguồn: `backend/src/routes/auth/auth.routes.ts`, `services/auth/auths.service.ts`, `shared/helpers/auth.helper.ts`, `middlewares/auth.middleware.ts`, `middlewares/authorizePermission.middleware.ts`, `shared/constants/permission.constant.ts`, `shared/constants/rolePermission.map.ts`, `models/auth/refreshToken.model.ts`, `models/auth/passwordResetToken.model.ts`, `models/rbac/role.model.ts`, `models/users/user.model.ts`, `backend/src/docs/openAPI.yaml`. Xác minh trực tiếp source 2026-09-03 — không suy diễn.

---

## 1. Authentication

### 1.1 Cơ chế

- JWT stateless — KHÔNG session server-side, KHÔNG cookie cho token (`accessToken`/`refreshToken` trả thẳng trong JSON body).
- `accessToken`: JWT, ký bằng `JWT_SECRET`, **hết hạn 8 giờ** (`auth.helper.ts:38`).
- `refreshToken`: JWT, ký bằng `JWT_REFRESH_SECRET`, **hết hạn 7 ngày** (`auth.helper.ts:48`) — đồng thời lưu 1 bản ghi HASH (SHA-256, DEV-014) trong collection `RefreshToken` (`{user, token(hash), expiresAt, revoked}`) để server có thể revoke chủ động (logout/đổi mật khẩu).
- `accessToken` payload: **CHỈ `{id}`** (DEV-021/SEC-04 — trước đây có thêm `role`/`department` dư thừa, đã bỏ). FE **KHÔNG được** decode JWT để lấy `role`/`department`/`permissions` — phải gọi `GET /api/users/me` để lấy thông tin đầy đủ sau khi có `accessToken`.
- Mật khẩu: `bcrypt`, cost factor 10.

### 1.2 Request/Response từng endpoint

| Endpoint | Request | Response 200 | Ghi chú |
|---|---|---|---|
| `POST /api/auths/register` | `{username, email, password, confirmPassword, fullName}` | `{message, data:{...}}` (theo route, không có accessToken tự động — cần login riêng sau khi đăng ký, xem OpenAPI) | `password`≥8, `email` bắt buộc (cần cho forgot-password sau này). Public. |
| `POST /api/auths/login` | `{username, password}` | `{message, data:{accessToken, refreshToken, user}}` | `password`≥5 (KHÔNG nâng — xác thực mật khẩu cũ). Public, có `authRateLimiter`. |
| `POST /api/auths/refresh-token` | `{refreshToken}` | `{accessToken}` | Response CHỈ có `accessToken` — KHÔNG trả `refreshToken` mới (backend hiện KHÔNG rotate refresh token, xem Mục 1.4). Public (không cần accessToken cũ), có `authRateLimiter`. |
| `POST /api/auths/logout` | (không body, cần `Authorization` header) | `{message}` | Yêu cầu `authenticate`. Revoke refresh token phía server (đánh dấu `revoked:true`). |
| `POST /api/auths/forgot-password` | `{username}` | **LUÔN 200, LUÔN cùng 1 message** dù username tồn tại hay không (SOURCE_CODE_BEHAVIOR — chống user enumeration, `auths.service.ts:362-369`) | Public, có `authRateLimiter` + rate-limit riêng DB-based: **tối đa 3 request/15 phút/user** → vượt quá trả `429`. |
| `POST /api/auths/reset-password` | `{token, newPassword}` | `{message}` | `token` lấy từ query string link trong email (`${CLIENT_URL}/reset-password?token=...`) — **FE BẮT BUỘC có route `/reset-password` đọc query param `token`**, KHÔNG tự sinh URL khác. `newPassword`≥8. Token hết hạn sau **15 phút**. Public. |

### 1.3 FE cần biết chính xác

```text
Token storage:      accessToken in-memory (Zustand) + refreshToken localStorage
                     (backend trả token trong JSON body, KHÔNG dùng httpOnly cookie
                     — FE không có lựa chọn nào an toàn hơn mà không sửa backend)
Refresh flow:        401 → gọi /refresh-token với refreshToken hiện có → nhận
                     accessToken MỚI (không nhận refreshToken mới) → retry request gốc
Logout flow:         gọi /logout (revoke server-side) → xoá local state → redirect /login
                     (xoá local state NGAY CẢ KHI API logout lỗi — không để user kẹt)
401 handling:        xem trên (refresh 1 lần, thất bại → logout)
Error behavior:      forgot-password KHÔNG BAO GIỜ báo lỗi "user không tồn tại" —
                     FE phải hiển thị message trung tính bất kể kết quả thật
```

### 1.4 Known limitation (ghi nhận, không phải hướng dẫn sửa backend)

- **Refresh token KHÔNG rotate** — mỗi lần gọi `/refresh-token` chỉ cấp `accessToken` mới, refresh token cũ vẫn dùng được tới khi hết hạn (7 ngày) hoặc bị revoke thủ công (logout/đổi mật khẩu). `FRONTEND_RECOMMENDATION`: FE không cần logic "lưu refreshToken mới sau mỗi lần refresh" vì backend không trả cái mới.
- **Đăng ký (`/register`) không tự động login** — response OpenAPI không có `accessToken`. `FRONTEND_RECOMMENDATION`: sau khi đăng ký thành công, điều hướng user sang `/login` thay vì giả định đã đăng nhập.

## 2. Authorization / RBAC

### 2.1 Permission catalog

Nguồn DUY NHẤT: `PERMISSIONS` object (`backend/src/shared/constants/permission.constant.ts`) — **75 permission** (đếm trực tiếp). FE copy chính xác giá trị string, KHÔNG tự đặt permission mới.

Nhóm permission theo domain (tên nhóm, không liệt kê lại từng permission — xem `API_REFERENCE.md` cho permission gắn từng endpoint):
`USER_*` (8), `ROLE_*` (5), `PERMISSION_*` (4), `POLICY_*` (4, ABAC — xem Mục 2.4), `DOCUMENT_*` (5) + `DOCUMENT_EXCEL_*`/`EXCEL_DEPARTMENT_SYNC` (5), `WORKFLOW_*` (7), `DEPARTMENT_*` (5), `AUDIT_*` (3), `SYSTEM_*` (2), `DASHBOARD_READ` (1), `ASSET_*` (10), `ASSET_CATEGORY_*` (5), `MEDICAL_DEVICE_*` (5), Upload (`UPLOAD_FILES`/`VIEW_FILES`/`VIEW_FILE_DETAIL`/`DELETE_FILE`, 4), `PERFORMANCE_VIEW` (1).

### 2.2 Roles hiện có

6 role trong `rolePermission.map.ts`: `ADMIN` (toàn bộ `PERMISSIONS` + `SYSTEM_ADMIN`), `IT`, `TRUONG_KHOA`, `DIEU_DUONG_TRUONG`, `BAN_GIAM_DOC`, `PHONG_VAT_TU_TTB`.

**UNKNOWN**: permission cụ thể của 5 role non-ADMIN không liệt kê đầy đủ ở đây (dài, chi tiết theo domain) — FE nên đọc `user.permissions` trả về từ API thực tế (`/users/me`) thay vì hard-code theo role name, vì đây chính là mục đích của model permission-based (không phải role-based) ở FE.

### 2.3 Cơ chế xác định quyền (authorization pipeline)

```
Request
 → authenticate (JWT verify, populate req.user: {_id, role:{_id,name,isSystemRole}, department, isActive})
 → authorizePermission(permission)
    → BƯỚC 1: ADMIN bypass — role.isSystemRole===true || role.name==="ADMIN" → next() NGAY,
      KHÔNG đọc denyPermissions (RV02-02, cố ý, xem AUTH_RBAC_MAP Mục 2.5)
    → BƯỚC 2: getCachedPermissions(user) → getUserEffectivePermissions()
      = role.permissions ∪ user.extraPermissions − user.denyPermissions
    → có permission cần? → next() : 403
 → Controller/Service
```

- `req.user.permissions` **CHỈ ĐÚNG SAU KHI** `authorizePermission` chạy xong — ngay sau `authenticate` field này LUÔN `[]` (ARCH-17, ghi ở `express.d.ts`). FE lấy permission thật từ response `GET /api/users/me`, KHÔNG decode JWT.
- ✅ **RBAC MICRO-FIX (2026-09-05)** — trước đây mục này ghi sai rằng `/users/me` "trả `User` schema có field `extraPermissions`" đủ để FE biết quyền; FE-00 verify trực tiếp source (`getMeService`, `users.service.ts`) xác nhận điều đó KHÔNG đúng (`extraPermissions` là ObjectId thô, không có field `permissions` computed, `role` không có `isSystemRole`). Đã fix additive: `getMeService` giờ **REUSE `getCachedPermissions()`** (đúng hàm này, không viết logic mới) để trả `permissions: string[]` (effective, đã resolve tên) + populate thêm `role.isSystemRole`. Response `/users/me` giờ đúng như pipeline Mục 2.3 mô tả. Chi tiết: `docs/development/tasks/` (RBAC micro-fix) + `docs/frontend/tasks/FE-00.md` Mục 10.1 (lịch sử phát hiện).
- Permission cache (`permission.cache.ts`) — in-memory, single-instance, invalidate khi role/permission của user đổi (`clearPermissionCache()`). Không ảnh hưởng thiết kế FE, chỉ ảnh hưởng độ trễ cập nhật quyền (vài giây) khi ADMIN vừa đổi quyền 1 user khác.

### 2.4 ABAC (Policy) — TRẠNG THÁI ĐẶC BIỆT

`POLICY_VIEW/CREATE/UPDATE/DELETE` — API `/api/rbac/policies*` **TỒN TẠI VÀ HOẠT ĐỘNG** (CRUD Policy bình thường, permission check bình thường). Nhưng **cơ chế ABAC runtime (`enablePolicies`) CHƯA được bật ở bất kỳ route nghiệp vụ nào** (`grep "enablePolicies" routes/**` → 0 kết quả, xác nhận DEV-009A PAUSED). Nghĩa là: tạo/sửa/xoá Policy qua UI vẫn lưu được vào DB, nhưng **KHÔNG có tác dụng gì tới authorization thật của bất kỳ request nào khác**.

`FRONTEND_RECOMMENDATION`: cân nhắc ẩn hoặc gắn nhãn "Beta/chưa áp dụng" cho UI quản trị Policy, tránh gây hiểu lầm cho người quản trị rằng Policy đang có hiệu lực.

### 2.5 Case đặc biệt cần FE biết (không phải bug, là inconsistency đã document ở backend)

- `user.denyPermissions` — field tồn tại trong `User` model, dùng để TRỪ bớt quyền so với role. Nhưng **KHÔNG có tác dụng với user có `role.isSystemRole===true` hoặc `role.name==="ADMIN"`** vì ADMIN bypass chạy TRƯỚC khi đọc `denyPermissions` (RV02-02, cố ý giữ nguyên, xem `docs/development/tasks/DEV-022.md`). FE hiển thị UI "gán denyPermissions cho 1 user" nên cảnh báo rõ: field này vô nghĩa nếu user đó có role ADMIN.
- **0 role hiện giữ `USER_VIEW`/`USER_VIEW_DETAIL`** — `GET /api/users`, `GET /api/users/:id` sẽ 403 với MỌI user không phải ADMIN, dù về mặt thiết kế permission là generic. FE-04 (trang Users) cần coi đây là màn hình ADMIN-only trên thực tế cho tới khi có quyết định nghiệp vụ khác.

## 3. Endpoint × Permission bảng đầy đủ

Xem `API_REFERENCE.md` — mỗi endpoint đã ghi rõ field `Permission`. Bảng dưới đây chỉ tóm tắt endpoint KHÔNG cần permission cụ thể (chỉ `authenticate`):

| Endpoint | Lý do không cần permission |
|---|---|
| `GET/PATCH /api/users/me` | Self-scoped theo `req.user._id`, không thao tác user khác |
| `PATCH /api/users/change-password` | Self-scoped |
| `GET /api/notifications`, `/unread-count`, `PATCH /:id/read`, `/read-all`, `DELETE /:id` | Self-scoped theo `req.user._id`, mỗi user chỉ thấy/thao tác thông báo của mình |
| 6 route `/api/auths/*` | Public (trước khi có `accessToken`) hoặc chỉ cần `authenticate` (`logout`) |

## 4. Nguồn tham chiếu

- Permission gắn từng endpoint: `API_REFERENCE.md`.
- Route map FE ↔ permission: `ROUTE_PERMISSION_MAP.md`.
- Error shape khi 401/403: `ERROR_HANDLING.md`.
