# API REFERENCE (Frontend-facing)

> Nguồn: `backend/src/docs/openAPI.yaml` + route/controller/service/DTO source thật (xác minh trực tiếp 2026-09-03). Đây là bản diễn giải cho FE developer — không phải copy máy móc OpenAPI. Response wrapper/error shape chung: xem `ERROR_HANDLING.md`. Permission/role: xem `AUTH_RBAC_MAP.md`.
>
> Ký hiệu: 🔒 = cần `authenticate`. Permission ghi ngay sau 🔒 nếu có; không ghi = chỉ cần `authenticate` (self-scoped).

---

## AUTH

### POST /api/auths/register
**[2026-09-29, DEV-090/BR-01] Mặc định TẮT: trả 404 nếu ENV backend `ALLOW_SELF_REGISTER` khác `"true"`. Frontend không dùng route này.** Purpose: Đăng ký tài khoản mới. Auth: public. Body: `{username, email, password≥8, confirmPassword, fullName}`. Response: `{message, data}`. Errors: 400 (trùng username/email, mật khẩu không khớp). Notes: KHÔNG tự động login — điều hướng `/login` sau khi thành công.

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
| POST | `/api/documents/proposal` | `DOCUMENT_CREATE`. **[2026-09-29, DEV-092/BR-03]** `department` phải là khoa của người tạo, trừ ADMIN hoặc người có `DOCUMENT_CREATE_ALL_DEPARTMENTS` (403 nếu vi phạm) |
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
Permission: `WORKFLOW_SUBMIT`. Body: `{documentId, templateId}`. **[2026-09-29, DEV-091/BR-02]** Backend kiểm tra:
- 404: tài liệu không tồn tại hoặc đã xoá.
- 403: tài liệu thuộc khoa khác và người gọi không phải Admin (user không có khoa cũng bị 403).
- 400: workflow gần nhất đang `pending`/`approved`/`completed`. Chỉ gửi duyệt khi chưa có workflow, hoặc workflow gần nhất `rejected`/`cancelled`.

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

> **[DEV-115, 2026-10-08; GĐ 8 DEV-120, 2026-10-09] Tách module — 2 prefix:** `/api/it-assets` (Thiết bị CNTT) và `/api/medical-assets` (Thiết bị y tế). Frontend dùng từ FE-42. Các bảng dưới đây mô tả route CHUNG của cả hai module (path tương đối so với prefix); cột Permission viết `{IT,MEDICAL}_ASSET_X` = `IT_ASSET_X` ở `/api/it-assets` hoặc `MEDICAL_ASSET_X` ở `/api/medical-assets`.
> Khác với route `/api/assets*` đã gỡ: (1) quyền `IT_ASSET_*` / `MEDICAL_ASSET_*` (danh mục: `*_ASSET_CATEGORY_*`); (2) chỉ thấy/sửa tài sản và danh mục thuộc loại của module — id loại khác (tài sản, danh mục, kế hoạch bảo trì, chứng chỉ) trả **404** kể cả với ADMIN, bulk trả id đó trong `failed`; (3) tạo tài sản/nhập Excel với danh mục khác nhánh → 400 (Excel: lỗi theo dòng); (4) `alerts/run`, `export`, lịch bảo trì chỉ xử lý loại của module.
> Đường dẫn con (cả 2 module): `/categories` (thay `/asset-categories`), `/maintenance-plans`. Chỉ `/api/medical-assets`: `/:assetId/profile`, `/:assetId/calibration-records[...]` (thay `/medical-devices/:assetId/...`), `/calibration-alerts/run` (thay `/medical-devices/alerts/run`), `/operator-certificates[...]` (thay `/api/operator-certificates`); quyền `MEDICAL_DEVICE_*`, `OPERATOR_CERTIFICATE_*` giữ nguyên. Danh mục gốc tạo qua module tự mang loại của module.
> **[DEV-116, Giai đoạn 5]** Thêm `GET|PUT /api/it-assets/:assetId/profile` (hồ sơ CNTT; PUT = upsert, `null`/"" xoá trường; trả `warnings[]` `DUPLICATE_IP`; GET trả `data: null` khi chưa có hồ sơ; quyền `IT_ASSET_VIEW_DETAIL`/`IT_ASSET_UPDATE`) và **`/api/software-licenses`** (quyền `SOFTWARE_LICENSE_*`): `POST|GET /`, `GET|PUT|DELETE /:id`, `PATCH /:id/restore`, `POST /:id/assign|unassign` body `{asset}` (400 khi hết slot / máy đã gán / máy không phải CNTT / máy đã thanh lý), `PUT /:id/proof-file` (multipart `proofFile`), `GET /:id/proof-file/download`, `POST /alerts/run`. Danh sách trả `usedSeats/freeSeats/isExpired` không kèm mảng máy; `?asset=<id>` lọc bản quyền của 1 máy. Thanh lý/xoá thiết bị tự gỡ khỏi mọi bản quyền.
> **[DEV-118, Giai đoạn 6]** (1) `GET /api/dashboard/assets/summary|warranty-expiring|maintenance-overdue` nhận thêm `?assetType=IT|MEDICAL` (không truyền = cả hai loại như trước; sai giá trị -> 400; có truyền thì cần thêm quyền xem đúng loại `IT_ASSET_VIEW`/`MEDICAL_ASSET_VIEW`, thiếu -> 403); `summary` trả thêm `byAssetType`. (2) **MỚI** `GET /api/assets/lookup-options` (`?keyword&assetType&department&page&limit<=100`): tra cứu tài sản cho ô chọn ở Tài liệu/Hợp đồng; cần MỘT TRONG HAI `IT_ASSET_VIEW`/`MEDICAL_ASSET_VIEW`, chỉ trả loại người gọi xem được (yêu cầu loại không có quyền -> 403), chỉ `_id, assetCode, name, assetType, status, department, category`; route này KHÔNG bị gỡ ở Giai đoạn 8. (3) Cảnh báo: thiết bị CNTT gửi IT; thiết bị y tế (bảo hành/bảo trì/kiểm định/giấy phép/chứng chỉ vận hành) gửi Phòng Vật tư-TTB và IT, mỗi user 1 thông báo.
> **[DEV-119, Giai đoạn 7]** Thêm `GET /api/assets/lookup-options/:id` (một trong hai quyền xem; trả 1 tài sản kèm `assetType`, kể cả đã xoá mềm với `isActive:false`; loại người gọi không xem được → 404): dùng cho link Thông báo/Tài liệu/Hợp đồng và `/app/assets/:id` cũ. `GET /api/contracts*` populate `assets.assetType`. Frontend (FE-42→44) đã chuyển toàn bộ sang `/api/it-assets`, `/api/medical-assets`, `/api/software-licenses`, `/api/assets/lookup-options`.
> **[DEV-120, Giai đoạn 8]** Đã GỠ: `/api/assets*` (trừ `/api/assets/lookup-options[/:id]`), `/api/assets/medical-devices*`, `/api/assets/asset-categories*`, `/api/assets/maintenance-plans*`, `/api/operator-certificates*` — gọi sẽ trả 404. 20 quyền cũ `ASSET_*` / `ASSET_CATEGORY_*` cũng đã gỡ khỏi role và catalog. Chi tiết: `docs/development/tasks/DEV-115.md`, `DEV-120.md`.

| Method | Path | Permission | Ghi chú |
|---|---|---|---|
| POST | `/` | `{IT,MEDICAL}_ASSET_CREATE` | Body: `{category,department,name,serialNumber?,model?,manufacturer?,location?,purchaseDate?,purchasePrice?,warrantyExpiredAt?,supplier?,specs?}` |
| GET | `/` | `{IT,MEDICAL}_ASSET_VIEW` | Query: `page,limit,keyword,department,category,status(enum AssetStatus),sortBy(free string, default createdAt),order` |
| GET | `/export` | `{IT,MEDICAL}_ASSET_EXCEL_EXPORT` | Blob response |
| GET | `/:id` | `{IT,MEDICAL}_ASSET_VIEW_DETAIL` | |
| PUT | `/:id` | `{IT,MEDICAL}_ASSET_UPDATE` | CHỦ Ý không cho sửa `status`/`assignedTo`/`department` — phải qua assign/transfer/return |
| DELETE | `/:id` | `{IT,MEDICAL}_ASSET_DELETE` | Soft-delete |
| DELETE | `/:id/permanent` | `{IT,MEDICAL}_ASSET_DELETE_PERMANENT` | Guard: chặn nếu còn `MedicalDeviceProfile` (DEV-012). Action KHÔNG THỂ HOÀN TÁC — cần confirm dialog nghiêm ngặt (xem `UI_DESIGN_SYSTEM.md` cũ/`SHARED_COMPONENTS_LIBRARY.md`) |
| PATCH | `/:id/restore` | `{IT,MEDICAL}_ASSET_UPDATE` | |
| POST | `/:id/assign` | `{IT,MEDICAL}_ASSET_ASSIGN` | Body: `{toDepartment, toUser?, reason?}` — từ IN_STOCK/RESERVED |
| POST | `/:id/transfer` | `{IT,MEDICAL}_ASSET_ASSIGN` | Body: `{toDepartment?, toUser?("" để gỡ user), reason?}` — ít nhất 1 trong 2 field đích |
| POST | `/:id/return` | `{IT,MEDICAL}_ASSET_ASSIGN` | Body: `{toDepartment?, reason?}` — thu hồi về kho |
| GET | `/:id/assignment-history` | `{IT,MEDICAL}_ASSET_VIEW_DETAIL` | Query: `page,limit(default 20)` |
| POST | `/alerts/run` | `{IT,MEDICAL}_ASSET_ALERTS_TRIGGER` | Chạy tay cron cảnh báo bảo hành/bảo trì |
| GET | `/import/template` | `{IT,MEDICAL}_ASSET_EXCEL_IMPORT` | Tải file mẫu |
| POST | `/import` | `{IT,MEDICAL}_ASSET_EXCEL_IMPORT` | Upload Excel |
| GET | `/lookup/:assetCode` | `{IT,MEDICAL}_ASSET_INVENTORY_CHECK` | Tra cứu theo mã (quét QR) |
| GET | `/:id/qrcode` | `{IT,MEDICAL}_ASSET_VIEW_DETAIL` | Trả ảnh/QR data |
| POST | `/:id/check-in` | `{IT,MEDICAL}_ASSET_INVENTORY_CHECK` | Kiểm kê |
| GET | `/:id/documents` | `DOCUMENT_VIEW` | Document liên quan tới Asset (đề xuất sửa chữa...) |

`AssetStatus` enum: `IN_STOCK | IN_USE | UNDER_MAINTENANCE | RESERVED | DISPOSED | LOST`.

### Asset Categories 🔒 (`/categories`, quyền `{IT,MEDICAL}_ASSET_CATEGORY_*`)
| Method | Path | Permission |
|---|---|---|
| POST | `/categories` | `{IT,MEDICAL}_ASSET_CATEGORY_CREATE` |
| GET | `/`, `/:id` | `{IT,MEDICAL}_ASSET_CATEGORY_VIEW` |
| PUT | `/:id` | `{IT,MEDICAL}_ASSET_CATEGORY_UPDATE` |
| DELETE | `/:id` | `{IT,MEDICAL}_ASSET_CATEGORY_DELETE` |
| DELETE | `/:id/permanent` | `{IT,MEDICAL}_ASSET_CATEGORY_DELETE_PERMANENT` |
| PATCH | `/:id/restore` | `{IT,MEDICAL}_ASSET_CATEGORY_UPDATE` |

Body Create: `{code,name,parentCategory?,defaultWarrantyMonths?,assetType?}`.

**[DEV-112, 2026-10-08] Loại tài sản (`assetType`: `IT` | `MEDICAL`):** danh mục gốc BẮT BUỘC có `assetType` (thiếu → 400); danh mục con KHÔNG gửi (gửi → 400), kế thừa từ gốc. PUT gỡ cha (`parentCategory: null`) phải kèm `assetType`. Đổi nhánh/đổi loại khi nhánh còn tài sản → 400. Khôi phục danh mục không thuộc nhánh nào → 400. Tài sản (`Asset.assetType`) do backend gán theo gốc danh mục; đổi `category` sang nhánh khác loại → 400; hồ sơ thiết bị y tế chỉ cho tài sản `MEDICAL`; chứng chỉ vận hành chỉ cho danh mục nhánh y tế.

### Medical Devices 🔒 (chỉ `/api/medical-assets`)
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
| POST | `/api/upload` | `UPLOAD_FILES` | `multipart/form-data`, field `files` (mảng). MIME whitelist: PDF, JPEG, PNG, `.docx`, `.xlsx`. Max size mặc định 10MB/file; **tối đa 10 file/request** (BR-15/DEV-103, vượt → 400 `MULTER_LIMIT_FILE_COUNT`) |
| GET | `/api/upload` | `VIEW_FILES` | User thường chỉ thấy file MÌNH upload; ADMIN xem tất cả |
| GET | `/api/upload/:id` | `VIEW_FILE_DETAIL` | 403 nếu không phải chủ file/ADMIN |
| DELETE | `/api/upload/:id` | `DELETE_FILE` | 403 nếu không phải chủ file/ADMIN |

Lỗi của nhóm Upload đi qua `error.middleware.ts` chuẩn `{success:false, message, errorCode}` (BR-22/DEV-108; trước đây 404/403 chỉ có `{message}`). `POST` không kèm file → 400 `BAD_REQUEST`. `GET /api/upload/:id/download` (`VIEW_FILE_DETAIL`) tải nội dung file, cùng guard chủ file/ADMIN.

---

## PERFORMANCE 🔒

### GET /api/performances/dashboard
Permission: `PERFORMANCE_VIEW` (chỉ ADMIN theo thiết kế). Không có FE task riêng ở P0-P1 (có thể gộp Dashboard hoặc bỏ qua MVP).
