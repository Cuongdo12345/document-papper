# 04 — DATABASE ANALYSIS

> Phase: 04 — Database Analysis
> Phạm vi: CHỈ database + data access layer (schema/field chi tiết, quan hệ, index, CRUD, query pattern, transaction, data integrity). Không phân tích lại Backend chung (đã ở Phase 03), không phân tích API inventory đầy đủ (Phase 05).
> Nguồn: source code thực tế tại commit `f4ce8e9` (branch `main`), re-clone xác nhận khớp commit với `00_PROJECT_MEMORY.md`.
> Quy ước: **CONFIRMED** = có evidence trực tiếp trong source. **INFERRED** = suy luận hợp lý từ evidence nhưng chưa xác nhận trực tiếp. **UNKNOWN** = chưa đủ evidence. **OBSERVED** = hành vi đọc được từ code. **POTENTIAL RISK** = rủi ro suy ra từ cấu trúc, chưa benchmark.

---

## 1. Database Overview

- Engine: **MongoDB**, 1 database duy nhất, không sharding, không read replica riêng trong code (CONFIRMED, khớp Phase 02).
- ODM: **Mongoose** (`mongoose: ^9.1.5`).
- 21 model, tổ chức theo domain trong `backend/src/models/`.
- `autoIndex: true` được set tường minh trong `mongoOptions` (`database.ts`) — Mongoose tự đồng bộ toàn bộ index khai báo trong schema lên MongoDB mỗi khi app khởi động (không tắt ở production trong code hiện tại, dù comment ghi nhận "prod có thể tắt") — **CONFIRMED**: ở production hiện tại, index vẫn được tự động tạo/đồng bộ lúc `connectDB()` chạy.

---

## 2. Database Technology

| Thành phần | Giá trị | Nguồn |
|---|---|---|
| Engine | MongoDB (version không xác định trong code — không có pin version driver cụ thể ngoài `mongoose: ^9.1.5`) | `backend/package.json` |
| ODM | Mongoose 9.x | `package.json` |
| Driver | MongoDB Node driver (bundled qua Mongoose, không cấu hình driver riêng) | — |
| Kết nối | `mongoose.connect(MONGO_URI, mongoOptions)` | `backend/src/config/database/database.ts` |
| File kết nối chính | `backend/src/config/database/database.ts` — hàm `connectDB()` | CONFIRMED |
| File phụ trợ kết nối | `database.events.ts` (log connected/error/disconnected/reconnected), `database.shutdown.ts` (đóng kết nối khi `SIGINT`/`SIGTERM`, flush performance buffer trước khi đóng), `mongo.logger.ts` (**DEAD CODE** — `registerMongoLogger()` không được gọi ở đâu, đã ghi nhận Phase 03) | CONFIRMED |

### 2.1 Connection lifecycle (CONFIRMED, đọc trực tiếp `database.ts`)

1. Đọc `MONGO_URI` từ env — nếu thiếu, `throw new Error(...)` ngay khi module được import (trước cả khi `connectDB()` được gọi) — fail-fast ở mức module-load.
2. `mongoose.set("strictQuery", false)`.
3. `mongoose.connect(MONGO_URI, mongoOptions)`:
   - `autoIndex: true`
   - `maxPoolSize`: env `MONGO_MAX_POOL_SIZE`, default `20`
   - `minPoolSize`: env `MONGO_MIN_POOL_SIZE`, default `2`
   - `serverSelectionTimeoutMS: 5000`
   - `socketTimeoutMS: 45000`
4. Nếu `connect()` lỗi → `console.error` + `setTimeout(connectDB, 5000)` — **tự retry vô hạn, không giới hạn số lần**, không có backoff tăng dần (luôn đúng 5s).
5. Có 1 khối ~40 dòng code phiên bản cũ bị comment nguyên khối ở đầu file (đã ghi nhận Phase 03, không lặp lại).

### 2.2 Options KHÔNG được cấu hình (OBSERVED, không suy diễn thêm)

- Không có `readPreference` tuỳ chỉnh (dùng mặc định driver: `primary`).
- Không có `writeConcern`/`readConcern` tường minh (dùng mặc định MongoDB, thường `w:1` cho standalone/không chỉ định).
- Không có `retryWrites`/`retryReads` tường minh trong `mongoOptions` (driver mới mặc định `retryWrites: true`, nhưng không được set tường minh trong code — phụ thuộc default của driver version đang dùng).

---

## 3. Connection Architecture

```
server.ts
  → dotenv.config()
  → validate PORT, MONGO_URI (throw nếu thiếu)
  → connectDB()                         (database.ts — mongoose.connect, retry 5s nếu lỗi)
  → registerMongoEvents()               (database.events.ts — log connected/error/disconnected/reconnected)
  → registerMongoShutdown()             (database.shutdown.ts — đóng khi SIGINT/SIGTERM, flush performance buffer)
  → registerCronJobs()                  (chạy SAU khi DB kết nối — cron cần query DB ngay)
  → http.createServer(app).listen(PORT)
```

- 1 connection pool dùng chung cho toàn bộ 21 model, toàn bộ request (khớp kiến trúc monolith đã ghi nhận Phase 02).
- Không có multi-tenant / multi-database routing trong code.

---

## 4. Models — Chi tiết đầy đủ (21 model)

> Ký hiệu: 🔑 = unique, 📇 = có index field-level, 🔗 = reference (ObjectId), ⏱ = TTL index.

### 4.1 `User` (`models/users/user.model.ts`)

| Field | Type | Required | Default | Ghi chú |
|---|---|---|---|---|
| `username` | String | ✅ | — | 🔑 unique, trim |
| `password` | String | ✅ | — | `select: false` — không bao giờ trả về mặc định, phải `.select("+password")` tường minh |
| `fullName` | String | ✅ | — | |
| `email` | String | ❌ | — | 🔑 unique + `sparse: true` (cho phép nhiều user thiếu email cùng lúc, chỉ chặn trùng khi 2 user CÙNG có email); `lowercase`, `trim`. Comment xác nhận đây là field MỚI thêm (migration), user cũ có thể chưa có email → không dùng được quên mật khẩu tới khi cập nhật |
| `role` | ObjectId 🔗 `Role` | ✅ | — | |
| `extraPermissions` | ObjectId[] 🔗 `Permission` | ❌ | `[]` | override cộng thêm quyền |
| `denyPermissions` | ObjectId[] 🔗 `Permission` | ❌ | `[]` | override chặn quyền |
| `department` | ObjectId 🔗 `Department` | ❌ | — | |
| `isActive` | Boolean | ❌ | `true` | |
| `createdAt`/`updatedAt` | Date | — | `Date.now` + `timestamps:true` | khai 2 lần (thủ công + `timestamps`) nhưng không mâu thuẫn |

**Index**: `{department:1}`, `{role:1}`, `{isActive:1}`, `{isActive:1, role:1, department:1, createdAt:-1}` (compound filter+pagination), `{username:"text"}`. Không có middleware/hook (pre/post save) trong file này.

### 4.2 `UserAudit` (`models/users/userAudit.model.ts`)

| Field | Type | Required | Ghi chú |
|---|---|---|---|
| `user` | ObjectId 🔗 `User` | ❌ | |
| `action` | String enum | ✅ | `CREATE, UPDATE, DISABLE, RESTORE, LOGIN, LOGOUT, RESET_PASSWORD, CHANGE_PASSWORD, FORGOT_PASSWORD, AUDIT_DASHBOARD_VIEW, ADMIN_BYPASS, VIEW_DETAIL, DELETE, REGISTER, ASSIGN_ROLE` |
| `performedBy` | ObjectId 🔗 `User` | ❌ | |
| `note` | String | ❌ | |

`timestamps: {createdAt:true, updatedAt:false}` — append-only log, không cần `updatedAt`.
**Index**: `{user:1, createdAt:-1}`, `{performedBy:1, createdAt:-1}`, `{action:1, createdAt:-1}`, `{createdAt:-1}` — thiết kế lại có chủ đích để khớp pattern query thực tế (lọc 1 field + sort `createdAt`, tránh in-memory sort), comment tự ghi nhận đây là bản sửa từ 1 compound-index 4-field cũ kém hiệu quả hơn.

### 4.3 `RefreshToken` (`models/auth/refreshToken.model.ts`)

| Field | Type | Required | Default |
|---|---|---|---|
| `user` | ObjectId 🔗 `User` | ✅ | — |
| `token` | String | ✅ | — |
| `expiresAt` | Date | ✅ | — |
| `revoked` | Boolean | ❌ | `false` |

**Index: KHÔNG có index nào ngoài `_id` mặc định** — CONFIRMED (không có `.index()` nào trong file, không field nào `unique`/`index: true`). Xem mục 9 (Query Analysis) — đây là 1 risk cụ thể vì `token` được query trực tiếp ở `login`/`refresh`/`logout`.

### 4.4 `PasswordResetToken` (`models/auth/passwordResetToken.model.ts`)

| Field | Type | Required | Default | Ghi chú |
|---|---|---|---|---|
| `user` | ObjectId 🔗 `User` | ✅ | — | `index: true` (field-level) |
| `token` | String | ✅ | — | (đã lưu dạng hash, không lưu token thô — theo Phase 03) |
| `expiresAt` | Date | ✅ | — | |
| `used` | Boolean | ❌ | `false` | |

**Index**: `{expiresAt:1}` với `expireAfterSeconds:0` (⏱ TTL — tự xoá đúng thời điểm `expiresAt`), `{token:1}` unique, `{user:1, createdAt:-1}` (dùng cho rate-limit count + xoá token cũ). Comment trong code tự giải thích rõ lý do từng index (khớp evidence với query thực tế ở `auths.service.ts`).

### 4.5 `Role` (`models/rbac/role.model.ts`)

| Field | Type | Required | Ghi chú |
|---|---|---|---|
| `name` | String | ✅ | 🔑 unique |
| `permissions` | ObjectId[] 🔗 `Permission` | ❌ | |

**Index: KHÔNG có index bổ sung** ngoài unique tự động trên `name`. Không có index hỗ trợ `Role.exists({permissions: id})` (dùng trong guard xoá Permission) hay `Role.find({name: {$in:[...]}})` (dùng khi tạo WorkflowTemplate) ngoài `_id`/`name` — truy vấn theo `permissions` (mảng) sẽ collection-scan nếu bảng Role lớn (POTENTIAL RISK — thực tế số lượng Role trong 1 hệ thống nội bộ thường nhỏ, rủi ro thấp).

### 4.6 `Permission` (`models/rbac/permission.model.ts`)

| Field | Type | Required |
|---|---|---|
| `name` | String | ✅ (🔑 unique) |
| `resource` | String | ✅ |
| `action` | String | ✅ |
| `description` | String | ❌ |

**Index: KHÔNG có index bổ sung** ngoài unique trên `name`. Không index trên `resource`/`action` dù các field này có ngữ nghĩa lookup rõ ràng (UNKNOWN liệu có query theo 2 field này ở đâu — cần grep thêm nếu cần).

### 4.7 `Policy` (`models/rbac/policy.model.ts`) — ABAC

| Field | Type | Required | Ghi chú |
|---|---|---|---|
| `name` | String | ✅ | không unique |
| `resource` | String | ✅ | |
| `action` | String | ✅ | |
| `condition` | String | ✅ | biểu thức điều kiện, được đánh giá qua `Policycondition.evaluator.ts` (không dùng `eval` trực tiếp — theo Phase 02) |

**Index: KHÔNG có index nào** ngoài `_id`. Đây là điểm đáng chú ý: `authorizePermission.middleware.ts` query `Policy.find({resource, action})` ở **mỗi lần fallback ABAC** (tức là mỗi request rơi vào nhánh RBAC fail nhưng có bật `enablePolicies`) — không có index nào hỗ trợ filter này → **POTENTIAL RISK**, mức độ phụ thuộc vào số lượng Policy thực tế trong hệ thống (nếu ít Policy, rủi ro thấp; MongoDB vẫn scan toàn collection nhỏ rất nhanh).

### 4.8 `Department` (`models/departments/department.model.ts`)

| Field | Type | Required | Ghi chú |
|---|---|---|---|
| `code` | String | ✅ | 🔑 unique, `uppercase` |
| `name` | String | ✅ | `trim` |

Không có index bổ sung ngoài unique `code`. Bảng nhỏ theo bản chất nghiệp vụ (số khoa/phòng cố định) — rủi ro thiếu index thấp (INFERRED từ ngữ cảnh nghiệp vụ, không phải benchmark).

### 4.9 `Document` (`models/documents/document.model.ts`) — model trung tâm

| Field | Type | Required | Default | Ghi chú |
|---|---|---|---|---|
| `documentCode` | String | ❌ (schema) | — | 🔑 unique index riêng; **thực tế luôn được set** qua `generateDocumentCode()` trước khi tạo (xem mục 6.4) — required ở tầng application, không phải schema |
| `category` | String enum | ✅ | — | `PROPOSAL, REPORT, REFERENCE` |
| `subType` | String enum | ✅ | — | `PROPOSE_REPAIR, PROPOSE_INK, PROPOSE_PROCUREMENT, CHECK_DAMAGE, CONFIRM_STATUS, MANUAL` |
| `title` | String | ✅ | — | |
| `isActive` | Boolean | ❌ | `true` | dùng cho soft-delete |
| `department` | ObjectId 🔗 `Department` | ✅ | — | |
| `createdBy`/`updatedBy`/`deletedBy` | ObjectId 🔗 `User` | ❌ | — | |
| `deletedAt` | Date | ❌ | `undefined` | soft-delete timestamp |
| `serviceDate` | Date | ❌ | — | `index: true` field-level |
| `actualCost` | Number | ❌ | — | |
| `workflowInstanceId` | ObjectId 🔗 `WorkflowInstance` | ❌ | — | |
| `workflowStatus` | String enum | ❌ | `"pending"` | `pending, approved, rejected, cancelled, completed` |
| `relatedAsset` | ObjectId 🔗 `Asset` | ❌ | — | Giai đoạn 3, dùng cho `PROPOSE_REPAIR` và `MANUAL` |
| `referenceTo` | ObjectId[] 🔗 `Document` | ❌ | `[]` | **tự tham chiếu**; validate ở tầng service chỉ cho phép 1 phần tử dù schema là mảng (Phase 03) |
| `meta` | Mixed (`Schema.Types.Mixed`) | ✅ | — | không có schema con cố định — validate shape phụ thuộc hoàn toàn tầng service/DTO, không có ràng buộc DB |
| `signedBy` | Array `{role, user, signedAt}` | ❌ | — | subdocument nhúng (embedded), không phải collection riêng |
| `createdAt`/`updatedAt` | Date | — | `Date.now()` (⚠️ gọi hàm ngay lúc định nghĩa schema, không phải factory — xem mục 8.3) + `timestamps:true` | |

**Index** (nhiều nhất trong toàn hệ thống — 8 index):
- `{documentCode:1}` unique
- `{title:"text", documentCode:"text"}`
- `{subType:1, department:1}`
- `{referenceTo:1}`
- `{department:1, subType:1, createdAt:-1}` (list+filter chính)
- `{createdBy:1}`
- `{createdAt:-1}`
- `{referenceTo:1, category:1, isActive:1, createdAt:1}` — comment xác nhận index này **từng bị comment out** và mới được bật lại (P3.1) để tránh collection-scan ở `findReportsByProposal`.

**Không có index trên `isActive` hay `deletedAt` riêng lẻ** — trong khi nhiều query lọc `{isActive:true, deletedAt:null}` (vd dashboard aggregate, xem mục 9.2) — **POTENTIAL RISK**.

### 4.10 `WorkflowTemplate` (`models/documents/workflowTemplate.model.ts`)

| Field | Type | Required | Default |
|---|---|---|---|
| `name` | String | ✅ | — |
| `steps` | subdocument[] `{stepOrder, name, role}` | — | — |
| `isActive` | Boolean | ❌ | `true` |

`steps[].role` là **String tự do**, không phải ObjectId ref (đã ghi nhận Phase 02 — rủi ro Role đổi tên/xoá làm workflow kẹt).
**Index: KHÔNG có index nào** ngoài `_id`.

### 4.11 `WorkflowInstance` (`models/documents/workflowInstance.model.ts`)

| Field | Type | Required | Default |
|---|---|---|---|
| `documentId` | ObjectId 🔗 `Document` | ❌ | — |
| `templateId` | ObjectId 🔗 `WorkflowTemplate` | ❌ | — |
| `currentStep` | Number | ❌ | `0` |
| `status` | String enum | ❌ | `"pending"` — `pending, approved, rejected, cancelled, completed` |
| `steps` | subdocument[] `{stepOrder, name, role, approvedBy→User, status, comment, approvedAt}` | — | — |

**Index: KHÔNG có index nào** ngoài `_id` — **CONFIRMED, đáng chú ý nhất trong toàn bộ phân tích Phase 04**: đây là model bị query thường xuyên nhất theo nghiệp vụ (mỗi lần approve/reject/xem hộp thư chờ duyệt) nhưng không có bất kỳ index nào trên `documentId`, `status`, hay `steps.role`. Xem mục 9.3 (Query Analysis) để biết query cụ thể bị ảnh hưởng.

### 4.12 `Counter` (`models/documents/counter.model.ts`)

| Field | Type | Required | Default |
|---|---|---|---|
| `key` | String | ✅ | — 🔑 unique |
| `seq` | Number | ❌ | `0` |

`timestamps: false`. Dùng làm bộ sinh số thứ tự atomic cho `documentCode` (xem mục 6.4, 10). Không có field/logic nào khác — model đơn giản nhất trong hệ thống, đúng chủ đích (atomic counter pattern chuẩn của MongoDB).

### 4.13 `Asset` (`models/assets/asset.model.ts`)

| Field | Type | Required | Default | Ghi chú |
|---|---|---|---|---|
| `assetCode` | String | ❌ | — | 🔑 unique + `index:true` |
| `category` | ObjectId 🔗 `AssetCategory` | ✅ | — | |
| `name` | String | ✅ | — | trim |
| `serialNumber`, `model`, `manufacturer` | String | ❌ | — | trim |
| `department` | ObjectId 🔗 `Department` | ✅ | — | |
| `assignedTo` | ObjectId 🔗 `User` | ❌ | — | |
| `location` | String | ❌ | — | |
| `purchaseDate` | Date | ❌ | — | |
| `purchasePrice` | Number | ❌ | — | `min:0` |
| `warrantyExpiredAt` | Date | ❌ | — | `index:true` field-level (phục vụ cron cảnh báo bảo hành) |
| `supplier` | String | ❌ | — | |
| `maintenanceStartedAt`, `warrantyAlertSentAt` | Date | ❌ | — | |
| `lastInventoryCheckAt`/`lastInventoryCheckBy` | Date / ObjectId 🔗 `User` | ❌ | — | kiểm kê QR |
| `status` | String enum | ❌ | `IN_STOCK` | `IN_STOCK, IN_USE, UNDER_MAINTENANCE, RESERVED, DISPOSED, LOST`; `index:true` field-level |
| `isActive` | Boolean | ❌ | `true` | |
| `specs` | Mixed | ❌ | `{}` | |
| `createdBy`/`updatedBy`/`deletedBy` | ObjectId 🔗 `User` | ❌ | — | |
| `deletedAt` | Date | ❌ | `undefined` | |

**Index**: `{department:1, status:1}`, `{category:1, status:1}`, `{assignedTo:1}`, `{name:"text", assetCode:"text", serialNumber:"text"}` + 2 field-level (`assetCode` unique, `warrantyExpiredAt`, `status`).

### 4.14 `AssetCategory` (`models/assets/assetCategory.model.ts`)

| Field | Type | Required | Ghi chú |
|---|---|---|---|
| `code` | String | ✅ | 🔑 unique (explicit `.index()`, không phải field-level), `uppercase`, `trim` |
| `name` | String | ✅ | trim |
| `parentCategory` | ObjectId 🔗 `AssetCategory` (tự tham chiếu, cây phân cấp) | ❌ | |
| `defaultWarrantyMonths` | Number | ❌ | `min:0` |
| `isActive` | Boolean | ❌ | default `true` |
| `deletedBy`/`deletedAt` | ObjectId/Date | ❌ | soft-delete |

**Index**: `{code:1}` unique, `{name:"text"}`. Không có index trên `parentCategory` dù đây là quan hệ cây (self-reference) — truy vấn con theo cha (nếu có) sẽ collection-scan (UNKNOWN — chưa xác nhận có query nào thực sự dùng `parentCategory` làm filter).

### 4.15 `MedicalDeviceProfile` (`models/assets/medicalDeviceProfile.model.ts`)

| Field | Type | Required | Ghi chú |
|---|---|---|---|
| `asset` | ObjectId 🔗 `Asset` | ✅ | — |
| `deviceClass` | String enum (`MedicalDeviceClass`) | ✅ | phân loại A/B/C/D theo README |
| `registrationNumber` | String | ❌ | trim |
| `licenseExpiredAt` | Date | ❌ | |
| `requiresCalibration` | Boolean | ❌ | default `false` |
| `calibrationIntervalMonths` | Number | ❌ | `min:1` |
| `lastCalibrationDate`, `nextCalibrationDueDate`, `calibrationAlertSentAt` | Date | ❌ | |
| `operatorCertificateRequired` | Boolean | ❌ | default `false` |
| `createdBy`/`updatedBy` | ObjectId 🔗 `User` | ❌ | |

**Index**: `{asset:1}` unique (**1-1 với Asset ở tầng DB**, đúng thiết kế "mở rộng đồng hành" đã ghi trong comment — không tách collection riêng cho thiết bị y tế), `{requiresCalibration:1, nextCalibrationDueDate:1}` (phục vụ cron cảnh báo kiểm định — comment tự xác nhận mục đích).

### 4.16 `CalibrationRecord` (`models/assets/calibrationRecord.model.ts`)

| Field | Type | Required | Ghi chú |
|---|---|---|---|
| `deviceProfile` | ObjectId 🔗 `MedicalDeviceProfile` | ✅ | |
| `calibratedAt` | Date | ✅ | |
| `calibratedBy` | String | ✅ | trim — **lưu tên chuỗi tự do, KHÔNG phải ref tới User/đơn vị kiểm định** |
| `result` | String enum (`CalibrationResult`) | ✅ | |
| `certificateFileUrl` | String | ❌ | trim |
| `nextDueDate` | Date | ✅ | |
| `recordedBy` | ObjectId 🔗 `User` | ✅ | người ghi nhận trong hệ thống (khác `calibratedBy` — đơn vị/người thực hiện kiểm định thực tế) |

**Index**: `{deviceProfile:1, calibratedAt:-1}` — phục vụ lấy lịch sử theo thiết bị, mới nhất trước.

### 4.17 `AssetAssignmentHistory` (`models/assets/assetAssignmentHistory.model.ts`)

Nhật ký **bất biến (append-only)** — comment tự xác nhận chủ đích: không update/delete.

| Field | Type | Required | Ghi chú |
|---|---|---|---|
| `asset` | ObjectId 🔗 `Asset` | ✅ | |
| `actionType` | String enum | ✅ | `ASSIGN, TRANSFER, RETURN` |
| `fromDepartment`/`toDepartment` | ObjectId 🔗 `Department` | ❌ | |
| `fromUser`/`toUser` | ObjectId 🔗 `User` | ❌ | |
| `handedOverBy` | ObjectId 🔗 `User` | ✅ | |
| `reason` | String | ❌ | trim |
| `effectiveAt` | Date | ✅ | default `Date.now` |

`timestamps: {createdAt:true, updatedAt:false}`.
**Index**: `{asset:1, effectiveAt:-1}`, `{toUser:1}`, `{toDepartment:1}`.

### 4.18 `Notification` (`models/notifications/notification.model.ts` + `notification.types.ts`)

| Field | Type | Required | Default | Ghi chú |
|---|---|---|---|---|
| `recipient` | ObjectId 🔗 `User` | ✅ | — | `index:true` field-level |
| `createdBy` | ObjectId 🔗 `User` | ❌ | — | optional vì có thể do cron tạo |
| `type` | String enum (`NotificationType`) | ✅ | — | 11 giá trị, mỗi giá trị khớp 1 trigger cụ thể (comment tự liệt kê, không dùng type "chung chung") |
| `title`, `message` | String | ✅ | — | |
| `resourceType` | String enum (`NotificationResourceType`) | ❌ | — | `Document, WorkflowInstance, ImportHistory, Asset` |
| `resourceId` | ObjectId | ❌ | — | **Polymorphic reference thủ công** — không dùng Mongoose `refPath`, không có `ref` tĩnh; populate phải xử lý thủ công ở service (`populateNotificationResource`) — không có ràng buộc DB nào đảm bảo `resourceId` khớp đúng collection của `resourceType` |
| `isRead` | Boolean | ❌ | `false` | `index:true` |
| `readAt` | Date | ❌ | — | |
| `channelsSent` | String[] enum | ❌ | `[]` | |
| `priority` | String enum | ❌ | `NORMAL` | |

**Index**: `{recipient:1, createdAt:-1}`, `{recipient:1, isRead:1, createdAt:-1}` (query chính — 99% traffic theo comment), `{resourceType:1, resourceId:1}`.

### 4.19 `Upload` (`models/uploadFiles/upload.model.ts`)

| Field | Type | Default |
|---|---|---|
| `fileName`, `fileUrl`, `mimeType` | String | — |
| `fileSize` | Number | — |
| `storage` | String enum | `"local"` (`local`/`s3`) — **field khai báo hỗ trợ S3 nhưng theo Phase 03, thực tế code chỉ dùng `diskStorage` (local) — giá trị `"s3"` trong enum hiện là dead option, chưa có code nào set/dùng nhánh S3** |
| `uploadedBy` | ObjectId 🔗 `User` | — |
| `isUsed`, `isDeleted` | Boolean | `false` |

**Index: KHÔNG có index nào** ngoài `_id`.

### 4.20 `ApiPerformance` (`models/apiPerformance/apiPerformance.model.ts`)

| Field | Type |
|---|---|
| `method`, `endpoint` | String |
| `status` | Number |
| `totalTime` | Number |
| `user` | ObjectId 🔗 `User` |
| `isSlow` | Boolean |

**Index**: `{endpoint:1}`, `{createdAt:-1}`, và ⏱ TTL `{createdAt:1}` với `expireAfterSeconds: 2592000` (30 ngày) — tự động xoá log hiệu năng cũ. Comment tự cảnh báo rủi ro vận hành quan trọng: nếu deploy TTL index này lên collection **đã có sẵn dữ liệu cũ hơn 30 ngày**, MongoDB sẽ xoá NGAY ở lần quét đầu tiên (không đợi đủ 30 ngày nữa) — cần export backup trước nếu cần giữ dữ liệu cũ.
Model có 1 khối code phiên bản trước bị comment nguyên (khai 3 field `dbTime/serviceTime/controllerTime` không bao giờ có dữ liệu thật — đã xoá khỏi bản hiện tại, đúng như Phase 03 không ghi nhận field này).

### 4.21 `ImportHistory` (`models/importAudit/importhistory.model.ts`)

| Field | Type | Required | Default |
|---|---|---|---|
| `importedBy` | ObjectId 🔗 `User` | ✅ | `index:true` field-level |
| `fileName` | String | ✅ | — |
| `mode` | String enum | ✅ | `dryRun, commit` |
| `status` | String enum | ✅ | `success, partial, failed` |
| `totalRows`, `created`, `updated`, `reportsCreated`, `errorCount` | Number | ❌ | `0` |
| `errors` | subdocument[] `{row, message}` | ❌ | — |

`timestamps: {createdAt:true, updatedAt:false}`, `suppressReservedKeysWarning: true` (vì `errors` là tên field nội bộ Mongoose reserved — comment tự giải thích quyết định giữ nguyên tên vì API đã trả field này ra ngoài, đổi tên sẽ breaking change).
**Index**: `{importedBy:1, createdAt:-1}`, `{createdAt:-1}`.

---

## 5. Schemas — Tổng hợp đặc điểm chung

- **Không có model nào dùng Mongoose `virtual`** — CONFIRMED, `grep "\.virtual("` trong toàn bộ `models/` không có kết quả nào.
- **Không có model nào dùng schema-level middleware/hook** (`pre`/`post` save, remove, v.v.) — CONFIRMED, không có `\.pre(`/`\.post(` nào trong `models/`. Mọi logic phụ trợ (audit, notification, đồng bộ trạng thái) đều nằm ở tầng Service, không nằm trong Mongoose hook.
- **2 field dùng `Schema.Types.Mixed`**: `Document.meta` (required) và `Asset.specs` (default `{}`) — không có schema con, không validate shape ở tầng DB, phụ thuộc hoàn toàn Zod DTO + validator service.
- **3 quan hệ tự tham chiếu (self-reference)**: `Document.referenceTo → Document`, `AssetCategory.parentCategory → AssetCategory`.
- **1 polymorphic reference thủ công** (không dùng `refPath`): `Notification.resourceId`.
- **2 field lưu vai trò dạng String tự do thay vì ObjectId ref**: `WorkflowTemplate.steps[].role`, `WorkflowInstance.steps[].role` — đã ghi nhận rủi ro ở Phase 02.
- Có **duplicate index tiềm ẩn KHÔNG xảy ra** nhờ thiết kế cẩn thận: comment ở `CalibrationRecord` tự xác nhận đã tránh khai `unique`/`index` ở field-level TRÙNG với `.index()` gọi riêng — cho thấy nhóm phát triển đã từng gặp warning "Duplicate schema index" ở model khác và tự rút kinh nghiệm áp dụng nơi khác trong codebase.

---

## 6. Relationships (đọc trực tiếp từ `ref:`)

```
User        --role-->                 Role
User        --extraPermissions[]-->   Permission
User        --denyPermissions[]-->    Permission
User        --department-->           Department

Role        --permissions[]-->        Permission

Document    --department-->           Department
Document    --createdBy/updatedBy/deletedBy--> User
Document    --workflowInstanceId-->   WorkflowInstance
Document    --relatedAsset-->         Asset
Document    --referenceTo[]-->        Document          (self-reference)
Document.signedBy[].user -->          User               (embedded array field)

WorkflowInstance --documentId-->      Document
WorkflowInstance --templateId-->      WorkflowTemplate
WorkflowInstance.steps[].approvedBy --> User
WorkflowInstance.steps[].role         (STRING TỰ DO — không FK thật, xem 4.11)
WorkflowTemplate.steps[].role         (STRING TỰ DO — validate tên khớp Role chỉ lúc tạo Template)

Asset       --category-->             AssetCategory
Asset       --department-->           Department
Asset       --assignedTo/lastInventoryCheckBy/createdBy/updatedBy/deletedBy--> User
AssetCategory --parentCategory-->     AssetCategory     (self-reference, cây phân cấp)

MedicalDeviceProfile --asset-->       Asset             (1-1, unique index)
MedicalDeviceProfile --createdBy/updatedBy--> User
CalibrationRecord    --deviceProfile--> MedicalDeviceProfile
CalibrationRecord    --recordedBy-->  User

AssetAssignmentHistory --asset-->     Asset
AssetAssignmentHistory --fromDepartment/toDepartment--> Department
AssetAssignmentHistory --fromUser/toUser/handedOverBy--> User

Notification --recipient/createdBy--> User
Notification --resourceId-->          (polymorphic — Document | WorkflowInstance | ImportHistory | Asset, không FK thật)

Upload       --uploadedBy-->          User
ImportHistory --importedBy-->         User
RefreshToken/PasswordResetToken --user--> User
UserAudit    --user/performedBy-->    User
ApiPerformance --user-->              User
```

### 6.1 Phân loại quan hệ (CONFIRMED từ schema)

| Loại | Ví dụ |
|---|---|
| One-to-one (qua unique index) | `MedicalDeviceProfile.asset → Asset` |
| One-to-many (reference, không embed) | `Document.department`, `Asset.category`, `Notification.recipient`, phần lớn còn lại |
| Many-to-many (qua mảng ObjectId) | `Role.permissions[]`, `User.extraPermissions[]/denyPermissions[]` |
| Self-reference | `Document.referenceTo[]`, `AssetCategory.parentCategory` |
| Embedded subdocument (không phải collection riêng) | `WorkflowInstance.steps[]`, `WorkflowTemplate.steps[]`, `Document.signedBy[]`, `ImportHistory.errors[]` |
| Polymorphic reference thủ công | `Notification.resourceId` + `resourceType` |
| "Soft FK" bằng String (không phải ObjectId) | `WorkflowInstance/WorkflowTemplate.steps[].role`, `CalibrationRecord.calibratedBy` |

**Không có** quan hệ nào dùng MongoDB native `$lookup`-only design pattern triệt để (denormalization) — toàn bộ dùng chuẩn "reference + populate" kiểu RDBMS-adjacent, dù MongoDB không ép buộc referential integrity ở tầng DB (không có FK constraint thật — đã ghi nhận Phase 02).

---

## 7. Database Access Flow (Controller → Service → Data Access → Model)

Domain `documents` là domain DUY NHẤT tách riêng tầng "data access thuần" (`documents.query.ts`) khỏi business logic (`document.service.ts`) — khớp Phase 02/03. Các domain khác gọi thẳng Model trong Service (không có `.query.ts` riêng).

### 7.1 Ví dụ: Tạo Document

```
document.controller.ts:createDocuments
  → document.service.ts:createDocumentService(payload)
    → documents.validator.ts:validateDocumentRule / validateReference   (rule nghiệp vụ, DB lookup)
    → documents.query.ts:findPendingRepairProposalForAsset               (Document.findOne — check trùng đề xuất)
    → generateDocumentCode()  → shared/utils/getNext.ts:getNextSequence  (Counter.findOneAndUpdate atomic $inc, NGOÀI transaction)
    → documents.mapper.ts:buildReferenceArray
    → withTransaction(session):
        documents.query.ts:createDocument(data, session)  → Document.create([data], {session})
        UserAudit.create([...], {session})
    → (ngoài transaction) notifyUsersByDepartment → Notification.create
```

### 7.2 Ví dụ: Domain KHÔNG tách `.query.ts` riêng (vd RBAC xoá Permission)

```
rbac.controller.ts → rbac.service.ts:deletePermissionService(id)
  → Permission.findById(id)              (Model gọi thẳng trong Service, không qua data-access layer riêng)
  → Role.exists({permissions:id})        (guard 1)
  → User.exists({$or:[{extraPermissions:id},{denyPermissions:id}]})  (guard 2)
  → permission.deleteOne()
  → clearAllPermissionCache()
```

**Nhận xét (CONFIRMED)**: pattern tách `.query.ts` KHÔNG phải chuẩn chung toàn hệ thống — chỉ domain `documents` áp dụng. Các domain khác (rbac, users, assets, departments) để Service gọi thẳng Model.

---

## 8. CRUD Operations — Entity chính

### 8.1 Document

| Operation | API | Service | DB operation |
|---|---|---|---|
| CREATE | `POST /api/documents/proposal` | `createDocumentService` | `Document.create([...], {session})` trong `withTransaction` |
| READ (list) | `GET /api/documents` | `getAllDocumentsService` (suy luận từ controller — chưa đọc toàn bộ) | `Document.find(filter).populate(...).lean()` (`documents.query.ts:findDocuments`) |
| READ (detail) | `GET /api/documents/:id` | — | `Document.findById` (INFERRED từ pattern, chưa đọc dòng cụ thể) |
| UPDATE | `PUT /api/documents/:id` | `updateDocumentService` | Whitelist field (`title`, `meta` — `DOCUMENT_UPDATE_WHITELIST`, theo Phase 03), chi tiết câu lệnh Mongo CHƯA đọc ở phase này (UNKNOWN — nằm trong 1113 dòng chưa đọc hết của `document.service.ts`) |
| DELETE (1 bản ghi) | `DELETE /api/documents/:id` | `deleteDocumentService` (tên suy luận) | UNKNOWN — chưa xác nhận có gọi `countReportsByProposal` trước khi xoá PROPOSAL hay không (carry-over UNKNOWN từ Phase 03) |
| DELETE (bulk theo tháng) | `DELETE /api/documents/delete-by-month` | `deleteDocumentsByMonthService` | `Document.deleteMany(query)` (`documents.query.ts:deleteDocumentsByFilter`) — **hard delete thật, xem mục 12.1** |
| RESTORE | `PATCH /api/documents/restore/:id` | — | Chỉ chủ sở hữu hoặc Admin (Phase 03) |

### 8.2 Asset

| Operation | Service | DB operation |
|---|---|---|
| Soft DELETE | `deleteAssetService` (suy luận tên) | set `isActive:false` (INFERRED từ comment ở hard-delete, chưa đọc trực tiếp dòng code) |
| Hard DELETE | `hardDeleteAssetService` | `Asset.deleteOne({_id:id})` — **CONFIRMED chỉ cho phép khi `asset.isActive === false`** (đã soft-delete trước), guard bằng permission riêng `ASSET_DELETE_PERMANENT`. Xem rủi ro mồ côi ở mục 12.2. |
| RESTORE | (tồn tại, tên suy luận từ comment "restore") | UNKNOWN chi tiết |

### 8.3 RBAC (Role/Permission/Policy)

| Operation | Service | Guard trước khi xoá |
|---|---|---|
| DELETE Permission | `deletePermissionService` | `Role.exists({permissions:id})` + `User.exists({$or:[extraPermissions, denyPermissions]})` → 409 nếu đang dùng |
| DELETE Role | `deleteRoleService` | `User.countDocuments({role:id})` → 409 nếu > 0. **Không check `WorkflowTemplate/WorkflowInstance.steps[].role`** (vì đó là String-match theo tên, không phải ObjectId ref tới `_id` Role — về mặt kỹ thuật không thể `.exists()` trực tiếp bằng ObjectId, nhưng cũng không thấy check theo TÊN role ở đây) — **CONFIRMED gap**: xoá 1 Role có tên đang được dùng trong `steps[].role` của Template/Instance đang hoạt động vẫn được phép nếu không còn User nào gán Role đó — làm đúng rủi ro đã ghi nhận Phase 02 (workflow kẹt vĩnh viễn) trở thành khả thi hơn (không cần đổi tên Role, chỉ cần xoá Role sau khi đã chuyển hết User sang Role khác). |
| DELETE Policy | (tương tự, `policy.deleteOne()`) | Chưa đọc chi tiết guard (UNKNOWN) |

### 8.4 User / Auth

Đã phân tích chi tiết ở Phase 03 (`register`, `login`, `refresh`, `logout`, `forgotPassword`, `resetPassword`) — không lặp lại, chỉ bổ sung góc nhìn DB:
- `login()`: `User.findOne({username}).select("+password").populate("role","name").populate("department","code name")` — populate 2 tầng field-limited (chỉ lấy field cần).
- `refresh()`: `RefreshToken.findOne({token, revoked:false})` — **KHÔNG có index trên `token`** (xem mục 9.1).
- `logout()`: `RefreshToken.findOneAndUpdate({token, user:userId}, {revoked:true})` — cùng vấn đề thiếu index.

---

## 9. Query Analysis — Query quan trọng & phức tạp

### 9.1 `RefreshToken` — thiếu index trên `token` (CONFIRMED)

```js
// auths.service.ts (login/refresh/logout, theo Phase 03 + xác nhận lại model)
RefreshToken.create({ user, token, expiresAt })
RefreshToken.findOne({ token: X, revoked: false })              // refresh()
RefreshToken.findOneAndUpdate({ token: X, user: userId }, {...}) // logout()
```

Model `refreshToken.model.ts` **không khai bất kỳ index nào** (mục 4.3). Mọi lần user gọi `/refresh-token` hoặc `/logout`, MongoDB phải quét toàn bộ collection `RefreshToken` để tìm đúng `token` — **POTENTIAL RISK tăng dần theo số lượng refresh token tích luỹ** (token cũ không bị xoá tự động — không có TTL index, khác với `PasswordResetToken` có TTL). Đây là điểm khác biệt rõ so với `PasswordResetToken` (đã có `{token:1}` unique + TTL) — cùng loại token nhưng 2 mức độ tối ưu index khác hẳn nhau.

### 9.2 Dashboard — `adminDashboardSummaryService` (`services/dashboard/dashboard.service.ts`)

7 query chạy song song qua `Promise.all`, trong đó 4 là `Document.aggregate`:

```js
Document.aggregate([{ $match: { isActive: true, deletedAt: null } }, { $group: {...} }])
Document.aggregate([{ $match: { category: PROPOSAL, isActive: true, deletedAt: null, createdAt: {$gte: startOfYear} } }, { $group: { _id: {$month:"$createdAt"} } }, { $sort }])
Document.aggregate([...REPORT tương tự...])
Document.aggregate([{ $match: {isActive:true, deletedAt:null} }, { $group: {_id:"$department"} }, { $lookup: departments }, { $unwind }, { $project }, { $sort }])
Document.find({isActive:true, deletedAt:null}).sort({createdAt:-1}).limit(5).populate(2 field).lean()
Department.countDocuments()
User.countDocuments({isActive:true})
```

**Quan sát (OBSERVED)**: mọi query đều `$match`/filter theo `{isActive:true, deletedAt:null}` (đôi khi kèm `category`/`createdAt`) nhưng **không có index nào trên `isActive` hay `deletedAt`** trong `Document` schema (mục 4.9) — chỉ có index ghép `department+subType+createdAt` và `createdAt` đơn. MongoDB có thể tận dụng index `{createdAt:-1}` cho phần sort/range nhưng vẫn phải quét thêm để lọc `isActive`/`deletedAt` trong bộ nhớ nếu selectivity thấp — **POTENTIAL RISK**, đặc biệt khi bảng `Document` lớn dần (dashboard admin thường xuyên được gọi).

`$lookup` sang `departments` trong 1 trong 4 aggregate — quy mô nhỏ (số Department cố định) nên rủi ro thấp (INFERRED).

### 9.3 Workflow — `getPendingApprovalsForRole` (`services/documents/workflow.service.ts`)

```js
const filter = {
  status: "pending",
  $expr: { $eq: [{ $arrayElemAt: ["$steps.role", "$currentStep"] }, role] },
};
WorkflowInstance.find(filter).populate(2).sort({createdAt:1}).skip().limit()
WorkflowInstance.countDocuments(filter)
```

**CONFIRMED — risk cụ thể nhất tìm được ở Phase 04**: đây là endpoint "hộp thư chờ duyệt" (`GET /api/workflows/pending`), gọi thường xuyên bởi mọi user có quyền duyệt. Điều kiện dùng `$expr` + `$arrayElemAt` để so khớp `steps[currentStep].role` ngay trong MongoDB — **nhưng `WorkflowInstance` không có bất kỳ index nào** (mục 4.11), kể cả trên `status`. MongoDB **không thể dùng index cho phần `$expr`** (đánh giá per-document), và cũng không có index cho `status` để ít nhất thu hẹp tập ứng viên trước khi evaluate `$expr` → **mỗi lần gọi endpoint này là 1 COLLSCAN đầy đủ trên toàn bộ `WorkflowInstance`**. Đây là query có nguy cơ cao nhất trong toàn hệ thống theo evidence trực tiếp (comment trong code còn tự nhận "hiệu quả hơn khi số lượng lớn" nhưng nhận định đó CHỈ đúng phần so sánh với "load hết rồi filter ở Node", không đúng so với việc có index hỗ trợ).

### 9.4 `findReportsByProposal` / đếm REPORT theo PROPOSAL (`documents.query.ts`)

Không đọc lại chi tiết hàm (đã có ở Phase 03: `countReportsByProposal`) — chỉ bổ sung: index `{referenceTo:1, category:1, isActive:1, createdAt:1}` được thiết kế đúng shape cho pattern query này (comment trong `document.model.ts` xác nhận rõ, mục 4.9) — **đây là 1 trong số ít nơi index và query pattern đã được đối chiếu khớp nhau tường minh trong chính source code**.

### 9.5 Bulk operations

- `Document.deleteMany(query)` — `deleteDocumentsByMonthService` (mục 12.1).
- `Model.create([...], {session})` dạng mảng — dùng trong mọi `withTransaction` khi cần atomicity nhiều bản ghi.
- `bulkWrite`/`insertMany` xuất hiện ở `services/excel/excel.service.ts` và `services/upload/upload.service.ts` (`Upload.insertMany` theo Phase 03 mục 10.2) — chưa đọc chi tiết câu lệnh `bulkWrite` trong `excel.service.ts` ở phase này (UNKNOWN, để dành nếu cần đọc sâu Business Logic import Excel).

### 9.6 Transaction — danh sách đầy đủ nơi dùng `withTransaction` (bổ sung so với Phase 02/03)

Phase 02/03 chỉ nêu 2 flow (Document tạo mới, Workflow approve). Grep trực tiếp Phase 04 xác nhận **5 file service** thực sự dùng `withTransaction`:

| File | Số lần gọi | Ghi chú |
|---|---|---|
| `services/documents/document.service.ts` | ≥1 (đã trace Phase 02) | Document + UserAudit |
| `services/documents/workflow.service.ts` | ≥1 (đã trace Phase 02) | WorkflowInstance + Document |
| `services/assets/assetDevice/assetAssignment.service.ts` | 3 | Đổi `Asset.assignedTo`/status + ghi `AssetAssignmentHistory` (khớp mục đích nêu trong `mongodb-transaction-setup-guide.md`) |
| `services/assets/assetDevice/calibrationRecord.service.ts` | 1 | Tạo `CalibrationRecord` + cập nhật `MedicalDeviceProfile` (nextCalibrationDueDate...) — INFERRED từ tên file, chưa đọc chi tiết nội dung transaction |
| `services/excel/excel.service.ts` | 1 (bọc quanh 2 write) | Import Excel — tạo `Document` hàng loạt + `ImportHistory`, đúng như mô tả trong `mongodb-transaction-setup-guide.md` §1 |

**`documentCode` được sinh TRƯỚC khi vào `withTransaction`** (qua `Counter.findOneAndUpdate` atomic, không truyền `session`) — CONFIRMED từ `document.service.ts` dòng gọi `generateDocumentCode()` đứng trước dòng `withTransaction(...)`. Hệ quả: nếu transaction sau đó bị abort (lỗi write Document/UserAudit), số thứ tự đã "cấp phát" từ Counter **không được hoàn trả** — tạo ra khoảng trống (gap) trong dãy số `documentCode` của 1 khoa/năm/loại, nhưng **không tạo trùng số** (đúng mục tiêu thiết kế ghi trong comment file `generateDocumentCode.ts`: "documentCode KHÔNG BAO GIỜ trùng"). Đây là đánh đổi có chủ đích (chấp nhận gap để tránh phức tạp hoá transaction), không phải bug.

---

## 10. Indexes — Tổng hợp toàn hệ thống

| Model | Có index ngoài `_id`? | Index nổi bật |
|---|---|---|
| User | ✅ | compound filter+pagination, text search username |
| UserAudit | ✅ | 3 compound (field+createdAt), thiết kế lại có chủ đích |
| RefreshToken | ❌ **KHÔNG CÓ** | — (POTENTIAL RISK, mục 9.1) |
| PasswordResetToken | ✅ | unique token + TTL |
| Role | ❌ (chỉ unique `name`) | — |
| Permission | ❌ (chỉ unique `name`) | — |
| Policy | ❌ **KHÔNG CÓ** | — (POTENTIAL RISK, mục 4.7) |
| Department | ❌ (chỉ unique `code`) | bảng nhỏ, rủi ro thấp |
| Document | ✅ (8 index) | nhiều nhất hệ thống, nhưng thiếu index `isActive`/`deletedAt` |
| WorkflowTemplate | ❌ **KHÔNG CÓ** | — |
| WorkflowInstance | ❌ **KHÔNG CÓ** | — (POTENTIAL RISK cao nhất, mục 9.3) |
| Counter | ❌ (chỉ unique `key`) | đủ dùng, query luôn theo `key` |
| Asset | ✅ | department+status, category+status, text search |
| AssetCategory | ✅ | unique code, text search; thiếu index `parentCategory` |
| MedicalDeviceProfile | ✅ | unique asset (1-1), compound cron kiểm định |
| CalibrationRecord | ✅ | deviceProfile+calibratedAt |
| AssetAssignmentHistory | ✅ | asset+effectiveAt, toUser, toDepartment |
| Notification | ✅ | recipient+createdAt, recipient+isRead+createdAt, resourceType+resourceId |
| Upload | ❌ **KHÔNG CÓ** | — |
| ApiPerformance | ✅ | endpoint, createdAt, TTL 30 ngày |
| ImportHistory | ✅ | importedBy+createdAt, createdAt |

**Tổng kết OBSERVED**: 6/21 model không có bất kỳ index bổ sung nào ngoài `_id` (`RefreshToken`, `Role`, `Permission`, `Policy`, `WorkflowTemplate`, `WorkflowInstance`, `Upload` — thực tế 7/21). Trong đó `RefreshToken`, `Policy`, `WorkflowInstance` có evidence trực tiếp bị query theo field không có index ở tần suất cao (login/refresh/logout, ABAC fallback, hộp thư chờ duyệt).

---

## 11. Data Validation — Tổng hợp theo tầng

| Tầng | Cơ chế | Phạm vi |
|---|---|---|
| Schema (Mongoose) | `required`, `enum`, `unique`, `min`, `trim`, `uppercase`, `lowercase`, `sparse` | Shape cơ bản + 1 số ràng buộc giá trị (enum, min). KHÔNG có custom validator function nào (`grep "validate:"` trong `models/` — cần xác nhận thêm nếu cần, chưa thấy trong các file đã đọc). |
| DTO (Zod) | `dto/<domain>/*.dto.ts`, middleware `validateBody/Params/Query` | Shape đầy đủ hơn schema (type coercion, custom rule Zod) — chạy TRƯỚC khi vào Service. Đã ghi nhận Phase 03: một số route bị comment out `validateQuery` (`GET /documents`, `GET /workflows/pending`). |
| Service (validator riêng) | `documents.validator.ts` và tương đương ở domain khác | Rule phụ thuộc dữ liệu DB (vd `referenceTo` phải cùng `department`, Role phải tồn tại khi tạo WorkflowTemplate) — Zod/Schema không làm được vì cần query DB. |

**Trùng lặp validation (OBSERVED)**: `category`/`subType`/`status` được validate ở CẢ 3 tầng (Mongoose `enum` + Zod DTO enum + service rule `DOCUMENT_RULES`) — không phải bug, là phòng thủ nhiều lớp hợp lý (defense in depth), nhưng nghĩa là sửa 1 enum value phải đồng bộ ở ít nhất 2-3 nơi (Mongoose schema + Zod DTO), rủi ro lệch nếu chỉ sửa 1 chỗ (UNKNOWN — chưa xác nhận có từng xảy ra lệch thật hay không, đây là rủi ro cấu trúc, không phải bug quan sát được).

**Thiếu validation ở tầng Schema cho `Mixed` field**: `Document.meta` và `Asset.specs` hoàn toàn không có ràng buộc shape ở DB — mọi validate phụ thuộc tầng trên (Zod/Service). Nếu Zod DTO có lỗ hổng hoặc route nào quên gắn `validateBody`, dữ liệu tuỳ ý có thể lọt vào field này.

---

## 12. Data Integrity

### 12.1 Hard-delete hàng loạt không kiểm tra tham chiếu — `DELETE /api/documents/delete-by-month` (CONFIRMED, phát hiện MỚI ở Phase 04)

```js
// document.service.ts: deleteDocumentsByMonthService
const query = { createdAt: {$gte, $lte}, ...buildDocumentFilter(filters) };
const result = await deleteDocumentsByFilter(query);   // Document.deleteMany(query) — KHÔNG dùng transaction
```

Route: `DELETE /api/documents/delete-by-month`, guard bằng `authorizePermission("DOCUMENT_DELETE")`, **không có `validateBody`** cho `month`/`year`/filter (comment trong route tự ghi "chưa xử lý ở đây").

**Rủi ro (CONFIRMED theo cấu trúc dữ liệu)**: đây là hard-delete thật (`deleteMany`, không phải set `isActive:false`), không kiểm tra:
- `WorkflowInstance.documentId` đang trỏ tới Document bị xoá → dangling reference.
- `Document.referenceTo[]` của các Document KHÁC (không nằm trong khoảng tháng bị xoá) đang trỏ tới Document bị xoá → REPORT mồ côi PROPOSAL.
- `Notification.resourceId` (khi `resourceType="Document"`) trỏ tới Document đã xoá → lỗi khi FE cố deep-link.
- `Document.workflowInstanceId`/`Asset.relatedAsset` chiều ngược lại cũng có thể lệch.

Comment trong route tự thừa nhận đây là tính năng "P2.9 — Business Improvement, chưa xử lý validation" — cho thấy nhóm phát triển đã biết đây là tính năng chưa hoàn thiện, không phải oversight hoàn toàn không ai biết.

### 12.2 Hard-delete Asset không check `Document.relatedAsset` — comment lỗi thời (CONFIRMED, phát hiện MỚI ở Phase 04)

`hardDeleteAssetService` (`asset.service.ts`) có comment: *"Ghi chú cho Giai đoạn 3: khi đã có field liên kết Document↔Asset (`relatedAsset`), cần bổ sung thêm điều kiện chặn hard-delete... hiện tại (Giai đoạn 1) chưa có field đó nên chưa check được."*

Đối chiếu thực tế: `Document.relatedAsset` **đã tồn tại trong schema hiện tại** (mục 4.9, Giai đoạn 3 đã triển khai — xác nhận qua `document.model.ts` và luồng `PROPOSE_REPAIR`/`syncAssetOnDocumentApproved` ở Phase 02). Nghĩa là điều kiện "Giai đoạn 3" mà comment nhắc tới đã xảy ra, nhưng code `hardDeleteAssetService` **chưa được cập nhật để thêm check** — `grep` xác nhận không có logic nào query `Document.countDocuments({relatedAsset:id})` hay tương tự trong file này.

**Rủi ro CONFIRMED**: hard-delete 1 Asset đang có Document (PROPOSE_REPAIR/MANUAL) tham chiếu qua `relatedAsset` sẽ để lại `Document.relatedAsset` là ObjectId mồ côi (asset không còn tồn tại) — không crash ngay (không có `.populate("relatedAsset")` bắt buộc ở mọi nơi đọc Document, nên không chắc gây lỗi runtime ngay lập tức — UNKNOWN mức độ ảnh hưởng thực tế), nhưng là dữ liệu sai lệch âm thầm đúng loại rủi ro mà `mongodb-transaction-setup-guide.md` mô tả ở mục 1 (dù đây không phải vấn đề transaction mà là vấn đề thiếu kiểm tra tham chiếu trước khi xoá).

### 12.3 RBAC — Role xoá được dù đang dùng trong Workflow Template/Instance (mở rộng phát hiện Phase 02)

Đã nêu ở mục 8.3: `deleteRoleService` chỉ check `User.countDocuments({role:id})`, không check `WorkflowTemplate`/`WorkflowInstance.steps[].role` (theo TÊN, vì đây là String không phải ObjectId). Không có cách nào để `deleteRoleService` biết Role này có đang được dùng trong 1 Template active hay không nếu không tự viết thêm 1 query `WorkflowTemplate.exists({"steps.role": role.name})` — **hiện tại KHÔNG có query như vậy** (CONFIRMED, không thấy trong `rbac.service.ts` phần đã đọc).

### 12.4 Guard tốt đã xác nhận (đối trọng, để khách quan)

- Xoá `Permission`/`Role` có guard đầy đủ chống dangling reference tới `User` (mục 8.3) — thiết kế tốt, có test-case tường minh trong comment (giải thích rõ bug đã từng xảy ra và cách sửa).
- `generateDocumentCode`/`getNextSequence` dùng atomic `findOneAndUpdate + $inc + upsert` — chống race condition đúng chuẩn MongoDB, không dùng `countDocuments` (tránh race condition kinh điển khi 2 request đọc cùng count rồi cùng +1).
- `hardDeleteAssetService` **có** 1 lớp bảo vệ (bắt buộc soft-delete trước + permission riêng `ASSET_DELETE_PERMANENT`) dù chưa đủ (thiếu check `relatedAsset`, mục 12.2).
- `PasswordResetToken` dùng TTL index tự dọn dẹp — tránh tích luỹ dữ liệu vô hạn (khác `RefreshToken` không có cơ chế tương tự — **CONFIRMED bất đối xứng**: `RefreshToken` hết hạn (`expiresAt`) nhưng KHÔNG có TTL index, nghĩa là token hết hạn/`revoked:true` vẫn tồn tại vĩnh viễn trong collection cho tới khi có 1 job dọn dẹp thủ công nào đó — UNKNOWN liệu có cron/script nào làm việc này, không thấy trong `shared/cron/` theo Phase 01/02).

### 12.5 Concurrent update / Race condition khác

- `WorkflowInstance` approve step: đọc bằng `findById`, sửa field trong Node, rồi `wf.save({session})` trong transaction — đây là pattern **read-modify-write không có optimistic locking tường minh** (không dùng `versionKey`/`__v` check tường minh trong code, dù Mongoose mặc định có `__v` và `save()` sẽ tự check version nếu document bị sửa ở nơi khác giữa lúc đọc và lúc save — **INFERRED**: hành vi mặc định của Mongoose `VersionError` áp dụng, nhưng code KHÔNG bắt riêng `VersionError` để retry — nếu 2 approver duyệt đồng thời cùng 1 step, request thứ 2 có thể nhận lỗi `VersionError` ném ra ngoài `withTransaction` thay vì được xử lý gracefully — UNKNOWN vì chưa đọc phần bắt lỗi cụ thể quanh `approveStep`, để dành Phase 08/09 nếu cần đọc sâu).

---

## 13. Important Data Flows (bổ sung góc nhìn Database so với Phase 02)

### 13.1 Sinh `documentCode` (atomic, ngoài transaction chính)

```
Input: category, departmentId, (createdAt optional)
→ generateDocumentCode() [shared/utils/generateDocumentCode.ts]
  → Department.findById(departmentId)  — lấy deptCode, throw 404 nếu không có
  → prefix theo category (PR/RP/RF)
  → counterKey = `${category}-${departmentId}-${year}`
  → getNextSequence(counterKey) [shared/utils/getNext.ts]
    → Counter.findOneAndUpdate({key: counterKey}, {$inc:{seq:1}}, {new:true, upsert:true})  — ATOMIC, không transaction, không race condition
  → format: `${prefix}-${deptCode}-${year}-${seq padded 4 số}`
→ Output: string documentCode, dùng ngay sau đó trong withTransaction để tạo Document
```

### 13.2 Approve Workflow — điểm chạm DB chi tiết hơn Phase 02

```
Input: workflowId, userId, userRole, comment
→ WorkflowInstance.findById(workflowId)                     [KHÔNG có index hỗ trợ — dùng _id nên OK]
→ check status/role (in-memory, không query thêm)
→ withTransaction(session):
    wf.save({session})                                       [read-modify-write, xem 12.5]
    (nếu bước cuối) Document.findByIdAndUpdate(documentId, {workflowStatus}, {session})
→ (ngoài transaction, nếu bước cuối) syncAssetOnDocumentApproved
    → Asset.findByIdAndUpdate(...)  [có index department+status/category+status hỗ trợ nếu filter theo đó, nhưng update theo _id nên không cần]
→ (side-effect) Notification.create(...)                     [có index recipient+createdAt hỗ trợ đọc sau này]
```

---

## 14. Potential Database Risks — Tổng hợp ưu tiên

| # | Risk | Model/File | Mức độ (POTENTIAL, chưa benchmark) | Evidence |
|---|---|---|---|---|
| 1 | `WorkflowInstance` không có index nào, bị query bằng `$expr` ở endpoint tần suất cao (hộp thư chờ duyệt) | `workflowInstance.model.ts`, `workflow.service.ts:getPendingApprovalsForRole` | CAO | Mục 9.3 |
| 2 | `RefreshToken` không có index trên `token`, không có TTL dọn token cũ/revoked | `refreshToken.model.ts` | TRUNG BÌNH–CAO (tăng dần theo thời gian, không tự dọn) | Mục 9.1, 12.4 |
| 3 | Hard-delete hàng loạt Document theo tháng không kiểm tra tham chiếu ngược (WorkflowInstance, referenceTo, Notification) | `deleteDocumentsByMonthService` | CAO (data integrity, không phải performance) | Mục 12.1 |
| 4 | Hard-delete Asset không check `Document.relatedAsset` dù field đã tồn tại (comment lỗi thời) | `hardDeleteAssetService` | TRUNG BÌNH (data integrity) | Mục 12.2 |
| 5 | Xoá Role không check `WorkflowTemplate/WorkflowInstance.steps[].role` theo tên | `deleteRoleService` | TRUNG BÌNH (mở rộng rủi ro đã biết ở Phase 02) | Mục 12.3 |
| 6 | `Policy` không có index trên `resource+action`, query mỗi lần ABAC fallback | `policy.model.ts` | THẤP–TRUNG BÌNH (phụ thuộc số lượng Policy thực tế) | Mục 4.7 |
| 7 | `Document` không có index trên `isActive`/`deletedAt` dù dashboard lọc theo 2 field này thường xuyên | `document.model.ts` | TRUNG BÌNH | Mục 9.2 |
| 8 | `Upload` không có index nào | `upload.model.ts` | THẤP (chưa rõ pattern truy vấn thực tế) | Mục 4.19 |
| 9 | Read-modify-write trên `WorkflowInstance` không có xử lý `VersionError` tường minh khi approve đồng thời | `workflow.service.ts:approveStep` | UNKNOWN mức độ (chưa đọc error-handling chi tiết quanh hàm) | Mục 12.5 |
| 10 | MongoDB replica set — vẫn CHƯA XÁC MINH môi trường production thực tế có đáp ứng (bắt buộc cho toàn bộ 5 file dùng `withTransaction`) | `withTransaction.ts`, `mongodb-transaction-setup-guide.md` | KHÔNG XÁC ĐỊNH ĐƯỢC MỨC ĐỘ (nhị phân: hoặc hoạt động hoàn toàn, hoặc lỗi runtime hoàn toàn ở 5 file) | Mục 2.1, carry-over Phase 02/03 |

---

## 15. Unknowns (chuyển sang phase sau)

- MongoDB có đang chạy replica set ở môi trường thực tế (dev/production) hay không — **vẫn chưa xác minh được từ source code** (chỉ có hướng dẫn setup cho local Windows dev, không phải xác nhận môi trường thật đang chạy gì).
- Nội dung chi tiết `updateDocumentService`/`deleteDocumentService` (câu lệnh Mongo cụ thể, có gọi `countReportsByProposal` trước khi xoá PROPOSAL hay không) — carry-over Phase 03.
- Chi tiết `bulkWrite` trong `excel.service.ts` (câu lệnh cụ thể, có transaction bao ngoài đúng cách hay không ngoài đoạn đã xác nhận ở dòng ~512).
- Có cron/script nào dọn `RefreshToken` hết hạn/revoked hay không (không thấy trong `shared/cron/` ở các phase trước, nhưng `shared/cron/` chưa được đọc toàn bộ file-by-file ở phase nào).
- Xử lý `VersionError` (Mongoose optimistic concurrency) quanh `approveStep` — có bắt riêng để retry hay để lỗi ném thẳng ra `error.middleware.ts`.
- Custom validator function (`validate:` option) ở tầng Mongoose schema — chưa grep xác nhận có/không trong toàn bộ `models/`.
- Guard cụ thể trước khi `policy.deleteOne()` trong `rbac.service.ts` (có check Policy đang được dùng ở đâu không, vì Policy không có "consumer" rõ ràng như Role/Permission).
- Asset soft-delete (`deleteAssetService`) — câu lệnh Mongo cụ thể chưa đọc trực tiếp (chỉ suy luận từ comment ở hard-delete).

---

**PHASE 04 COMPLETED**
