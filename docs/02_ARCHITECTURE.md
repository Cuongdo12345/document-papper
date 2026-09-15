# 02 — ARCHITECTURE ANALYSIS

> Phase: 02 — Architecture Analysis
> Phạm vi: chỉ phân tích KIẾN TRÚC (không đánh giá chất lượng code, không phân tích nghiệp vụ chi tiết ngoài mức cần thiết để hiểu kiến trúc).
> Nguồn: source code thực tế tại commit `f4ce8e9` (branch `main`).

---

## 1. Overall Architecture

Đây là kiến trúc **monolith, layered theo domain**, backend-only, giao tiếp REST/JSON:

```
Client (chưa xác định — không có frontend trong repo)
        │  HTTP/JSON
        ▼
Express App (backend/src/app.ts)
        │
        ▼
Middleware pipeline (global) → Router (theo domain) → Middleware (route-level)
        │
        ▼
Controller (theo domain) → Service (business logic) → Model (Mongoose) → MongoDB
        │
        ▼
Response JSON chuẩn hoá { success, message, data }
```

Đặc điểm kiến trúc tổng thể:
- **Không phải microservices** — 1 process Node.js duy nhất (`server.ts`), 1 kết nối MongoDB dùng chung cho toàn bộ domain.
- **Layered theo domain (vertical slicing)**: mỗi domain (documents, assets, rbac, ...) có đủ 5 lớp riêng (`routes/`, `controllers/`, `services/`, `models/`, `dto/`), không tách theo lớp ngang toàn cục.
- **Không có API Gateway, không có message queue, không có service mesh.**
- **Cross-domain coupling xảy ra ở tầng Service** (gọi thẳng sang service/model của domain khác) — xem mục 7 "Module Dependencies".
- **Không có cache layer bên ngoài (Redis/Memcached)** — chỉ có cache in-memory (`Map`) cho permission, xem mục 6.
- **Không có background job queue riêng (BullMQ, v.v.)** — tác vụ định kỳ dùng `node-cron` chạy ngay trong cùng process.

---

## 2. Frontend Architecture

**Không tồn tại.** Repo tại thời điểm phân tích chỉ có `backend/`. Không có thư mục `client/`, `web/`, `app/`, không có React/Vue/Angular, không có state management. Mọi mục "Frontend" trong sơ đồ truy vết ở mục 9 chỉ mang tính giả định (client bất kỳ gọi REST API).

---

## 3. Backend Architecture

### 3.1 Entry point & bootstrap

`backend/server.ts`:
1. Load `.env` (`dotenv.config()`).
2. Validate bắt buộc `PORT`, `MONGO_URI` — throw ngay nếu thiếu (fail-fast).
3. `connectDB()` → kết nối MongoDB.
4. `registerMongoEvents()`, `registerMongoShutdown()` — hook log sự kiện kết nối + graceful shutdown.
5. `registerCronJobs()` — đăng ký cron **sau khi** DB đã kết nối (cron cần query DB được ngay).
6. Tạo `http.createServer(app)` và `listen(PORT)`.
7. Bắt `unhandledRejection` / `uncaughtException` toàn cục → đóng server, `process.exit(1)`.

### 3.2 Express app (`backend/src/app.ts`)

Thứ tự middleware toàn cục (quan trọng vì ảnh hưởng hành vi runtime):

1. Gắn `req.id` (UUID) + header `X-Request-Id` — phục vụ correlate log/lỗi.
2. `helmet()` — HTTP security headers.
3. `cors()` — origin lấy từ `CLIENT_URL`, `credentials: true`.
4. `express.json({ limit: "10mb" })`.
5. `compression()`.
6. `cookieParser()`.
7. `morgan("dev")` — chỉ khi `NODE_ENV === "development"`.
8. `rateLimit` (20 req/15 phút) — áp riêng cho prefix `/api/auths`.
9. `performanceMiddleware` — đo thời gian xử lý mỗi request (toàn cục, mọi route).
10. `setupSwagger(app)` — phục vụ `/api-docs`.
11. 13 nhóm route domain (mount theo prefix `/api/...`).
12. `errorHandler` — global error handler, đặt cuối cùng.

Danh sách route mount (`app.ts`):

| Prefix | Router file |
|---|---|
| `/api/documents` | `routes/documents/document.route.ts` |
| `/api/departments` | `routes/departments/department.routes.ts` |
| `/api/auths` | `routes/auth/auth.routes.ts` |
| `/api/users` | `routes/users/user.routes.ts` |
| `/api/user-audits` | `routes/users/userAudit.routes.ts` |
| `/api/performances` | `routes/performances/performance.routes.ts` |
| `/api/dashboard` | `routes/dashboard/dashboard.route.ts` |
| `/api/export` | `routes/excel/excel.route.ts` |
| `/api/upload` | `routes/upload/upload.routes.ts` |
| `/api/workflows` | `routes/documents/workflow.routes.ts` |
| `/api/rbac` | `routes/rbac/rbac.routes.ts` |
| `/api/notifications` | `routes/notifications/notification.routes.ts` |
| `/api/assets/asset-categories` | `routes/assets/assetCategory.routes.ts` |
| `/api/assets/medical-devices` | `routes/assets/medicalDevice.routes.ts` |
| `/api/assets` | `routes/assets/asset.routes.ts` |

Lưu ý thứ tự mount: `/api/assets/asset-categories` và `/api/assets/medical-devices` được mount **trước** `/api/assets` — bắt buộc, nếu không Express sẽ khớp nhầm các path con này vào router `assetRoutes` tổng quát hơn.

### 3.3 Layer trong mỗi domain

Một domain điển hình (vd `documents`) có cấu trúc:

```
routes/documents/document.route.ts       # định nghĩa endpoint + gắn middleware
  → middlewares (authenticate, authorizePermission, validateBody/Params/Query)
  → controllers/documents/document.controller.ts   # nhận req, gọi service, format response
    → services/documents/document.service.ts       # business logic chính
      → services/documents/documents.validator.ts  # validate rule nghiệp vụ (không phải shape)
      → services/documents/documents.mapper.ts      # build filter/mapping dữ liệu
      → services/documents/documents.query.ts       # các hàm query Mongoose thuần (data access)
        → models/documents/document.model.ts        # Mongoose schema
```

Pattern này lặp lại (với mức độ tách file khác nhau) ở các domain khác. Domain `documents` là domain tách rõ nhất (`.validator.ts`, `.mapper.ts`, `.query.ts`, `.types.ts`, `.constants.ts` riêng biệt trong `services/documents/`) — cho thấy đây là domain phức tạp nhất và được refactor nhiều nhất (khớp với ghi nhận ở Phase 01: `services/` là thư mục lớn nhất).

### 3.4 Cross-cutting concerns (`shared/`)

- `shared/errors/ApiError.ts` — class lỗi chuẩn hoá (`badRequest`, `notFound`, `unauthorized`, `forbidden`, ...), dùng xuyên suốt mọi service/controller thay vì `throw new Error()` trần.
- `shared/utils/catchAsync.ts` — wrapper bọc controller async, tự bắt lỗi và gọi `next(error)` → đưa vào `error.middleware.ts`.
- `shared/utils/withTransaction.ts` — helper bọc MongoDB multi-document transaction qua `session.withTransaction()`. **Yêu cầu tiên quyết: `MONGO_URI` phải là replica set**, nếu không sẽ lỗi `Transaction numbers are only allowed on a replica set member`.
- `shared/cache/` — cache in-memory (xem mục 6).
- `shared/cron/` — cron job đăng ký tập trung qua `registerCronJobs()`.
- `shared/performance/` — hỗ trợ `performanceMiddleware` ghi nhận thời gian xử lý (liên kết tới model `apiPerformance`).
- `shared/constants/` — hằng số permission (`permission.constant.ts`, `permission.descriptors.ts`, `rolePermission.map.ts`) dùng chung cho RBAC.
- `shared/utils/Policycondition.evaluator.ts` — parser/evaluator "an toàn" (chống RCE) để đánh giá `condition` của Policy (ABAC), dùng chung bởi cả `authorizePermission.middleware.ts` (lúc runtime check) và `rbac.service.ts` (lúc validate cú pháp khi tạo/sửa Policy) — tránh 2 bản logic parse trùng nhau.

---

## 4. Database Architecture

- **Loại**: MongoDB, single database, truy cập qua Mongoose ODM.
- **Kết nối**: `backend/src/config/database/database.ts` — `connectDB()`, bắt buộc `MONGO_URI`, tự retry sau 5s nếu lỗi kết nối lần đầu (không giới hạn số lần retry).
- **Pool**: `maxPoolSize` (mặc định 20, qua `MONGO_MAX_POOL_SIZE`), `minPoolSize` (mặc định 2, qua `MONGO_MIN_POOL_SIZE`).
- **Transaction**: dùng multi-document ACID transaction của MongoDB (`mongoose.startSession()` + `session.withTransaction()`), áp dụng cho các chuỗi ghi ảnh hưởng ≥2 collection (vd tạo `Document` + `UserAudit`; tạo `WorkflowInstance` + update `Document`). **Điều kiện bắt buộc: MongoDB phải chạy dạng replica set** — đây là một ràng buộc hạ tầng quan trọng, không thấy có xác nhận trong `.env`/docs là môi trường thực tế đã đáp ứng điều kiện này hay chưa (cần xác minh ở phase Deployment/Infra).
- **Không có sharding, không có cấu hình đọc/ghi tách biệt (read replica) trong code.**
- **21 Mongoose model**, tổ chức theo thư mục con domain trong `src/models/`:

| Domain | Models |
|---|---|
| Users | `user.model.ts`, `userAudit.model.ts` |
| Auth | `refreshToken.model.ts`, `passwordResetToken.model.ts` |
| RBAC | `role.model.ts`, `permission.model.ts`, `policy.model.ts` |
| Departments | `department.model.ts` |
| Documents | `document.model.ts`, `workflowTemplate.model.ts`, `workflowInstance.model.ts`, `counter.model.ts` |
| Assets | `asset.model.ts`, `assetCategory.model.ts`, `assetAssignmentHistory.model.ts`, `medicalDeviceProfile.model.ts`, `calibrationRecord.model.ts` |
| Notifications | `notification.model.ts` |
| Upload | `upload.model.ts` |
| Performance | `apiPerformance.model.ts` |
| Import Audit | `importhistory.model.ts` |

### 4.1 Quan hệ dữ liệu chính (suy ra từ `ref:` trong schema)

```
User        --role-->        Role        --permissions-->  Permission
User        --extraPermissions/denyPermissions--> Permission
User        --department-->  Department

Document    --department-->  Department
Document    --createdBy/updatedBy/deletedBy--> User
Document    --workflowInstanceId--> WorkflowInstance
Document    --relatedAsset--> Asset
Document    --referenceTo[]--> Document        (tự tham chiếu — vd CONFIRM_STATUS trỏ về PROPOSE_REPAIR)

WorkflowInstance --documentId--> Document
WorkflowInstance --templateId--> WorkflowTemplate
WorkflowInstance.steps[].approvedBy --> User
WorkflowInstance.steps[].role        (LƯU DẠNG STRING, không phải ObjectId ref tới Role —
                                       validate khớp tên tại thời điểm tạo Template, xem mục 7)

Asset       --category-->    AssetCategory
Asset       --department-->  Department
Asset       --currentUser/lastInventoryCheckBy/createdBy/updatedBy/deletedBy--> User

Notification --recipient/createdBy--> User
```

Điểm đáng chú ý về mặt kiến trúc dữ liệu:
- `WorkflowInstance.steps[].role` là **string tự do**, không phải `ObjectId` tham chiếu cứng tới `Role` — validate tính hợp lệ chỉ xảy ra tại **thời điểm tạo WorkflowTemplate** (`createWorkflowTemplate` query `Role.find({name: {$in: roleNamesInSteps}})`), không có ràng buộc DB-level (không có foreign key thật trong MongoDB). Nếu 1 `Role` bị đổi tên hoặc xoá sau khi Template đã tạo, `WorkflowInstance` cũ sẽ tham chiếu tới 1 role-name không còn tồn tại → bước duyệt "kẹt" vĩnh viễn (đã được ghi nhận trong comment source).
- README (theo Phase 01) cảnh báo không xoá trực tiếp collection cốt lõi (`User`, `Role`, `Department`) rồi tạo lại — vì MongoDB sẽ sinh `_id` mới, làm gãy toàn bộ `ObjectId` reference đang lưu rải rác ở các document khác (không có cascade/constraint tự động như RDBMS).

---

## 5. API Architecture

- **Kiểu**: REST thuần qua Express Router, request/response dạng JSON.
- **Chuẩn hoá response**: `{ success: boolean, message?: string, data?: any }` — pattern lặp lại ở hầu hết controller (vd `document.controller.ts`).
- **Chuẩn hoá lỗi**: mọi lỗi nghiệp vụ throw qua `ApiError` (có `statusCode` gắn sẵn: `badRequest`=400, `unauthorized`=401, `forbidden`=403, `notFound`=404), được `catchAsync` bắt và chuyển tới `error.middleware.ts` xử lý tập trung — controller không tự `res.status().json()` khi có lỗi.
- **Validation**: Zod schema (`dto/<domain>/*.dto.ts`) gắn qua middleware `validateBody` / `validateParams` / `validateQuery`, chạy **trước** khi vào controller. Đây là lớp validate SHAPE (kiểu dữ liệu, field bắt buộc); validate RULE nghiệp vụ (phụ thuộc dữ liệu DB, phụ thuộc field khác) nằm ở tầng Service (vd `documents.validator.ts`).
- **API Documentation**: OpenAPI/Swagger, định nghĩa tại `src/docs/openAPI.yaml` (~160K, chưa đọc chi tiết nội dung), phục vụ qua `setupSwagger(app)` tại `/api-docs`.
- **Rate limiting**: chỉ áp dụng cho `/api/auths` (toàn bộ prefix), không có rate-limit riêng cho các domain khác ở tầng `app.ts` (có `authRateLimiter.middleware.ts` riêng gắn thêm vào 1 số route cụ thể trong `auth.routes.ts` theo Phase 01).
- **Không có API versioning** (không có `/api/v1/...`).
- **Không có GraphQL, không có gRPC** — thuần REST.

---

## 6. Authentication Architecture

Kiến trúc auth gồm 2 middleware tách biệt, chạy nối tiếp:

### 6.1 `authenticate` (`middlewares/auth.middleware.ts`)
1. Lấy Bearer token từ header `Authorization`.
2. `jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] })` — whitelist thuật toán tường minh (chống algorithm confusion).
3. Validate `decoded.id` là `ObjectId` hợp lệ trước khi query DB.
4. Load `User` từ DB (chỉ select `_id, role, department, isActive`, populate `role.name`) — **không** load permission ở bước này.
5. Gắn `req.user = { _id, role, department, isActive, permissions: [] }` (permissions để rỗng, xử lý sau).

### 6.2 `authorizePermission(permissions, options)` (`middlewares/authorizePermission.middleware.ts`)
Chạy sau `authenticate`, theo thứ tự:
1. Nếu chưa có `req.user` → 401.
2. **Super Admin bypass**: nếu `user.role.name === "ADMIN"` → cho qua ngay (ghi audit log best-effort qua `UserAudit.create`, không chặn request nếu ghi audit lỗi). *Lưu ý kiến trúc*: bypass dựa trên so khớp chuỗi tên role (`"ADMIN"`), không phải 1 cờ hệ thống riêng — rủi ro nếu có role trùng tên "ADMIN" được tạo nhầm với mục đích khác.
3. **RBAC check**: gọi `getCachedPermissions(userId)` (cache in-memory, TTL 5 phút, fallback gọi `getUserEffectivePermissions`) → so khớp `requiredPermissions` (mode `some` hoặc `every` tuỳ `options.requireAll`).
4. Nếu RBAC pass → cho qua.
5. **ABAC fallback** (chỉ khi `options.enablePolicies && options.resource && options.action`): query `Policy` theo `resource`+`action`, đánh giá từng `policy.condition` qua `evaluatePolicyConditionSafely` (evaluator tự viết, không dùng `eval`/`Function` trực tiếp — mục đích chống RCE) với context `{ user, resource: req.resource }`. Nếu bất kỳ policy nào pass → cho qua.
6. Nếu không có gì pass → 403.

### 6.3 Effective Permissions (`services/rbac/permission.service.ts`)

```
getUserEffectivePermissions(userId):
  finalPermissions = (role.permissions ∪ user.extraPermissions) − user.denyPermissions
```

Có guard chống lỗi khi dữ liệu tham chiếu "mồ côi" (role đã bị xoá, permission đã bị xoá nhưng vẫn còn nằm trong mảng tham chiếu) — `.filter(Boolean)` trước khi map.

### 6.4 Cache permission (`services/rbac/permission.cache.ts`)
- Cache **in-memory** (`Map<userId, {permissions, cachedAt}>`), TTL 5 phút.
- `clearPermissionCache(userId)` — xoá cache 1 user (gọi khi role của user đó đổi).
- `clearAllPermissionCache()` — xoá toàn bộ cache (gọi khi 1 Permission bị sửa/xoá, vì không xác định trước phạm vi ảnh hưởng).
- **Giới hạn kiến trúc quan trọng**: cache là `Map` cục bộ trong process — nếu chạy nhiều instance/pod, lệnh clear chỉ có hiệu lực trên đúng 1 instance xử lý request đó; các instance khác giữ cache cũ tới khi hết TTL. Cần Redis hoặc cơ chế pub/sub invalidate nếu scale ngang nhiều instance (điều này đã được ghi chú ngay trong source).

### 6.5 Token & Password
- JWT access + refresh token (`refreshToken.model.ts` lưu refresh token trong DB — cho phép revoke).
- `passwordResetToken.model.ts` cho luồng quên mật khẩu.
- `bcrypt` hash mật khẩu.
- Route auth: `/register`, `/login`, `/refresh-token`, `/logout`, `/forgot-password`, `/reset-password` (tất cả có `validateBody`; `/login`, `/register`, `/refresh-token` có thêm `authRateLimiter` riêng).

---

## 7. Module Dependencies

Xác định qua import thực tế trong `services/*.service.ts` (không suy diễn).

```
Documents ──▶ Assets          (workflow.service.ts gọi assetMaintenance.service khi document
                                PROPOSE_REPAIR/CONFIRM_STATUS được duyệt xong — chuyển trạng thái Asset)
Documents ──▶ Notifications   (document.service.ts, workflow.service.ts gọi
                                notifyUsersByDepartment / notifyUsersByRoleName / createNotification
                                khi tạo document, khi có bước duyệt mới, khi duyệt xong)
Documents ──▶ RBAC            (workflow.service.ts: createWorkflowTemplate validate steps[].role
                                khớp với Role có thật trong collection roles)
Documents ──▶ Users           (document.service.ts, workflow.service.ts ghi UserAudit,
                                lấy createdBy/department của User)

RBAC      ──▶ Users           (permission.service.ts populate role/extraPermissions/denyPermissions
                                từ User; rbac.service.ts kiểm tra user đang dùng Role/Permission
                                trước khi cho xoá)

Auth      ──▶ Users           (auth.service.ts thao tác trực tiếp User model để login/register)
Auth      ──▶ RBAC            (gián tiếp: user.role populate qua User model)

Dashboard ──▶ Documents, Assets, MedicalDevice, Users, Departments
              (dashboard.service.ts, assetDashboard.service.ts, medicalDeviceDashboard.service.ts
               import THẲNG model của các domain khác — KHÔNG gọi qua service — để tổng hợp
               thống kê, đây là điểm coupling chặt nhất trong hệ thống)

Excel     ──▶ Departments, ImportAudit, (+ domain đang export tuỳ endpoint)
              (excel.service.ts đọc thẳng model Department + ghi ImportHistory)

Cron (assetAlerts, medicalDeviceAlerts) ──▶ Assets, Notifications
              (assetAlerts.service.ts / medicalDeviceAlerts tương tự kiểm tra Asset sắp hết hạn
               bảo hành/kiểm định rồi gửi Notification)

Middlewares (authorizePermission) ──▶ RBAC (Policy, permission.cache) + Users (UserAudit)
```

### Giải thích dependency quan trọng nhất: Documents ↔ Assets ↔ Notifications ↔ RBAC

Đây là cụm phụ thuộc trung tâm của hệ thống (business core), vì workflow duyệt tài liệu là nơi hội tụ hầu hết domain khác:

- **Documents → RBAC**: khi tạo `WorkflowTemplate`, mỗi bước duyệt (`steps[].role`) phải khớp tên với 1 `Role` có thật (query `Role.find`) — ràng buộc business-level, không phải ràng buộc DB (không có foreign key MongoDB).
- **Documents → Assets**: khi `WorkflowInstance` duyệt xong bước cuối (`approveStep`, `isLastStep === true`), hệm thống gọi `syncAssetOnDocumentApproved` (bọc try/catch, lỗi không rollback document) để tự động đổi trạng thái `Asset` (`UNDER_MAINTENANCE` / `IN_USE` / `DISPOSED`) tuỳ `document.subType` (`PROPOSE_REPAIR`, `CONFIRM_STATUS`). Đây là **side-effect nằm ngoài transaction chính**, chủ đích để lỗi đồng bộ Asset không làm hỏng nghiệp vụ duyệt document đã hoàn tất.
- **Documents → Notifications**: mỗi lần chuyển bước duyệt (submit / approve / reject) đều bắn `Notification` tới nhóm user có `role` khớp bước tiếp theo (`notifyUsersByRoleName`), hoặc tới người tạo document khi có kết quả cuối (`createNotification`). Đây là side-effect **đồng bộ (await)** nhưng nằm sau khi transaction DB đã commit.
- **Chiều ngược lại KHÔNG tồn tại**: Assets/Notifications/RBAC không import ngược lại bất kỳ thứ gì từ `services/documents/` — dependency là **một chiều** (Documents là domain phụ thuộc nhiều nhất vào domain khác, không phải domain bị phụ thuộc).

### Nhận xét kiến trúc

- Phần lớn cross-domain coupling nằm ở **tầng Service gọi thẳng Service/Model khác** — không có event bus, không có domain event, không có interface/abstraction trung gian. Nghĩa là muốn đổi hành vi 1 domain bị phụ thuộc (vd đổi enum `AssetStatus`), phải rà tay các domain gọi tới nó (`workflow.service.ts`, dashboard services).
- `Dashboard` là domain có **coupling rộng nhất nhưng nông nhất** — chỉ đọc dữ liệu (aggregate/count), không ghi, nên rủi ro thấp hơn dù số lượng phụ thuộc nhiều.
- `Documents`/`Workflow` là domain có **coupling sâu nhất** — vừa đọc vừa ghi chéo sang Assets, vừa phát sinh Notification, vừa phụ thuộc dữ liệu RBAC để validate.

---

## 8. External Services

Xác định từ dependency thực tế (`package.json`, Phase 01) — **không có external service nào chạy qua network ngoài MongoDB**:

| Loại | Công nghệ | Ghi chú |
|---|---|---|
| Database | MongoDB | Duy nhất, qua `MONGO_URI` |
| Email | Nodemailer | Gửi qua SMTP (cấu hình cụ thể trong `.env`, chưa đọc chi tiết) — dùng cho Notification (`sendEmail: true`) và có thể cho reset password. Template email tại `src/views/email/*.ejs`. |
| File export | ExcelJS, `docx` | Sinh file server-side, không gọi API ngoài. |
| QR Code | `qrcode` | Sinh QR nội bộ (không rõ dùng ở domain nào cụ thể — cần đọc thêm ở phase Assets/Documents). |
| Upload lưu trữ | Multer | Lưu file — cần xác minh ở phase sau: lưu local disk hay cloud storage (S3, v.v.) — Phase 01 không xác nhận có SDK cloud storage nào trong dependencies. |

**Không có**: payment gateway, SMS gateway, third-party auth (OAuth/SSO), message queue (Kafka/RabbitMQ), external API tích hợp (ERP, HIS, v.v.), CDN, search engine (Elasticsearch).

---

## 9. Data Flow & Request/Response Flow (truy vết theo flow quan trọng)

### 9.1 Flow: Tạo Document (proposal)

```
[Client] ─POST /api/documents/proposal, Bearer token, body─▶
  app.ts (middleware toàn cục: requestId, helmet, cors, json, compression, cookieParser,
          rateLimit theo prefix (không áp cho /api/documents), performanceMiddleware)
  ▼
  document.route.ts:
    authenticate                              (middlewares/auth.middleware.ts)
      → verify JWT, load User (role, department, isActive), gắn req.user
    validateBody(CreateDocumentDTO)            (middlewares/validate.middleware.ts + dto/documents/documents.dto.ts)
      → Zod parse req.body, 400 nếu sai shape
  ▼
  createDocuments                              (controllers/documents/document.controller.ts)
    → gọi createDocumentService({ userId: req.user._id, ...req.body })
  ▼
  createDocumentService                        (services/documents/document.service.ts)
    → validateDocumentRule(category, subType)          (documents.validator.ts — rule nghiệp vụ)
    → validateReference({ rule, referenceTo, department }) (documents.validator.ts — DB lookup)
    → (nếu subType = PROPOSE_REPAIR) kiểm tra relatedAsset bắt buộc + không trùng đề xuất pending
      → findPendingRepairProposalForAsset (documents.query.ts) → Document.findOne(...)
    → withTransaction(session):
        createDocument(data, session)            (documents.query.ts) → Document.create([data], {session})
        UserAudit.create([...], {session})       (models/users/userAudit.model.ts)
    → (side-effect ngoài transaction) notifyUsersByDepartment(...) → Notification.create (models/notifications/notification.model.ts)
  ▼
  [MongoDB] ghi Document + UserAudit (transaction), ghi Notification (ngoài transaction)
  ▼
  document.controller.ts trả res.status(201).json({ success: true, message, data: doc })
  ▼
[Client] nhận JSON response
```

### 9.2 Flow: Duyệt 1 bước Workflow (approve)

```
[Client] ─POST /api/workflows/:id/approve, Bearer token, { comment }─▶
  workflow.routes.ts:
    authenticate
    authorizePermission("WORKFLOW_APPROVE")     (middlewares/authorizePermission.middleware.ts)
      → nếu role = ADMIN: bypass + audit log; else check RBAC cache (permission.cache.ts
        → permission.service.ts nếu cache miss) → nếu vẫn fail, thử ABAC Policy (không bật
        ở route này vì thiếu options.resource/action) → 403 nếu fail hết
    validateParams(IdParamDTO), validateBody(ApproveRejectBodyDTO)
  ▼
  approve (controllers/documents/workflow.controller.ts)
    → gọi approveStep(workflowId, userId, req.user.role.name, comment)
  ▼
  approveStep (services/documents/workflow.service.ts)
    → WorkflowInstance.findById(workflowId)
    → check wf.status === "pending" (chặn thao tác trên workflow đã kết thúc)
    → check step.role === role truyền vào (chặn sai vai trò)
    → cập nhật step (approved/approvedBy/approvedAt), tăng currentStep hoặc set status=approved
    → withTransaction(session):
        wf.save({session})
        (nếu bước cuối) Document.findByIdAndUpdate(documentId, {workflowStatus: "approved"}, {session})
    → (ngoài transaction, chỉ khi bước cuối) syncAssetOnDocumentApproved(document, userId)
        → startAssetMaintenanceService / resolveAssetMaintenanceService (services/assets/assetDevice/assetMaintenance.service.ts)
          → Asset.findByIdAndUpdate(...) đổi status (UNDER_MAINTENANCE / IN_USE / DISPOSED)
    → (side-effect) createNotification(...) tới document.createdBy  HOẶC
      notifyUsersByRoleName(...) tới role phụ trách bước kế tiếp
  ▼
  workflow.controller.ts trả res.json({ success: true, data: wf })
  ▼
[Client] nhận JSON response
```

### 9.3 Nhận xét về Request/Response flow

- Toàn hệ thống dùng chung 1 pattern: **middleware validate shape → controller mỏng (không chứa logic) → service chứa toàn bộ logic → data-access tách riêng (`*.query.ts`) ở domain phức tạp**.
- Response luôn qua controller, không có service nào tự trả response — giữ tách biệt HTTP layer khỏi business layer.
- Lỗi luôn đi qua `next(error)` (nhờ `catchAsync` bọc controller) → tập trung ở `error.middleware.ts` — không có controller nào tự xử lý lỗi cục bộ (không xác minh 100% mọi file, nhưng pattern nhất quán ở các file đã đọc).
- Side-effect (Notification, đồng bộ Asset) được thiết kế **chủ đích nằm ngoài DB transaction chính**: nếu side-effect lỗi, nghiệp vụ chính (ghi Document/WorkflowInstance) vẫn giữ nguyên kết quả đã commit — đánh đổi giữa consistency tuyệt đối và không để lỗi phụ làm hỏng thao tác chính.

---

## 10. Câu hỏi/điểm chưa xác nhận được ở phase này (chuyển sang phase sau)

- Chưa xác nhận môi trường chạy thực tế của MongoDB có phải replica set hay không (bắt buộc cho `withTransaction` hoạt động) — cần đọc `.env`/tài liệu triển khai.
- Chưa đọc toàn bộ `src/docs/openAPI.yaml` để đối chiếu đầy đủ danh sách endpoint với routes thực tế.
- Chưa xác minh Upload (Multer) lưu file ở đâu (local disk vs cloud) — ảnh hưởng tới kiến trúc scale-out (nếu multi-instance mà lưu local disk, sẽ có vấn đề tương tự permission cache).
- Chưa đọc chi tiết `backend/mongodb-transaction-setup-guide.md` (đã biết tồn tại, chưa đối chiếu với code `withTransaction.ts` thực tế).
- Chưa phân tích sâu ABAC Policy condition evaluator (`Policycondition.evaluator.ts`) — chỉ xác nhận nó tồn tại và được dùng ở 2 nơi (middleware + rbac.service).
- Chưa phân tích chi tiết module Assets/Medical Devices classification A/B/C/D và Calibration Record (nằm ngoài phạm vi Architecture, thuộc Phase phân tích module).

---

**PHASE 02 COMPLETED**
