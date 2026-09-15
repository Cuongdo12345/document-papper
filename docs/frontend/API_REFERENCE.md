# API REFERENCE (Frontend-facing)

> Nguồn: `backend/src/docs/openAPI.yaml` + route/controller/service/DTO source thật (xác minh trực tiếp 2026-09-03). Đây là bản diễn giải cho FE developer — không phải copy máy móc OpenAPI. Response wrapper/error shape chung: xem `ERROR_HANDLING.md`. Permission/role: xem `AUTH_RBAC_MAP.md`.
>
> Ký hiệu: 🔒 = cần `authenticate`. Permission ghi ngay sau 🔒 nếu có; không ghi = chỉ cần `authenticate` (self-scoped).

---

## AUTH

### POST /api/auths/register
Purpose: Đăng ký tài khoản mới. Auth: public. Body: `{username, email, password≥8, confirmPassword, fullName}`. Response: `{message, data}`. Errors: 400 (trùng username/email, mật khẩu không khớp). Notes: KHÔNG tự động login — điều hướng `/login` sau khi thành công.

### POST /api/auths/login
Purpose: Đăng nhập. Auth: public (rate-limited). Body: `{username, password≥5}`. Response: `{message, data:{accessToken, refreshToken, user}}`. Errors: 400, 401 (sai mật khẩu/user không tồn tại — message chung, không phân biệt), 429.

### POST /api/auths/refresh-token
Purpose: Cấp `accessToken` mới. Auth: public. Body: `{refreshToken}`. Response: `{accessToken}` (KHÔNG có `refreshToken` mới — không rotate). Errors: 400, 401 (refresh token hết hạn/revoked/invalid), 429.

### POST /api/auths/logout
Purpose: Đăng xuất, revoke refresh token server-side. Auth: 🔒. Body: none. Response: `{message}`.

### POST /api/auths/forgot-password
Purpose: Gửi email link reset mật khẩu. Auth: public (rate-limited: 3 req/15 phút/user + `authRateLimiter` theo IP). Body: `{username}`. Response: **LUÔN** `{message}` giống nhau dù username tồn tại hay không (chống enumeration). Errors: 429 (vượt 3 req/15 phút). Notes: link email dạng `${CLIENT_URL}/reset-password?token=...`.

### POST /api/auths/reset-password
Purpose: Đặt lại mật khẩu bằng token từ email. Auth: public. Body: `{token, newPassword≥8}`. Response: `{message}`. Errors: 400 (token invalid/hết hạn sau 15 phút).

---

## USERS 🔒

### POST /api/users
Permission: `USER_CREATE`. Body: `{username≥5, password≥8, fullName, role(ObjectId), department?(ObjectId)}`. Response: `{success,message,data:User}`.

### GET /api/users
Permission: `USER_VIEW` ⚠️ 0 role hiện giữ, xem `AUTH_RBAC_MAP.md`. Query: `page,limit(≤100),role,department,isActive("true"|"false")`. Response: `{success,...,data:User[],pagination}`.

### GET /api/users/me
Auth: chỉ 🔒. Response: `User` đầy đủ + **`role.isSystemRole`** + **`permissions: string[]`** (effective permission đã resolve tên — RBAC micro-fix 2026-09-05, REUSE `getCachedPermissions()`) — nguồn CHÍNH để FE biết quyền/role thật của user hiện tại sau login. `extraPermissions`/`denyPermissions` GIỮ NGUYÊN dạng ObjectId thô (không đổi, backward-compatible) — dùng `permissions[]` cho mọi logic `hasPermission()`, KHÔNG tự resolve `extraPermissions`.

### GET /api/users/:id
Permission: `USER_VIEW_DETAIL` ⚠️ như trên.

### PATCH /api/users/me
Auth: chỉ 🔒 (self). Body: `UpdateUserDTO` subset an toàn cho self-update.

### PUT /api/users/:id
Permission: `USER_UPDATE`. Body: `{fullName?,username?,role?,department?,isActive?}` — **KHÔNG** đổi mật khẩu ở đây (route riêng). Guard: không cho gán `role.name==="ADMIN"` qua endpoint này (an ninh, DEV-001A).

### PATCH /api/users/:id/role
Permission: `USER_ASSIGN_ROLE`. Body: `{roleId, resetPermissions?}`. Guard: không cho gán role ADMIN qua đây.

### DELETE /api/users/:id
Permission: `USER_DELETE`. Soft-delete (không phải xoá vĩnh viễn — xem model `isActive`/`deletedAt` pattern chung).

### PATCH /api/users/restore/:id
Permission: `USER_RESTORE`.

### PATCH /api/users/change-password
Auth: chỉ 🔒 (self). Body: `{oldPassword≥5, newPassword≥8, confirmPassword}`. Notes: **thu hồi TOÀN BỘ refresh token của user (kể cả phiên hiện tại)** — FE phải tự logout + redirect `/login` ngay sau khi API này trả 200 (không có refreshToken cũ nào còn dùng được).

### PATCH /api/users/reset-password/:id
Permission: `USER_RESET_PASSWORD`. Body: `{newPassword≥8}`. Guard: không cho reset mật khẩu ADMIN qua endpoint này. Notes: cũng thu hồi refresh token của TARGET user (không phải người gọi).

---

## USER AUDITS (Audit Log) 🔒

### GET /api/user-audits
Permission: `AUDIT_VIEW`. Query: `page,limit(≤100),fromDate,toDate,action(1 giá trị hoặc CSV/repeated-key cho nhiều giá trị, tối đa 20),performedBy(ObjectId),user(ObjectId)`. Response: `{data,pagination}`.

### GET /api/user-audits/export
Permission: `AUDIT_VIEW`. Query: giống trên + `format("xlsx"|"csv", default xlsx)`. Response: file blob (`responseType:"blob"` phía FE).

### GET /api/user-audits/dashboard
Permission: `AUDIT_VIEW_DASHBOARD`. Query: `fromDate,toDate`.

---

## RBAC 🔒

### Permissions
- `POST /api/rbac/permissions` — `PERMISSION_CREATE`. Body: `{name,resource,action,description?}`.
- `GET /api/rbac/permissions` — `PERMISSION_VIEW`.
- `GET /api/rbac/permissions/:id` — `PERMISSION_VIEW`.
- `PUT /api/rbac/permissions/:id` — `PERMISSION_UPDATE`. Body: ≥1 field trong `{name,resource,action,description}`.
- `DELETE /api/rbac/permissions/:id` — `PERMISSION_DELETE`.

### Roles
- `POST /api/rbac/roles` — `ROLE_CREATE`. Body: **CHỈ `{name}`** — KHÔNG có `permissions` ở bước tạo (cố ý, an ninh — xem `AUTH_RBAC_MAP.md`). Tạo role xong = role rỗng quyền, phải gọi `assign-permissions` riêng.
- `GET /api/rbac/roles`, `GET /api/rbac/roles/:id` — `ROLE_VIEW`.
- `PUT /api/rbac/roles/:id` — `ROLE_UPDATE`. Body: `{name}`. Guard: không cho đổi role khác THÀNH "ADMIN" hoặc đổi role ADMIN gốc SANG tên khác (DEV-001, backdoor đã vá).
- `DELETE /api/rbac/roles/:id` — `ROLE_DELETE`.
- `POST /api/rbac/roles/:id/assign-permissions` — `ROLE_ASSIGN_PERMISSIONS` (permission RIÊNG, không dùng chung `ROLE_UPDATE`). Body: `{permissionIds: ObjectId[], min 1}`. Notes: đây là API DUY NHẤT gán quyền cho Role — form "Tạo Role" và form "Gán quyền" ở FE nên là 2 bước/2 màn hình riêng biệt, không gộp 1 form.

### Policies (ABAC — xem cảnh báo trạng thái ở `AUTH_RBAC_MAP.md` Mục 2.4)
- `POST /api/rbac/policies` — `POLICY_CREATE`. Body: `{name,resource,action,condition(string, parse bằng evaluator riêng)}`.
- `GET /api/rbac/policies`, `GET /api/rbac/policies/:id` — `POLICY_VIEW`.
- `PUT /api/rbac/policies/:id` — `POLICY_UPDATE`.
- `DELETE /api/rbac/policies/:id` — `POLICY_DELETE`.

---

## DEPARTMENTS 🔒

### POST /api/departments
Permission: `DEPARTMENT_CREATE`. Body: `{name, code}` (CHỈ 2 field — model KHÔNG có `description`/`isActive`, dù tài liệu cũ từng nhầm có 2 field này).

### GET /api/departments
Permission: `DEPARTMENT_VIEW`. Query: `page,limit,keyword`.

### GET /api/departments/:id
Permission: `DEPARTMENT_VIEW_DETAIL`.

### PUT /api/departments/:id
Permission: `DEPARTMENT_UPDATE`. Body: `{name?,code?}`, ít nhất 1 field.

### DELETE /api/departments/:id
Permission: `DEPARTMENT_DELETE`. Guard: chặn nếu còn `User`/`Document`/`Asset` tham chiếu tới Department này (DEV-012) — response 400 kèm message rõ loại reference còn tồn tại.

---

## DOCUMENTS

Xem đầy đủ business rule + workflow liên kết ở `DOCUMENT_DOMAIN_MAP.md`. Bảng endpoint tóm tắt:

| Method | Path | Permission |
|---|---|---|
| POST | `/api/documents/proposal` | `DOCUMENT_CREATE` |
| GET | `/api/documents` | `DOCUMENT_VIEW` |
| GET | `/api/documents/:id` | `DOCUMENT_VIEW_DETAIL` |
| PUT | `/api/documents/:id` | `DOCUMENT_UPDATE` |
| DELETE | `/api/documents/:id` | `DOCUMENT_DELETE` |
| DELETE | `/api/documents/delete-by-month` | `DOCUMENT_DELETE` |
| PATCH | `/api/documents/restore/:id` | `DOCUMENT_UPDATE` |
| GET | `/api/documents/:proposalId/reports` | `DOCUMENT_VIEW` |

---

## WORKFLOW 🔒

### POST /api/workflows/templates
Permission: `WORKFLOW_TEMPLATE_CREATE`. Body: `{name, steps:[{stepOrder,name,role(string tự do)}] min 1, isActive?}`. Notes: `role` là STRING TỰ DO (không phải ref Role, không validate khớp Role thật tồn tại) — form tạo template nên gợi ý chọn từ danh sách Role hiện có nhưng backend không ép buộc khớp.

### POST /api/workflows/submit
Permission: `WORKFLOW_SUBMIT`. Body: `{documentId, templateId}`.

### GET /api/workflows/pending
Permission: `WORKFLOW_VIEW`. Query: `page,limit`. Notes: "hộp thư chờ duyệt" — endpoint tần suất cao, đã có index riêng.

### GET /api/workflows/document/:documentId
Permission: `WORKFLOW_VIEW`. Lấy WorkflowInstance theo Document.

### GET /api/workflows/:id
Permission: `WORKFLOW_VIEW`.

### POST /api/workflows/:id/approve
Permission: `WORKFLOW_APPROVE`. Body: `{comment?≤1000}`. Notes: có check role-per-step fine-grained bổ sung ở service (`step.role === user.role`), KHÔNG chỉ permission chung.

### POST /api/workflows/:id/reject
Permission: `WORKFLOW_REJECT`. Body: `{comment?≤1000}`.

### POST /api/workflows/:id/cancel
Permission: `WORKFLOW_CANCEL`. Body: `{comment?≤1000}`.

### POST /api/workflows/:id/complete
Permission: `WORKFLOW_COMPLETE`. Body: `{comment?≤1000}`. Notes: đóng hẳn quy trình sau khi việc thực tế đã xong (khác `approve` — xem `DOCUMENT_DOMAIN_MAP.md` Mục 5).

---

## ASSETS 🔒

| Method | Path | Permission | Ghi chú |
|---|---|---|---|
| POST | `/` | `ASSET_CREATE` | Body: `{category,department,name,serialNumber?,model?,manufacturer?,location?,purchaseDate?,purchasePrice?,warrantyExpiredAt?,supplier?,specs?}` |
| GET | `/` | `ASSET_VIEW` | Query: `page,limit,keyword,department,category,status(enum AssetStatus),sortBy(free string, default createdAt),order` |
| GET | `/export` | `ASSET_EXCEL_EXPORT` | Blob response |
| GET | `/:id` | `ASSET_VIEW_DETAIL` | |
| PUT | `/:id` | `ASSET_UPDATE` | CHỦ Ý không cho sửa `status`/`assignedTo`/`department` — phải qua assign/transfer/return |
| DELETE | `/:id` | `ASSET_DELETE` | Soft-delete |
| DELETE | `/:id/permanent` | `ASSET_DELETE_PERMANENT` | Guard: chặn nếu còn `MedicalDeviceProfile` (DEV-012). Action KHÔNG THỂ HOÀN TÁC — cần confirm dialog nghiêm ngặt (xem `UI_DESIGN_SYSTEM.md` cũ/`SHARED_COMPONENTS_LIBRARY.md`) |
| PATCH | `/:id/restore` | `ASSET_UPDATE` | |
| POST | `/:id/assign` | `ASSET_ASSIGN` | Body: `{toDepartment, toUser?, reason?}` — từ IN_STOCK/RESERVED |
| POST | `/:id/transfer` | `ASSET_ASSIGN` | Body: `{toDepartment?, toUser?("" để gỡ user), reason?}` — ít nhất 1 trong 2 field đích |
| POST | `/:id/return` | `ASSET_ASSIGN` | Body: `{toDepartment?, reason?}` — thu hồi về kho |
| GET | `/:id/assignment-history` | `ASSET_VIEW_DETAIL` | Query: `page,limit(default 20)` |
| POST | `/alerts/run` | `ASSET_ALERTS_TRIGGER` | Chạy tay cron cảnh báo bảo hành/bảo trì |
| GET | `/import/template` | `ASSET_EXCEL_IMPORT` | Tải file mẫu |
| POST | `/import` | `ASSET_EXCEL_IMPORT` | Upload Excel |
| GET | `/lookup/:assetCode` | `ASSET_INVENTORY_CHECK` | Tra cứu theo mã (quét QR) |
| GET | `/:id/qrcode` | `ASSET_VIEW_DETAIL` | Trả ảnh/QR data |
| POST | `/:id/check-in` | `ASSET_INVENTORY_CHECK` | Kiểm kê |
| GET | `/:id/documents` | `DOCUMENT_VIEW` | Document liên quan tới Asset (đề xuất sửa chữa...) |

`AssetStatus` enum: `IN_STOCK | IN_USE | UNDER_MAINTENANCE | RESERVED | DISPOSED | LOST`.

### Asset Categories 🔒
| Method | Path | Permission |
|---|---|---|
| POST | `/api/assets/asset-categories` | `ASSET_CATEGORY_CREATE` |
| GET | `/`, `/:id` | `ASSET_CATEGORY_VIEW` |
| PUT | `/:id` | `ASSET_CATEGORY_UPDATE` |
| DELETE | `/:id` | `ASSET_CATEGORY_DELETE` |
| DELETE | `/:id/permanent` | `ASSET_CATEGORY_DELETE_PERMANENT` |
| PATCH | `/:id/restore` | `ASSET_CATEGORY_UPDATE` |

Body Create: `{code,name,parentCategory?,defaultWarrantyMonths?}`.

### Medical Devices 🔒
| Method | Path | Permission |
|---|---|---|
| POST/GET/PUT | `/:assetId/profile` | `MEDICAL_DEVICE_CREATE/VIEW/UPDATE` |
| POST | `/:assetId/calibration-records` | `MEDICAL_DEVICE_CALIBRATE` |
| GET | `/:assetId/calibration-records` | `MEDICAL_DEVICE_VIEW` |
| POST | `/alerts/run` | `MEDICAL_DEVICE_ALERTS_TRIGGER` |

---

## DASHBOARD 🔒 (tất cả `DASHBOARD_READ`)

⚠️ **Toàn bộ 12 endpoint dashboard KHÔNG có `validateQuery`/Zod DTO nào** (xác nhận grep route file) — query params (`month`,`year`,`daysAhead`,`daysThreshold`,`department`,`fromDate`,`toDate`) được đọc/parse thủ công trong controller (`Number(req.query.x)`), KHÔNG có validate 400 rõ ràng nếu client gửi sai định dạng — có thể trả kết quả rỗng/sai lặng lẽ thay vì báo lỗi. `FRONTEND_RECOMMENDATION`: FE tự validate `month∈[1,12]`/`year` hợp lệ TRƯỚC khi gọi API, không dựa vào backend trả 400.

| Method | Path | Ghi chú |
|---|---|---|
| GET | `/admin-summary` | Tổng quan toàn hệ thống |
| GET | `/department/:departmentId` | Tổng quan theo khoa |
| GET | `/kpi/proposal-conversion` | Query: `department?,fromDate?,toDate?` + pagination |
| GET | `/kpi/device-damage-trend` | |
| GET | `/kpi/top-damaged-devices` | |
| GET | `/kpi/top-damaged-inks` | |
| GET | `/device-stats` | Query: `month?,year?` + pagination — có cache theo key ghép `month:year:page:limit:sortBy:sortOrder` |
| GET | `/assets/summary` | |
| GET | `/assets/warranty-expiring` | Query: `daysAhead` |
| GET | `/assets/maintenance-overdue` | Query: `daysThreshold` |
| GET | `/medical-devices/summary` | |
| GET | `/medical-devices/calibration-due` | Query: `daysAhead` |

---

## NOTIFICATIONS 🔒 (self-scoped, không cần permission riêng)

| Method | Path | Ghi chú |
|---|---|---|
| GET | `/api/notifications` | List thông báo của chính user |
| GET | `/api/notifications/unread-count` | Badge số chưa đọc (header) |
| PATCH | `/api/notifications/:id/read` | Đánh dấu đã đọc 1 thông báo |
| PATCH | `/api/notifications/read-all` | Đánh dấu tất cả đã đọc |
| DELETE | `/api/notifications/:id` | Xoá 1 thông báo |

Model field: `{type, title, message, resourceType, resourceId(dynamic ref theo resourceType), isRead, createdAt}`.

---

## EXCEL DOCUMENT (Import/Export) 🔒

| Method | Path | Permission | Ghi chú |
|---|---|---|---|
| GET | `/api/export/export-documents-excel` | `DOCUMENT_EXCEL_EXPORT` | Streaming (`ExcelJS WorkbookWriter`) — an toàn với dataset lớn |
| GET | `/api/export/template` | `DOCUMENT_EXCEL_TEMPLATE` | Tải file mẫu import |
| POST | `/api/export/import-proposal` | `DOCUMENT_EXCEL_IMPORT` | Giới hạn `MAX_IMPORT_ROWS=5000` dòng/file. Có chế độ `dryRun` (preview trước khi ghi thật — xem `DOCUMENT_DOMAIN_MAP.md`/dev note). Mỗi dòng lỗi được ghi riêng vào `result.errors[]`, KHÔNG dừng cả file (partial-success có chủ đích) |
| POST | `/api/export/departments/sync-from-excel` | `EXCEL_DEPARTMENT_SYNC` | Giới hạn `MAX_SYNC_ROWS=5000` |
| GET | `/api/export/import-history` | `DOCUMENT_EXCEL_HISTORY` | Lịch sử các lần import |

---

## UPLOAD 🔒

| Method | Path | Permission | Ghi chú |
|---|---|---|---|
| POST | `/api/upload` | `UPLOAD_FILES` | `multipart/form-data`, field `files` (mảng). MIME whitelist: PDF, JPEG, PNG, `.docx`, `.xlsx`. Max size mặc định 10MB/file |
| GET | `/api/upload` | `VIEW_FILES` | User thường chỉ thấy file MÌNH upload; ADMIN xem tất cả |
| GET | `/api/upload/:id` | `VIEW_FILE_DETAIL` | 403 nếu không phải chủ file/ADMIN |
| DELETE | `/api/upload/:id` | `DELETE_FILE` | 403 nếu không phải chủ file/ADMIN |

⚠️ 2 route detail/delete trả lỗi 404/403 KHÔNG qua `error.middleware.ts` chuẩn — xem `ERROR_HANDLING.md` Mục 3.

---

## PERFORMANCE 🔒

### GET /api/performances/dashboard
Permission: `PERFORMANCE_VIEW` (chỉ ADMIN theo thiết kế). Không có FE task riêng ở P0-P1 (có thể gộp Dashboard hoặc bỏ qua MVP).
