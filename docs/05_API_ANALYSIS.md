# 05 — API ANALYSIS

> Phase: 05 — API Analysis
> Phạm vi: CHỈ API (inventory endpoint thực tế, mapping route→controller→service→DB, request/response, auth/authz mapping, error handling, so sánh với `openAPI.yaml`). Không phân tích lại Database schema chi tiết (Phase 04), không phân tích RBAC/Policy chuyên sâu (Phase 07), không đánh giá security theo mức độ (Phase 09).
> Nguồn: source code thực tế tại commit `f4ce8e9` (branch `main`), re-clone xác nhận khớp commit với `00_PROJECT_MEMORY.md`. Đối chiếu với `backend/src/docs/openAPI.yaml` (4245 dòng).
> Quy ước: **CONFIRMED** = evidence trực tiếp trong source. **INFERRED** = suy luận hợp lý, chưa đọc trực tiếp dòng code. **UNKNOWN** = chưa đủ evidence.

---

## 1. API Architecture (tổng quan, không lặp lại chi tiết Phase 02)

- REST/JSON thuần qua Express Router, không GraphQL/gRPC, không API versioning (`/api/...`, không có `/v1/`).
- 15 route file, 1227 dòng (khớp Phase 03), mount theo 15 prefix trong `app.ts`.
- **CONFIRMED bằng đếm trực tiếp**: tổng cộng **87 path pattern** và **116 operation (method+path)** được định nghĩa trong routes — khớp CHÍNH XÁC với số path/operation trong `openAPI.yaml` (xem mục 9).
- Toàn bộ endpoint (trừ 6 route `/api/auths/*`) đều bắt buộc `authenticate` (JWT) — không có route "hoàn toàn public" nào khác ngoài `register`, `login`, `refresh-token`, `forgot-password`, `reset-password`.
- Response phổ biến nhất: `{ success: boolean, message?: string, data?: any }`, nhưng KHÔNG universal — xem mục 12 (đã mở rộng so với Phase 03).
- 2 nhóm endpoint trả về **không phải JSON**: Excel export (`GET /api/export/export-documents-excel`, `GET /api/export/template`) và Asset export/QR (`GET /api/assets/export`, `GET /api/assets/:id/qrcode`) — stream file nhị phân trực tiếp qua `res` (CONFIRMED tại `excel.controller.ts` — xem mục 5.3).

---

## 2. API Inventory — Đầy đủ 116 endpoint, nhóm theo module

> Cột "Auth" = quyền yêu cầu: `public` / `authenticated` (chỉ JWT) / tên permission RBAC / `role=ADMIN` (check cứng trong controller, không qua `authorizePermission`).

### 2.1 Authentication (`/api/auths`) — 6 endpoint, route: `auth.routes.ts`

| Method | Path | Controller | Service | Auth |
|---|---|---|---|---|
| POST | `/register` | `register` | `AuthService.register` | public (+ `authRateLimiter`) |
| POST | `/login` | `login` | `AuthService.login` | public (+ `authRateLimiter`) |
| POST | `/refresh-token` | `refreshAccessToken` | `AuthService.refresh` | public (+ `authRateLimiter`) |
| POST | `/logout` | `logout` | `AuthService.logout` | authenticated |
| POST | `/forgot-password` | `forgotPassword` | `AuthService.forgotPassword` | public |
| POST | `/reset-password` | `resetPassword` | `AuthService.resetPassword` | public |

### 2.2 Users (`/api/users`) — 10 endpoint, route: `user.routes.ts`

| Method | Path | Controller | Auth |
|---|---|---|---|
| POST | `/` | `createUser` | `USER_CREATE` |
| GET | `/` | `getUsers` | `USER_READ` (⚠️ `validateQuery` comment out — mục 6.2) |
| GET | `/me` | `getMe` | authenticated |
| GET | `/:id` | `getUserById` | `USER_DETAIL` |
| PATCH | `/me` | `updateMe` | authenticated |
| PUT | `/:id` | `updateUser` | `USER_UPDATE` |
| DELETE | `/:id` | `deleteUser` | `USER_DELETE` |
| PATCH | `/restore/:id` | `restoreUser` | `USER_RESTORE` |
| PATCH | `/change-password` | `changePasswordUser` | `USER_CHANGE_PASSWORD` |
| PATCH | `/reset-password/:id` | `resetPasswordByAdmin` | `USER_RESET_PASSWORD` |

### 2.3 User Audit (`/api/user-audits`) — 3 endpoint, route: `userAudit.routes.ts`

| Method | Path | Controller | Auth |
|---|---|---|---|
| GET | `/` | `getAuditLogs` | `AUDIT_VIEW` (⚠️ `validateQuery` comment out) |
| GET | `/export` | `exportAuditLogs` | `AUDIT_VIEW` (dùng chung, không tách quyền export riêng) |
| GET | `/dashboard` | `getAuditDashboard` | `AUDIT_VIEW_DASHBOARD` |

### 2.4 RBAC (`/api/rbac`) — 16 endpoint, route: `rbac.routes.ts`

| Method | Path | Controller | Auth |
|---|---|---|---|
| POST | `/permissions` | `createPermission` | `PERMISSION_CREATE` |
| GET | `/permissions` | `getPermissions` | `PERMISSION_VIEW` (⚠️ `validateQuery` comment out) |
| GET | `/permissions/:id` | `getPermissionById` | `PERMISSION_VIEW` |
| PUT | `/permissions/:id` | `updatePermission` | `PERMISSION_UPDATE` (⚠️ không `validateParams(IdParamDTO)` — mục 6.2) |
| DELETE | `/permissions/:id` | `deletePermission` | `PERMISSION_DELETE` (⚠️ không `validateParams`) |
| POST | `/roles` | `createRole` | `ROLE_CREATE` |
| GET | `/roles` | `getRoles` | `ROLE_VIEW` (⚠️ `validateQuery` comment out) |
| GET | `/roles/:id` | `getRoleById` | `ROLE_VIEW` |
| PUT | `/roles/:id` | `updateRole` | `ROLE_UPDATE` (⚠️ không `validateParams`; body chỉ nhận `name`) |
| DELETE | `/roles/:id` | `deleteRole` | `ROLE_DELETE` (⚠️ không `validateParams`) |
| POST | `/roles/:id/assign-permissions` | `assignPermissionsToRole` | `ROLE_ASSIGN_PERMISSIONS` |
| POST | `/policies` | `createPolicy` | `POLICY_CREATE` |
| GET | `/policies` | `getPolicies` | `POLICY_VIEW` (⚠️ `validateQuery` comment out) |
| GET | `/policies/:id` | `getPolicyById` | `POLICY_VIEW` |
| PUT | `/policies/:id` | `updatePolicy` | `POLICY_UPDATE` (⚠️ không `validateParams`) |
| DELETE | `/policies/:id` | `deletePolicy` | `POLICY_DELETE` (⚠️ không `validateParams`) |

### 2.5 Departments (`/api/departments`) — 5 endpoint, route: `department.routes.ts`

| Method | Path | Auth |
|---|---|---|
| POST | `/` | `DEPARTMENT_CREATE` |
| GET | `/` | `DEPARTMENT_VIEW` |
| GET | `/:id` | `DEPARTMENT_VIEW_DETAIL` |
| PUT | `/:id` | `DEPARTMENT_UPDATE` |
| DELETE | `/:id` | `DEPARTMENT_DELETE` |

(Không có `validateBody`/`validateParams` nào ở toàn bộ 5 route domain này — CONFIRMED, khác hẳn mọi domain khác đã có ít nhất 1 lớp Zod. UNKNOWN mức độ rủi ro thực tế vì chưa đọc `department.service.ts`/`department.controller.ts` chi tiết ở phase này.)

### 2.6 Documents (`/api/documents`) — 8 endpoint, route: `document.route.ts`

| Method | Path | Controller | Service | Auth |
|---|---|---|---|---|
| POST | `/proposal` | `createDocuments` | `createDocumentService` | authenticated **only** — `DOCUMENT_CREATE` bị comment (Phase 03, xác nhận lại) |
| GET | `/` | `getAllDocuments` | `getAllDocumentsService` | `DOCUMENT_VIEW` (⚠️ `validateQuery` comment out — **có bug pagination cụ thể, mục 6.1**) |
| GET | `/:id` | `getDocumentById` | — | `DOCUMENT_DETAIL` |
| PUT | `/:id` | `updateDocuments` | `updateDocumentService` | `DOCUMENT_UPDATE` |
| DELETE | `/delete-by-month` | `deleteDocumentsByMonth` | `deleteDocumentsByMonthService` | `DOCUMENT_DELETE` (không `validateBody` cho `month`/`year` — Phase 04 §12.1) |
| DELETE | `/:id` | `deleteDocuments` | `deleteDocumentService` | `DOCUMENT_DELETE` |
| PATCH | `/restore/:id` | `restoreDocuments` | — | `DOCUMENT_UPDATE` |
| GET | `/:proposalId/reports` | `getReportsByProposals` | `getReportsByProposalService` | `DOCUMENT_VIEW` |

### 2.7 Workflow (`/api/workflows`) — 9 endpoint, route: `workflow.routes.ts`

| Method | Path | Controller | Auth |
|---|---|---|---|
| POST | `/templates` | `createTemplate` | `WORKFLOW_TEMPLATE_CREATE` |
| POST | `/submit` | `submit` | `WORKFLOW_SUBMIT` |
| POST | `/:id/approve` | `approve` | `WORKFLOW_APPROVE` |
| POST | `/:id/reject` | `reject` | `WORKFLOW_REJECT` |
| GET | `/pending` | `getPendingApprovals` | `WORKFLOW_VIEW` (⚠️ `validateQuery` comment out) |
| GET | `/document/:documentId` | `getByDocument` | `WORKFLOW_VIEW` |
| GET | `/:id` | `getById` | `WORKFLOW_VIEW` |
| POST | `/:id/cancel` | `cancel` | `WORKFLOW_CANCEL` |
| POST | `/:id/complete` | `complete` | `WORKFLOW_COMPLETE` |

**Xác nhận lại phát hiện Phase 03** bằng cách đọc toàn bộ file: comment đầu `workflow.routes.ts` nói "CHỦ ĐÍCH KHÔNG THÊM `authorizePermission`" (ghi chú lịch sử), nhưng thực tế **TẤT CẢ 9/9 route đều có `authorizePermission` gắn đầy đủ** — comment không phản ánh đúng trạng thái hiện tại của chính file này (CONFIRMED, không phải suy diễn).

### 2.8 Assets (`/api/assets`) — 19 endpoint, route: `asset.routes.ts`

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| POST | `/` | `ASSET_CREATE` | |
| GET | `/` | `ASSET_VIEW` (⚠️ `validateQuery` comment out) | |
| GET | `/export` | `ASSET_EXCEL_EXPORT` | đặt TRƯỚC `/:id` (đúng thứ tự) |
| GET | `/:id` | `ASSET_VIEW_DETAIL` | |
| PUT | `/:id` | `ASSET_UPDATE` | |
| DELETE | `/:id` | `ASSET_DELETE` | soft-delete |
| DELETE | `/:id/permanent` | `ASSET_DELETE_PERMANENT` | hard-delete, permission riêng (Phase 04 §12.2 — thiếu check `relatedAsset`) |
| PATCH | `/:id/restore` | `ASSET_UPDATE` | |
| POST | `/:id/assign` | `ASSET_ASSIGN` | |
| POST | `/:id/transfer` | `ASSET_ASSIGN` | |
| POST | `/:id/return` | `ASSET_ASSIGN` | |
| GET | `/:id/assignment-history` | `ASSET_VIEW_DETAIL` (⚠️ `validateQuery` comment out) | |
| POST | `/alerts/run` | `ASSET_ALERTS_TRIGGER` | chạy tay, ngoài cron |
| GET | `/import/template` | `ASSET_EXCEL_IMPORT` | |
| POST | `/import` | `ASSET_EXCEL_IMPORT` | `uploadExcel.single("file")` |
| GET | `/lookup/:assetCode` | `ASSET_INVENTORY_CHECK` | |
| GET | `/:id/qrcode` | `ASSET_VIEW_DETAIL` | trả **binary** (QR image, không phải JSON — UNKNOWN định dạng cụ thể, chưa đọc controller) |
| POST | `/:id/check-in` | `ASSET_INVENTORY_CHECK` | |
| GET | `/:id/documents` | `DOCUMENT_VIEW` (cố ý dùng permission Document, không phải Asset) | |

### 2.9 Asset Categories (`/api/assets/asset-categories`) — 7 endpoint

| Method | Path | Auth |
|---|---|---|
| POST | `/` | `ASSET_CATEGORY_CREATE` |
| GET | `/` | `ASSET_CATEGORY_VIEW` (⚠️ `validateQuery` comment out) |
| GET | `/:id` | `ASSET_CATEGORY_VIEW` |
| PUT | `/:id` | `ASSET_CATEGORY_UPDATE` |
| DELETE | `/:id` | `ASSET_CATEGORY_DELETE` |
| DELETE | `/:id/permanent` | `ASSET_CATEGORY_DELETE_PERMANENT` |
| PATCH | `/:id/restore` | `ASSET_CATEGORY_UPDATE` |

### 2.10 Medical Devices (`/api/assets/medical-devices`) — 6 endpoint

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| POST | `/:assetId/profile` | `MEDICAL_DEVICE_CREATE` | |
| GET | `/:assetId/profile` | `MEDICAL_DEVICE_VIEW` | |
| PUT | `/:assetId/profile` | `MEDICAL_DEVICE_UPDATE` | |
| POST | `/:assetId/calibration-records` | `MEDICAL_DEVICE_CALIBRATE` | multipart, upload chứng nhận (PDF/JPEG/PNG, ≤10MB) qua `createUploader` riêng — file cũng lưu **local disk**, cùng rủi ro không có `express.static` (mục 5.4) |
| GET | `/:assetId/calibration-records` | `MEDICAL_DEVICE_VIEW` | |
| POST | `/alerts/run` | `MEDICAL_DEVICE_ALERTS_TRIGGER` | |

### 2.11 Dashboard (`/api/dashboard`) — 12 endpoint, toàn bộ dùng chung permission `DASHBOARD_READ`

`admin-summary`, `department/:departmentId`, `kpi/proposal-conversion`, `kpi/device-damage-trend`, `kpi/top-damaged-devices`, `kpi/top-damaged-inks`, `device-stats`, `assets/summary`, `assets/warranty-expiring`, `assets/maintenance-overdue`, `medical-devices/summary`, `medical-devices/calibration-due` — tất cả GET, `authenticate` + `authorizePermission("DASHBOARD_READ")`.

### 2.12 Notifications (`/api/notifications`) — 5 endpoint, route: `notification.routes.ts`

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/` | authenticated **only** (⚠️ `validateQuery` comment out — mục 6.1) | không `authorizePermission` — CHỦ ĐÍCH (comment: resource sở hữu theo `recipient`, enforce ở service) |
| GET | `/unread-count` | authenticated only | |
| PATCH | `/:id/read` | authenticated only | |
| PATCH | `/read-all` | authenticated only | |
| DELETE | `/:id` | authenticated only | |

### 2.13 Excel/Export (`/api/export`) — 5 endpoint, route: `excel.route.ts`

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/export-documents-excel` | `DOCUMENT_EXCEL_EXPORT` | **stream file Excel** (không JSON — mục 5.3) |
| GET | `/template` | `DOCUMENT_EXCEL_TEMPLATE` | stream file Excel mẫu |
| POST | `/import-proposal` | `DOCUMENT_EXCEL_IMPORT` | `uploadExcel.single("file")`, hỗ trợ `?dryRun=true` |
| POST | `/departments/sync-from-excel` | `EXCEL_DEPARTMENT_SYNC` | `uploadExcel.single("file")` |
| GET | `/import-history` | `DOCUMENT_EXCEL_HISTORY` | JSON |

### 2.14 Upload (`/api/upload`) — 4 endpoint, route: `upload.routes.ts`

| Method | Path | Auth | Response shape thực tế |
|---|---|---|---|
| POST | `/` | `UPLOAD_FILES` | `{message, data}` |
| GET | `/` | `VIEW_FILES` | **mảng trần** `Upload[]` (không có `success`/`message`/`data` wrapper — mục 12) |
| GET | `/:id` | `VIEW_FILE_DETAIL` | **object trần** `Upload` (không wrapper) |
| DELETE | `/:id` | `DELETE_FILE` | `{message}` |

### 2.15 Performances (`/api/performances`) — 1 endpoint

| Method | Path | Auth |
|---|---|---|
| GET | `/dashboard` | authenticated + check `role.name === "ADMIN"` **trong controller** (không qua `authorizePermission` — quyết định thiết kế tường minh trong comment route) |

---

## 3. API Groups (module thực tế)

Khớp hoàn toàn 15 module đã ghi nhận ở Phase 01/02: Authentication, Users (+Audit), RBAC, Departments, Documents (+Workflow), Assets (+Categories, +Medical Devices), Dashboard, Notifications, Excel/Export, Upload, Performances. Không phát hiện module nào mới ở Phase 05.

---

## 4. Endpoint Mapping — Critical Business APIs (đọc trực tiếp source, không ví dụ giả)

### 4.1 `POST /api/documents/proposal`
```
document.route.ts → authenticate → validateBody(CreateDocumentDTO)
  → document.controller.ts:createDocuments
    → document.service.ts:createDocumentService({userId, ...req.body})
      → documents.validator.ts:validateDocumentRule / validateReference
      → documents.query.ts:findPendingRepairProposalForAsset (nếu subType=PROPOSE_REPAIR)
      → generateDocumentCode() → Counter.findOneAndUpdate (atomic, ngoài transaction)
      → withTransaction: Document.create + UserAudit.create
      → (ngoài transaction) notifyUsersByDepartment → Notification.create
  → res.status(201).json({success:true, message, data:doc})
```
(Trùng khớp Phase 02 §9.1, bổ sung: KHÔNG có `authorizePermission` — mục 2.6.)

### 4.2 `POST /api/workflows/:id/approve`
```
workflow.routes.ts → authenticate → authorizePermission("WORKFLOW_APPROVE")
  → validateParams(IdParamDTO) → validateBody(ApproveRejectBodyDTO)
  → workflow.controller.ts:approve → workflow.service.ts:approveStep(workflowId, userId, role, comment)
    → WorkflowInstance.findById → check status/role
    → withTransaction: wf.save + (nếu bước cuối) Document.findByIdAndUpdate
    → (ngoài transaction, nếu bước cuối) syncAssetOnDocumentApproved → Asset.findByIdAndUpdate
    → Notification.create (tới người tạo hoặc role bước kế)
  → res.json({success:true, data:wf})
```
(Trùng khớp Phase 02 §9.2.)

### 4.3 `POST /api/auths/login`
```
auth.routes.ts → authRateLimiter (20/15min, riêng route) → validateBody(LoginDTO)
  → auth.controller.ts:login → auths.service.ts:AuthService.login
    → User.findOne({username}).select("+password").populate("role","name").populate("department","code name")
    → chống enumeration/timing (dummy bcrypt.compare nếu user không tồn tại/inactive)
    → bcrypt.compare thật; sai → 401 (cùng message)
    → generateAccessToken + generateRefreshToken → RefreshToken.create → UserAudit.create({action:"LOGIN"})
  → res.json({message, data:{accessToken, refreshToken, user}})   ⚠️ KHÔNG có field "success" (mục 12)
```
(Trùng khớp Phase 03 §10.1 — có thêm rate-limit trùng lặp ở `app.ts`.)

### 4.4 `GET /api/documents` (list, có bug pagination — CONFIRMED, phát hiện MỚI Phase 05)

```
document.route.ts → authenticate → authorizePermission("DOCUMENT_VIEW")
  [validateQuery(QueryDocumentDTO) BỊ COMMENT OUT]
  → document.controller.ts:getAllDocuments → document.service.ts:getAllDocumentsService(req.query)
    → destructure {page, limit, ...} = query
    → comment trong code: "page/limit đã được QueryDocumentDTO coerce... không còn cần parseInt thủ công"
    → NHƯNG DTO này KHÔNG được gọi (route đã comment) → page/limit tới đây là STRING thô từ query string
      (hoặc `undefined` nếu client không truyền)
    → code CÓ 1 lớp phòng thủ: `Number.isInteger(page) && page > 0 ? page : 1`
      → `Number.isInteger("2")` luôn `false` (kiểm tra type, không parse) → ĐIỀU KIỆN LUÔN FALSE với string
      → KẾT QUẢ: `pageNum` LUÔN = 1, `limitNum` LUÔN = 10, BẤT KỂ client truyền `?page=3&limit=50` gì
    → Document.find(filter).skip(skip).limit(limitNum)...
  → res.json({success:true, data, pagination:{...}})
```

**CONFIRMED**: `GET /api/documents?page=X&limit=Y` hiện **luôn trả về trang 1, 10 bản ghi**, bất kể query string client gửi — do (a) `validateQuery` bị comment out (Phase 03) nên Zod không coerce string→number, và (b) lớp phòng thủ `Number.isInteger()` trong service kiểm tra kiểu dữ liệu (type), không parse giá trị, nên luôn fail với string và rơi về default. Đây là **hệ quả trực tiếp, cụ thể** của phát hiện Phase 03 (chỉ ghi "rủi ro giảm nhẹ vì có whitelist filter"), Phase 05 xác nhận thêm: pagination bị ảnh hưởng thật, không chỉ shape validate.

### 4.5 `GET /api/users` (cùng lớp bug, mức độ khác — CONFIRMED, phát hiện MỚI Phase 05)

```
user.routes.ts → authenticate → authorizePermission("USER_READ")
  [validateQuery(GetUsersQueryDTO) BỊ COMMENT OUT]
  → user.controller (suy luận tên hàm từ router: getUsers) → users.service.ts:getList(query)
    → destructure {page, limit, ...} = query — comment: "Service không cần parseInt... query đã đúng type"
    → KHÔNG có lớp phòng thủ nào (khác Document) — dùng thẳng:
      `const skip = (page - 1) * limit;`
      `.skip(skip).limit(limit)`
```

**CONFIRMED (đọc trực tiếp `users.service.ts:getList`)**: không có `Number.isInteger`/`parseInt` nào bảo vệ. Nếu client KHÔNG truyền `page`/`limit` → `page`/`limit` là `undefined` → `skip = (undefined - 1) * undefined = NaN` → `.skip(NaN)` — hành vi cụ thể của Mongoose/MongoDB driver với `skip(NaN)` **CHƯA XÁC MINH** ở phase này (UNKNOWN: có thể driver throw lỗi runtime, hoặc bỏ qua option). Nếu client CÓ truyền (vd `?page=2&limit=10`, tới đây là string "2"/"10") → do JS tự động ép kiểu số cho toán tử `-`/`*`, `skip = (‑"2"-1)*"10"` tính đúng bằng số, nhưng `.limit("10")` (string) truyền thẳng cho Mongoose — hành vi cụ thể (có tự ép kiểu hay throw) **CHƯA XÁC MINH** (UNKNOWN, cần test runtime, ngoài phạm vi source-code-only ở phase này).

### 4.6 `GET /api/notifications` (cùng lớp bug — CONFIRMED, phát hiện MỚI Phase 05)

```
notification.routes.ts → authenticate [validateQuery(QueryNotificationDTO) BỊ COMMENT OUT]
  → notification.controller.ts:list
    → const {page, limit, isRead, type} = req.query as unknown as {page:number; limit:number; ...}
      ⚠️ đây CHỈ LÀ TypeScript type assertion (biên dịch), KHÔNG chuyển đổi giá trị lúc runtime
    → service.getNotificationsForUser(userId, {page, limit, ...})
      → const skip = (options.page - 1) * options.limit;  (cùng pattern không phòng thủ như Users)
```

**Nhận xét tổng hợp (CONFIRMED)**: đây là **1 lớp lỗi hệ thống lặp lại ở ít nhất 3 domain** (Documents, Users, Notifications) — nguyên nhân gốc giống nhau: code Service được viết với giả định "Zod DTO đã coerce string→number ở tầng route", nhưng route thực tế đã bị comment out `validateQuery` (không rõ lý do — có thể do refactor dở dang, xem Phase 03). Document có 1 lớp phòng thủ (nhưng viết sai — dùng `Number.isInteger` thay vì `Number()`/`parseInt`), Users và Notifications HOÀN TOÀN không có phòng thủ. Asset (`asset.service.ts`) là domain DUY NHẤT dùng đúng `parseInt(page, 10)` — không bị ảnh hưởng bởi việc `validateQuery` bị comment (mục 2.8).

---

## 5. Request/Response Analysis (chi tiết bổ sung, không lặp Phase 02/03)

### 5.1 Path parameters — pattern nhất quán
`validateParams(IdParamDTO)` hoặc `makeIdParamDTO("<name>", "...")` dùng để validate ObjectId ở tầng route — nhưng **KHÔNG áp dụng đồng đều**: `documents`, `workflow`, `assets`, `assetCategory`, `notifications` có đủ; `rbac` (permissions/roles/policies) **THIẾU** `validateParams` ở toàn bộ route `PUT`/`DELETE` theo `:id` (chỉ có ở `GET /:id`) — CONFIRMED đọc trực tiếp `rbac.routes.ts` (mục 2.4). `departments` **KHÔNG có** `validateParams` ở bất kỳ route nào.

### 5.2 Query parameters — 8 route có `validateQuery` bị comment out (tổng hợp, một số đã nêu ở Phase 03)
`GET /documents`, `GET /workflows/pending`, `GET /users`, `GET /rbac/permissions`, `GET /rbac/roles`, `GET /rbac/policies`, `GET /user-audits` (+ `/export`, `/dashboard`), `GET /notifications`, `GET /assets`, `GET /assets/:id/assignment-history`, `GET /assets/asset-categories` — **CONFIRMED 11 route** (đếm lại đầy đủ ở Phase 05, nhiều hơn 3 route Phase 03 từng nêu vì Phase 03 chỉ khảo sát domain Documents/Workflow).

### 5.3 File upload / binary response
- Upload multipart: `uploader.array("files")` (`/api/upload`, disk storage), `uploadExcel.single("file")` (Excel import, memory storage — `assets/import`, `export/import-proposal`, `export/departments/sync-from-excel`), `certificateUploader.single("certificateFile")` (medical device calibration, disk storage, PDF/JPEG/PNG ≤10MB).
- Excel export (`GET /export/export-documents-excel`, `GET /export/template`) **KHÔNG trả JSON** — `exportDocumentsExcelPRO(...)` tự stream file + `res.end()` bên trong, controller không gọi `res.json` sau đó (CONFIRMED, comment tường minh trong `excel.controller.ts`).
- `exportDocumentsExcel` có ràng buộc scope theo department: user không phải ADMIN bị **ghi đè** `department` filter bằng `req.user.department` (không cho tự ý export khoa khác qua query string) — CONFIRMED.

### 5.4 File truy cập qua HTTP — XÁC NHẬN DỨT ĐIỂM open question Phase 03

**CONFIRMED (grep toàn bộ `backend/src`)**: **KHÔNG có bất kỳ `express.static(...)` nào** được gọi ở `app.ts` hay bất kỳ file nào khác. Điều này khẳng định chắc chắn: file lưu tại `backend/uploads/` (qua `/api/upload`) và file chứng nhận kiểm định thiết bị y tế (qua `certificateUploader`) **KHÔNG được serve qua HTTP** bởi chính ứng dụng Express này. Field `fileUrl: "/uploads/<filename>"` trả về trong response CHỈ LÀ 1 CHUỖI GHI TRONG DB — client gọi trực tiếp URL này vào backend sẽ nhận **404** (không route nào khớp `/uploads/*`), trừ khi có 1 reverse proxy/web server khác (Nginx, v.v.) đứng ngoài phạm vi repo này serve thư mục đó (UNKNOWN, ngoài phạm vi source code).

---

## 6. Response Analysis — Bất nhất & lỗi cụ thể

### 6.1 Pagination bug (MỚI — mục 4.4, 4.5, 4.6)
3 domain (Documents, Users, Notifications) có sai lệch giữa giả định code ("DTO đã coerce number") và thực tế route ("`validateQuery` bị comment") — hệ quả: `GET /api/documents` luôn trả trang 1/10 bản ghi bất kể query; `GET /api/users`, `GET /api/notifications` có khả năng lỗi runtime hoặc hành vi không xác định với `page`/`limit` — mức độ chính xác **UNKNOWN** (cần test runtime, không suy diễn thêm).

### 6.2 Response shape — mở rộng bảng Phase 03

| Domain | Shape |
|---|---|
| Documents, Workflow, Dashboard, Assets, Departments (suy luận), RBAC, Excel (`import-history`) | `{success, message?, data?}` — phổ biến nhất |
| Auth | `{message, data}` hoặc `{message, user}` — KHÔNG có `success`, không nhất quán field thứ 2 (Phase 03) |
| Upload — `POST /`, `DELETE /:id` | `{message, data?}` — KHÔNG có `success` |
| **Upload — `GET /`** | **mảng trần** `Upload[]` — không wrapper nào (MỚI, Phase 05) |
| **Upload — `GET /:id`** | **object trần** `Upload` — không wrapper nào (MỚI, Phase 05) |
| Excel export endpoints | Binary stream, không phải JSON |

**Đáng chú ý**: chính `openAPI.yaml` (mục 9) đã tài liệu hoá ĐÚNG các shape bất thường này của Upload (mảng trần, object trần) — cho thấy người viết spec đã đối chiếu source code thực tế khi viết tài liệu, không phải giả định theo pattern chung.

### 6.3 Pagination response field tên không đồng nhất
`documents`: `pagination:{page, limit, total, totalPages}` (suy luận từ đoạn code đọc được, tên field `totalPages`); `users`: `pagination:{page, limit, total, totalPage}` (**thiếu "s"** — `totalPage` khác `totalPages`) — CONFIRMED lệch tên field giữa 2 domain, khách hàng FE (nếu có) phải tự biết map khác nhau cho mỗi domain.

---

## 7. Authorization Mapping (chỉ mapping, không phân tích sâu RBAC — dành Phase 07)

| Kiểu | Số lượng endpoint (ước lượng theo inventory mục 2) | Ví dụ |
|---|---|---|
| Public (không cần token) | 5 | `/auths/register,login,refresh-token,forgot-password,reset-password` |
| Authenticated only (không permission cụ thể) | 8 | `/auths/logout`, `/users/me` (GET/PATCH), `/notifications/*` (5), `/performances/dashboard` (check role trong controller) |
| Permission-based (`authorizePermission`) | 103 | Phần lớn còn lại |

**Điểm bất thường đã CONFIRMED, liệt kê tổng hợp:**
1. `POST /api/documents/proposal` — thiếu permission (Phase 03, xác nhận lại mục 2.6).
2. `GET /api/performances/dashboard` — check `role.name === "ADMIN"` cứng trong controller thay vì qua `authorizePermission`/permission riêng (route tự ghi rõ đây là quyết định thiết kế, không phải thiếu sót).
3. `POST /api/export/export-documents-excel` — check `role.name === "ADMIN"` cứng trong controller (cùng pattern, để quyết định phạm vi filter `department`, không phải để chặn truy cập — mọi user có `DOCUMENT_EXCEL_EXPORT` đều gọi được, ADMIN chỉ khác ở việc được bỏ qua ràng buộc department).
4. `GET /api/assets/:id/documents` — dùng permission `DOCUMENT_VIEW` (không phải `ASSET_*`) — quyết định tường minh, có comment giải thích.

---

## 8. Error Handling (mapping theo API, không lặp chi tiết middleware Phase 03)

- Chuẩn: `ApiError` (`badRequest/unauthorized/forbidden/notFound/conflict/tooManyRequests`) → `catchAsync` → `next(error)` → `error.middleware.ts` → `{success:false, message, errorCode, details?}`.
- **Ngoại lệ CONFIRMED**: domain `upload` — 4/4 controller không theo chuẩn `ApiError`. `uploadFiles` tự `try/catch` trả `res.status(500).json({message})`; `getFileDetail`/`deleteFile` tự `res.status(404).json({message})` trực tiếp (không qua `ApiError.notFound()`); `getFiles` không có xử lý lỗi cục bộ nào (dựa Express 5 tự forward).
- Validation error (Zod, `validateBody/Params/Query`): `400` qua `ApiError.badRequest(..., issues)` — nhất quán ở mọi route CÓ gắn middleware này; các route bị comment (mục 5.2) hoàn toàn KHÔNG có validation error ở tầng route cho các field bị ảnh hưởng.
- 404 "resource not found" đa số qua `ApiError.notFound()` (documents, assets, rbac...) — riêng `upload` tự viết `res.status(404).json({message})` (mục trên).
- 409 Conflict: dùng cho các guard chống dangling reference (RBAC xoá Permission/Role đang dùng — Phase 04 §8.3) và `register` (username/email trùng).

---

## 9. Swagger/OpenAPI Comparison — DOCUMENTED vs IMPLEMENTED

**Phương pháp**: đếm trực tiếp `grep -c "^  /"` (path) và `grep -cE "^    (get|post|put|patch|delete):"` (operation) trong `openAPI.yaml`, đối chiếu tay từng path với inventory mục 2.

| Tiêu chí | Kết quả |
|---|---|
| Tổng path documented trong `openAPI.yaml` | **87** |
| Tổng operation (method+path) documented | **116** |
| Tổng path implemented (routes thực tế) | **87** |
| Tổng operation implemented (routes thực tế) | **116** |
| Path documented nhưng KHÔNG implemented | **0** (không tìm thấy, đối chiếu tay toàn bộ 87 path) |
| Path implemented nhưng KHÔNG documented | **0** (không tìm thấy) |
| Method mismatch | **0** phát hiện được (đối chiếu tay theo từng path — không loại trừ hoàn toàn sai sót nhỏ chưa phát hiện, xem Unknowns) |

**Kết luận (CONFIRMED, đáng chú ý)**: `openAPI.yaml` khớp gần như hoàn hảo với routes thực tế ở mức path/method — đây là mức độ đồng bộ tài liệu-code CAO BẤT THƯỜNG so với phần còn lại của codebase (nhiều dead code, nhiều discrepancy khác đã ghi nhận ở Phase 01/03/04). Bằng chứng bổ sung: `openAPI.yaml` còn tự ghi các cảnh báo bảo mật/thiết kế NGAY TRONG description của từng endpoint (vd endpoint `/documents/proposal` tự ghi rõ "route này hiện chỉ yêu cầu authenticate... mọi user đã đăng nhập đều tạo được Document bất kể quyền" — khớp CHÍNH XÁC với mục 2.6) — cho thấy file này được cập nhật thủ công song song với các đợt sửa code review, không phải sinh tự động 1 lần rồi bỏ quên.

### 9.1 Phát hiện lệch cụ thể: comment lỗi thời về permission "chưa tồn tại" (MỚI, Phase 05)

`openAPI.yaml` tại 4 endpoint Upload (`POST /`, `GET /`, `GET /:id`, `DELETE /:id`) ghi chú: *"⚠️ Permission `UPLOAD_FILES`/`VIEW_FILES`/`VIEW_FILE_DETAIL`/`DELETE_FILE` chưa thấy trong `permission.constant.ts`"*.

**CONFIRMED SAI LỆCH**: đọc trực tiếp `shared/constants/permission.constant.ts` dòng 129–132, cả 4 permission này **ĐÃ TỒN TẠI** đầy đủ. Đây là 1 mismatch nhỏ giữa tài liệu và code — nhưng theo hướng ngược lại thông thường: **code đã đúng, comment trong tài liệu bị lỗi thời** (có thể được viết ở 1 thời điểm trước khi 4 permission này được thêm vào, sau đó không cập nhật lại đúng chỗ). Không phải "documented but not implemented" theo nghĩa API — chỉ là 1 câu ghi chú nội bộ trong file YAML không còn đúng.

### 9.2 Response schema — chỉ đối chiếu mẫu (không đọc hết 116 schema, theo nguyên tắc tối ưu context)

Đối chiếu mẫu 2 endpoint quan trọng nhất:
- `POST /api/documents/proposal`: schema documented `{success, message, data:Document}` — khớp `res.status(201).json({success:true, message, data:doc})` thực tế.
- `GET/POST/DELETE /api/upload*`: schema documented khớp CHÍNH XÁC với response shape bất thường thực tế (mảng trần, object trần) — xem mục 6.2/9.

**UNKNOWN**: chưa đối chiếu chi tiết schema field-by-field cho 114 endpoint còn lại (out of scope cho 1 phase với ngân sách context giới hạn — xem mục 13, để dành verify theo yêu cầu cụ thể nếu cần).

---

## 10. API Dependencies (shared middleware/service/utility dùng chung nhiều API)

- `authenticate`, `authorizePermission` — dùng ở ~103/116 endpoint (mục 7).
- `catchAsync` — dùng ở hầu hết controller trừ `upload` (Phase 03 §9).
- `ApiError` — dùng ở hầu hết trừ `upload`.
- `validateBody/Params/Query` (Zod) — dùng không đồng đều, 11 route bị comment `validateQuery` (mục 5.2), `departments`/1 số route `rbac` thiếu `validateParams`.
- `uploadExcel` (memory storage) dùng chung bởi `assets/import`, `export/import-proposal`, `export/departments/sync-from-excel`.
- `createUploader` (disk storage) dùng chung bởi `upload/*` và `medical-devices/:assetId/calibration-records` (với config `maxSize`/`allowedTypes` khác nhau mỗi nơi gọi).
- Không có external API nào được gọi từ bất kỳ endpoint nào (khớp Phase 02 §8 — chỉ SMTP nội bộ qua Nodemailer, không qua HTTP client).

---

## 11. API Inconsistencies — Tổng hợp ưu tiên (Phase 05)

| # | Vấn đề | Phạm vi | Mức độ | Nguồn |
|---|---|---|---|---|
| 1 | `GET /api/documents` luôn trả trang 1/10 bản ghi, bỏ qua query `page`/`limit` | Documents | CONFIRMED, CAO (tính năng phân trang hỏng thực sự) | Mục 4.4 |
| 2 | `GET /api/users`, `GET /api/notifications` dùng `page`/`limit` không qua coerce/validate — hành vi runtime cụ thể UNKNOWN, rủi ro lỗi hoặc kết quả sai | Users, Notifications | POTENTIAL, mức độ UNKNOWN (cần test) | Mục 4.5, 4.6 |
| 3 | `POST /api/documents/proposal` không có authorization check | Documents | CONFIRMED, đã ghi nhận Phase 03 | Mục 2.6 |
| 4 | 11 route bị comment `validateQuery` — nhiều hơn Phase 03 ghi nhận (3 route) | Documents, Workflow, Users, RBAC(×3), UserAudit(×3), Notifications, Assets(×2) | CONFIRMED | Mục 5.2 |
| 5 | RBAC (Permission/Role/Policy) thiếu `validateParams(IdParamDTO)` ở route PUT/DELETE | RBAC | CONFIRMED, MỚI | Mục 2.4, 5.1 |
| 6 | Departments — không có `validateBody`/`validateParams` ở bất kỳ route nào | Departments | CONFIRMED, MỚI | Mục 2.5 |
| 7 | Response shape Upload: 4 dạng khác nhau trong cùng 1 domain (kể cả mảng/object trần) | Upload | CONFIRMED, mở rộng Phase 03 | Mục 6.2 |
| 8 | Tên field pagination lệch (`totalPages` vs `totalPage`) giữa Documents và Users | Documents, Users | CONFIRMED, MỚI | Mục 6.3 |
| 9 | File upload (`/api/upload`, calibration certificate) không truy cập được qua HTTP — không có `express.static` | Upload, Medical Device | CONFIRMED (giải quyết dứt điểm open question Phase 03) | Mục 5.4 |
| 10 | Comment trong `openAPI.yaml` báo permission Upload "chưa tồn tại" nhưng thực tế đã có trong `permission.constant.ts` | Upload (chỉ tài liệu) | CONFIRMED, MỚI, mức độ THẤP (chỉ ảnh hưởng đọc hiểu, không ảnh hưởng runtime) | Mục 9.1 |

---

## 12. Unknowns (chuyển sang phase sau)

- Hành vi runtime chính xác của Mongoose/MongoDB driver khi `.skip(NaN)` hoặc `.limit("<string>")` được gọi (liên quan mục 4.5, 4.6) — cần test thực tế, ngoài phạm vi source-code-only.
- Nội dung chi tiết `department.controller.ts`/`department.service.ts` — chưa đọc trực tiếp (chỉ xác nhận route thiếu validate).
- Định dạng response cụ thể của `GET /api/assets/:id/qrcode` (QR image format, `Content-Type`) — chưa đọc `asset.controller.ts` phần này.
- Response schema field-by-field cho phần lớn 116 endpoint (chỉ đối chiếu mẫu 2 endpoint ở mục 9.2) — nếu cần đối chiếu đầy đủ, cần task riêng.
- Có hay không 1 reverse proxy/web server ngoài Express serve `backend/uploads/` trong môi trường thực tế (ngoài phạm vi repo, không xác minh được từ source).
- Guard chi tiết (`validateFiles`?) cho phần loại file trong `certificateUploader` — đã biết whitelist mimetype tại route, chưa đọc toàn bộ implementation `createUploader`.

---

**PHASE 05 COMPLETED**
