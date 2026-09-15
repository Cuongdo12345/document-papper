# 03 — BACKEND ANALYSIS

> Phase: 03 — Backend Analysis
> Phạm vi: CHỈ backend (entry point, routes, controllers, services, models, middleware, validators, utilities, error handling, logging, configuration, external services, auth/authorization). Không phân tích Database schema chi tiết (Phase 04), không phân tích API inventory đầy đủ (Phase 05), không đánh giá security nghiêm trọng theo mức độ (Phase 09).
> Nguồn: source code thực tế tại commit `f4ce8e9` (branch `main`), re-clone xác nhận khớp commit với `00_PROJECT_MEMORY.md`.

---

## 1. Entry Point & Bootstrap

**File**: `backend/server.ts`

Thứ tự bootstrap (CONFIRMED, đọc trực tiếp code):
1. `dotenv.config()` — load `.env`.
2. Validate bắt buộc `PORT`, `MONGO_URI` — `throw new Error(...)` ngay (không qua `ApiError`, vì đây là lỗi khởi động trước khi Express tồn tại, không có gì để bắt).
3. `connectDB()` (await) → `registerMongoEvents()` → `registerMongoShutdown()` → `registerCronJobs()` (**đăng ký cron sau khi DB kết nối xong**, có comment giải thích rõ lý do: cron cần query DB được ngay).
4. `http.createServer(app)` → `server.listen(PORT)`.
5. `process.on("unhandledRejection")` / `process.on("uncaughtException")` — cả 2 đều `server.close(() => process.exit(1))`: crash toàn bộ process khi gặp lỗi không bắt được, không cố gắng phục hồi.

**Không có** cluster mode (`cluster` module) hay PM2 config trong repo — chạy 1 process Node.js duy nhất theo thiết kế hiện tại.

---

## 2. Express App Setup

**File**: `backend/src/app.ts`

Middleware toàn cục theo đúng thứ tự đăng ký (thứ tự quan trọng vì ảnh hưởng hành vi runtime):

| # | Middleware | Ghi chú |
|---|---|---|
| 1 | Request-ID inline (`randomUUID()`) | Gắn `req.id` + header `X-Request-Id` — chạy TRƯỚC mọi middleware khác để `error.middleware.ts` log kèm được request ID. |
| 2 | `helmet()` | HTTP security headers mặc định. |
| 3 | `cors()` | `origin: process.env.CLIENT_URL`, methods GET/POST/PATCH/DELETE/PUT, `allowedHeaders: ["Content-Type","Authorization"]`, `credentials: true`. |
| 4 | `express.json({ limit: "10mb" })` | Giới hạn body 10MB. |
| 5 | `compression()` | Nén response. |
| 6 | `cookieParser()` | |
| 7 | `morgan("dev")` | Chỉ khi `NODE_ENV === "development"`. |
| 8 | `rateLimit` (`authLimiter`, 20 req/15 phút) | Áp cho **toàn bộ prefix** `/api/auths`. |
| 9 | `performanceMiddleware` | Đo thời gian mọi request (xem mục 8). |
| 10 | `setupSwagger(app)` | `/api-docs`. |
| 11 | 15 route domain (mount theo prefix, xem Phase 02 §3.2) | |
| 12 | `errorHandler` | Global error handler, cuối cùng. |

**Phát hiện mới so với Phase 02** (Phase 02 chỉ liệt kê 13 prefix — thực tế đếm lại có 15 `app.use` route, đã tính đủ `/api/user-audits` và tách `/api/assets/*` thành 3 dòng riêng — không phải sai lệch, chỉ là cách đếm "nhóm domain" (13) khác "số dòng mount" (15). Không có discrepancy thực chất).

---

## 3. Route Layer — Middleware Ordering theo domain

Đối chiếu trực tiếp source `routes/*/*.ts` (không suy diễn), tổng cộng 15 file route, 1227 dòng.

### 3.1 Pattern chuẩn quan sát được

```
router.<method>(path, authenticate, authorizePermission(<PERMISSION>), validateParams(...)?, validateBody(...)?, controllerFn)
```

Pattern này áp dụng nhất quán ở: `documents/workflow.routes.ts`, `rbac/rbac.routes.ts`, `assets/*.routes.ts`, `notifications/notification.routes.ts`, `departments/department.routes.ts`, `users/*.routes.ts`, `upload/upload.routes.ts`.

### 3.2 Ngoại lệ / điểm lệch khỏi pattern chuẩn (CONFIRMED — evidence trực tiếp)

**(a) `POST /api/documents/proposal` — KHÔNG có kiểm tra permission.**

`routes/documents/document.route.ts`:
```
router.post(
  "/proposal",
  authenticate,
  // authorizePermission("DOCUMENT_CREATE"),   ← bị comment out
  validateBody(CreateDocumentDTO),
  createDocuments,
);
```
Route này chỉ yêu cầu `authenticate` (đã đăng nhập) — **bất kỳ user đã login nào cũng tạo được document proposal**, không qua RBAC/ABAC. Đây KHÔNG phải suy diễn — dòng `authorizePermission` tồn tại trong code nhưng bị comment. Các route khác trong cùng file (`GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `PATCH /restore/:id`) đều có `authorizePermission` đầy đủ.

**(b) `GET /api/documents` — `validateQuery(QueryDocumentDTO)` bị comment out.**
```
router.get("/", authenticate, authorizePermission("DOCUMENT_VIEW"), /* validateQuery(QueryDocumentDTO), */ getAllDocuments);
```
Query params không được Zod validate ở tầng route cho endpoint list — rủi ro giảm nhẹ vì `document.service.ts` dùng `buildDocumentFilter()` (whitelist field cứng, xem mục 6.2) trước khi build query Mongo, nên field lạ trong query string không lọt thẳng vào filter DB, nhưng type coercion (`page`/`limit` thành number, enum check `sortBy`/`order`) mà `QueryDocumentDTO` cung cấp cũng không chạy.

**(c) `GET /api/workflows/pending` — `validateQuery(QueryPendingApprovalsDTO)` bị comment out** (tương tự (b), route vẫn có đủ `authenticate` + `authorizePermission("WORKFLOW_VIEW")`).

**(d) Comment trong `workflow.routes.ts`** ghi rõ đây là chủ đích: "task hiện tại CHỈ đảm bảo dữ liệu đi vào đúng hình dạng/kiểu; KHÔNG đảm bảo ai được phép gọi các endpoint này" — nhưng đối chiếu thực tế, TẤT CẢ route trong `workflow.routes.ts` (`templates`, `submit`, `:id/approve`, `:id/reject`, `pending`, `document/:documentId`, `:id`, `:id/cancel`, `:id/complete`) đều CÓ `authorizePermission` gắn đầy đủ — comment có thể là ghi chú lịch sử từ 1 giai đoạn sửa code trước, không phản ánh đúng trạng thái hiện tại của chính file này.

### 3.3 Thứ tự route quan trọng (path-matching order, Express-specific)

Xác nhận thêm 1 trường hợp tương tự phát hiện ở Phase 02 (asset-categories/medical-devices trước assets): trong `workflow.routes.ts`, comment xác nhận `/pending` và `/document/:documentId` phải khai báo TRƯỚC `/:id` để tránh Express khớp nhầm — và thực tế code đã đặt đúng thứ tự này.

---

## 4. Controller Layer — Response Format Consistency

**Phát hiện quan trọng: response format KHÔNG đồng nhất giữa các domain**, mặc dù Phase 02 mô tả 1 pattern chuẩn `{ success, message?, data? }`. Đối chiếu trực tiếp:

| Domain | File | Response shape thực tế |
|---|---|---|
| Documents | `document.controller.ts` | `{ success: true, message, data }` — nhất quán, dùng `catchAsync`. |
| Workflow | `workflow.controller.ts` | (chưa đọc toàn bộ, nhưng cùng pattern qua `catchAsync`, theo cách gọi ở Phase 02 flow trace). |
| Auth | `auth.controller.ts` | KHÔNG có field `success`. Ví dụ: `res.json({ message: "...", data: result })` hoặc `res.status(201).json({ message: "...", user: result })` — field thứ 2 khi là `user` thay vì `data` (register), khi là `data` (login) — **không nhất quán ngay trong cùng 1 file**. |
| Upload | `upload.controller.ts` | KHÔNG dùng `catchAsync`, KHÔNG dùng `ApiError`. `uploadFiles` tự `try/catch` và `res.status(500).json({ message })`; `getFiles`/`getFileDetail`/`deleteFile` không có try/catch nào (dựa vào Express 5 tự forward promise rejection tới `errorHandler`). Response không có `success`, lỗi 404 trả `res.status(404).json({ message })` trực tiếp thay vì qua `ApiError.notFound()` + `next()` — bỏ qua toàn bộ pattern lỗi chuẩn hoá của hệ thống. |

**Kết luận (CONFIRMED)**: pattern `{ success, message?, data? }` là pattern PHỔ BIẾN NHẤT nhưng không phải universal. `auth` và `upload` là 2 domain lệch khỏi convention, với `upload` lệch nhiều nhất (bỏ qua cả `catchAsync` lẫn `ApiError`).

---

## 5. Middleware Layer — Chi tiết từng middleware

| Middleware | File | Chức năng | Input | Output |
|---|---|---|---|---|
| `authenticate` | `middlewares/auth.middleware.ts` | Verify JWT (`HS256` whitelist), validate `decoded.id` là ObjectId, load `User` (chỉ `_id, role, department, isActive`, populate `role.name`), check `isActive` | Header `Authorization: Bearer <token>` | `req.user = {_id, role, department, isActive, permissions: []}` hoặc `next(ApiError.unauthorized(...))` |
| `authorizePermission(perms, opts)` | `middlewares/authorizePermission.middleware.ts` | RBAC + ABAC check (chi tiết Phase 02 §6.2) | `req.user` | `next()` hoặc `next(ApiError.forbidden(...))` |
| `validateBody/Query/Params` | `middlewares/validate.middleware.ts` | Zod `safeParse`, gán lại `req.body/query/params = result.data` (dữ liệu đã coerce) nếu pass | Zod schema | `next()` hoặc `next(ApiError.badRequest(..., issues))` |
| `authRateLimiter` | `middlewares/authRateLimiter.middleware.ts` | Rate limit 20 req/15 phút, riêng cho `/login`, `/register`, `/refresh-token` | — | Header `RateLimit-*` (standardHeaders) hoặc `next(ApiError.tooManyRequests(...))` |
| `errorHandler` | `middlewares/error.middleware.ts` | Global error handler — map `ApiError` → status/errorCode gốc; `CastError` → 400; `ValidationError` → 400 + details; unknown → `getSafeStatus()` (chỉ nhận `err.status` nếu là integer 400–599, else 500) | `err` bất kỳ | JSON `{success:false, message, errorCode, details?}` + `logError()` (structured `console.error` JSON, có `requestId`) |
| `uploadExcel` | `middlewares/upload.middleware.ts` | Multer **memoryStorage**, chỉ `.xlsx`/`.xls`, giới hạn 5MB | file field | `req.file`/`req.files` (buffer trong RAM) |
| `loadDocument` | `middlewares/loadDocument.middleware.ts` | Load `Document` theo `:id` (chỉ `isActive:true`) vào `req.resource`, dùng cho ABAC | `req.params.id` | `req.resource` |
| `performanceMiddleware` | `middlewares/performance.middleware.ts` | Đo `totalTime`, sample log theo `PERF_SAMPLE_RATE` (chi tiết mục 8) | — | Đẩy vào buffer RAM qua `pushPerformanceLog()` |

### 5.1 Phát hiện: `loadDocument` là DEAD MIDDLEWARE (CONFIRMED)

`grep` toàn bộ `src/` xác nhận `loadDocument` KHÔNG được import/gắn vào bất kỳ route nào (kể cả `document.route.ts`). Middleware này viết đủ logic (kể cả comment hướng dẫn cách gắn và thứ tự đúng khi dùng ABAC) nhưng chưa từng được "nối dây" vào route thực tế — nghĩa là nhánh ABAC (`enablePolicies`) của `authorizePermission` hiện KHÔNG có route nào truyền đủ `req.resource` để policy condition có dữ liệu đánh giá (trừ khi 1 route nào đó tự set `req.resource` theo cách khác — chưa xác minh hết mọi route ở phase này).

### 5.2 Phát hiện: 2 cấu hình Multer riêng biệt cho 2 mục đích khác nhau (CONFIRMED)

- `middlewares/upload.middleware.ts` (`uploadExcel`): **memory storage**, dùng cho import Excel (`assets/asset.routes.ts`, `excel/excel.route.ts`) — file chỉ tồn tại trong RAM khi xử lý, không ghi ra disk.
- `services/upload/upload.middleware.ts` (`createUploader`): **disk storage** (`multer.diskStorage`, thư mục `backend/uploads/`, tự tạo nếu chưa tồn tại qua `fs.mkdirSync`), dùng cho domain Upload chung (`routes/upload/upload.routes.ts`) — **đây là câu trả lời CONFIRMED cho open question ở Phase 02 ("Multer lưu file ở đâu")**: file upload qua `/api/upload` được lưu **LOCAL DISK** tại `backend/uploads/`, filename dạng `${Date.now()}-${originalname}`, URL trả về dạng `/uploads/${filename}` (không thấy route Express nào serve static path `/uploads` trong `app.ts` — cần xác minh thêm liệu file có thực sự truy cập được qua HTTP hay chỉ lưu record DB mà không expose file thực tế).
  - Hệ quả kiến trúc: nếu deploy nhiều instance/pod, file lưu trên disk của 1 instance sẽ KHÔNG truy cập được từ instance khác — vấn đề tương tự permission cache in-memory đã ghi nhận ở Phase 02.
- `services/upload/upload.validator.ts` (`validateFiles`) là **dead code** — hàm được định nghĩa với logic validate khá đầy đủ (max size, max total size, max files, allowed types) nhưng `grep` xác nhận KHÔNG có nơi nào gọi hàm này; `createUploader`/`upload.controller.ts` không dùng nó.

---

## 6. Service Layer — Business Logic (IMPLEMENTED, có evidence)

### 6.1 Auth Service (`services/auth/auths.service.ts`, 473 dòng)

| Function | Business rule CONFIRMED |
|---|---|
| `register()` | Check trùng `username` HOẶC `email` (409 Conflict, message chung không tiết lộ field nào trùng). Gán role mặc định theo `DEFAULT_REGISTER_ROLE_NAME` (env, default `"USER"`) — nếu role này chưa tồn tại trong DB, throw `500` (lỗi cấu hình hạ tầng, không phải lỗi input). `isActive: true` ngay khi đăng ký (không có email verification flow). Không tự động login sau khi đăng ký (không trả token). Route `/register` là **public** (không cần quyền Admin) — comment trong code tự flag đây là quyết định nghiệp vụ cần người vận hành xác nhận lại. |
| `login()` | Chống account-enumeration: nhánh "user không tồn tại/inactive" và nhánh "sai password" trả **cùng 1 message, cùng status 401**. Khi user không tồn tại, vẫn chạy `bcrypt.compare()` với 1 `DUMMY_PASSWORD_HASH` cố định để cân bằng thời gian phản hồi (chống timing attack). Lưu `RefreshToken` vào DB (TTL 7 ngày, tính bằng code `Date.now() + 7*24*60*60*1000`, KHÔNG đọc từ env). Ghi `UserAudit` action `LOGIN`. |
| `refresh()` | Query `RefreshToken` theo `{token, revoked:false}`, populate lồng `user.role`/`user.department`. Verify chữ ký bằng `JWT_REFRESH_SECRET` (whitelist `HS256`). Sinh access token mới qua `generateAccessToken()` dùng chung với `login()` — payload shape đồng nhất. KHÔNG rotate refresh token (dùng lại token cũ tới khi hết hạn/bị revoke). |
| `logout()` | `RefreshToken.findOneAndUpdate({token, user: userId}, {revoked:true})` — **filter theo cả `user: userId`**, nghĩa là user A không thể revoke refresh token của user B dù biết token đó (so với thiết kế chỉ filter theo `token`). |
| `forgotPassword()` | Rate limit 3 request/15 phút/user (đếm qua `PasswordResetToken.countDocuments`, KHÔNG dùng `express-rate-limit`, tự implement bằng DB query). Chống enumeration: nhánh user không tồn tại vẫn chạy 1 `countDocuments` "dummy" (không match bản ghi nào) để cân bằng thời gian, trả về CÙNG `{silent:true}` như nhánh user tồn tại. Token reset gửi qua email (`sendMail`), KHÔNG trả trong response. Lỗi gửi mail (SMTP down...) bị nuốt (try/catch, chỉ `console.error`), response vẫn `{silent:true}` — chủ đích để không lộ khác biệt "gửi thành công" vs "gửi lỗi". |
| `resetPassword()` | Token so sánh qua hash (`hashResetToken`), không lưu token thô trong DB. Check `used:false` và `expiresAt > now`. Sau khi đổi mật khẩu: revoke TOÀN BỘ refresh token hiện có của user (`RefreshToken.updateMany({user}, {revoked:true})`) — buộc đăng xuất khỏi mọi thiết bị. |

### 6.2 Document Service (`services/documents/`, tách 6 file: `.service`, `.validator`, `.mapper`, `.query`, `.types`, `.constants`)

| Function/file | Business rule CONFIRMED |
|---|---|
| `documents.validator.ts:validateDocumentRule` | `subType` phải tồn tại trong `DOCUMENT_RULES` (constants riêng), và `category` truyền vào phải khớp `rule.category` — nếu không, 400. |
| `documents.validator.ts:validateReference` | Nếu rule yêu cầu `requireReference`: `referenceTo` bắt buộc, phải là ObjectId hợp lệ, **CHỈ CHẤP NHẬN ĐÚNG 1 GIÁ TRỊ** (throw nếu mảng >1 phần tử) — quyết định nghiệp vụ 1-1 giữa REPORT và PROPOSAL dù schema DB vẫn là mảng `[ObjectId]`. Document tham chiếu phải cùng `department` với document hiện tại, và (nếu rule chỉ định) đúng `referenceSubType`. Nếu rule KHÔNG yêu cầu reference nhưng client vẫn gửi `referenceTo` → 400 ("Không cần reference"). |
| `documents.validator.ts:validateRestorePermission` | Chỉ chủ sở hữu (`document.createdBy === userId`, so sánh ép về string) hoặc admin (`isAdmin`) được restore document đã xoá mềm. |
| `documents.validator.ts` — `validateStatusTransition`/`validateStatusPermission` | **DEAD CODE (tự đánh dấu deprecated trong comment)** — viết cho thiết kế `DocumentStatus`/`repairStatus` cũ, không còn khớp schema hiện tại (dùng `workflowStatus`, xử lý qua `workflow.service.ts`). Chưa xác nhận có consumer nào khác gọi 2 hàm này ở nơi khác trong codebase (ngoài phạm vi đọc ở phase này). |
| `documents.mapper.ts:buildReferenceArray` | Chuẩn hoá `referenceTo` (1 giá trị hoặc mảng ≤1 phần tử) thành `ObjectId[]` khớp schema DB — throw nếu mảng >1 phần tử (đồng bộ rule 1-1 ở trên). |
| `documents.mapper.ts:escapeRegex` | Escape ký tự đặc biệt regex trước khi dùng trong `$regex` filter — chống ReDoS/lỗi regex khi search theo keyword tự do. |
| `documents.mapper.ts:buildDocumentFilter` | Chỉ nhận field trong whitelist `FILTERABLE_DOCUMENT_FIELDS` (`category, subType, department, workflowStatus, createdBy, relatedAsset`) — KHÔNG dùng `Object.assign(filter, rawQuery)` (tránh field lạ/NoSQL injection lọt vào Mongo filter). |
| `documents.query.ts:findPendingRepairProposalForAsset` | Business rule: 1 Asset không được có 2 đề xuất `PROPOSE_REPAIR` đang `pending` cùng lúc — dùng để CHẶN tạo trùng đề xuất sửa chữa cho cùng 1 asset khi đề xuất trước chưa duyệt xong. |
| `documents.query.ts:countReportsByProposal` | Đếm REPORT (`isActive:true`) còn tham chiếu tới 1 PROPOSAL — dùng để chặn xoá PROPOSAL khi vẫn còn REPORT tham chiếu (tránh dữ liệu mồ côi). Comment tự đánh giá đây là "lỗ hổng nghiêm trọng nhất module" nếu thiếu check này — chưa xác minh ở phase này liệu `deleteDocumentService` có thực sự gọi hàm này trước khi xoá hay không (đọc `document.service.ts` phần delete cần ở phase Business Logic). |
| `documents.constants.ts:DOCUMENT_UPDATE_WHITELIST` | Update Document chỉ cho phép sửa `title`, `meta` — các field khác (kể cả `department`) bị chặn ở tầng service dù có gửi lên. |

**Kích thước file lớn chưa đọc toàn bộ** (theo nguyên tắc "Large File Strategy" của SKILL.md): `document.service.ts` (1113 dòng, 8 hàm export) và `workflow.service.ts` (1120 dòng, 9 hàm export) — đã xác nhận danh sách hàm export và đối chiếu 2 flow chính (tạo Document, approve Workflow) từ Phase 02, nhưng CHƯA đọc toàn bộ logic từng hàm (vd `updateDocumentService`, `deleteDocumentService`, `rejectStep`, `cancelWorkflow`, `completeWorkflow`) — để dành cho Phase 08 (Business Logic) đọc sâu theo từng hàm.

### 6.3 RBAC Permission Cache (`services/rbac/permission.cache.ts`)

Xác nhận lại chi tiết Phase 02 bằng code thực tế: `Map<userId, {permissions, cachedAt}>`, TTL 5 phút (`TTL_MS = 5*60*1000`), 2 hàm invalidate:
- `clearPermissionCache(userId)` — xoá 1 user, gọi khi role của user đó đổi.
- `clearAllPermissionCache()` — xoá toàn bộ `Map`, gọi khi 1 Permission bất kỳ bị sửa/xoá (comment giải thích rõ lý do: không đáng để dò ngược tất cả Role/User bị ảnh hưởng, xoá sạch rẻ hơn).
- Cả 2 đều chỉ có hiệu lực trên process/instance hiện tại (giới hạn đã ghi nhận Phase 02, không lặp lại chi tiết).

---

## 7. Configuration

### 7.1 Danh sách đầy đủ biến môi trường (đọc trực tiếp `.env.example`, giải quyết open item từ Phase 01)

| Biến | Nhóm | Bắt buộc? |
|---|---|---|
| `PORT` | Server | Bắt buộc (throw nếu thiếu, `server.ts`) |
| `MONGO_URI` | Database | Bắt buộc (throw nếu thiếu, cả `server.ts` và `database.ts`) |
| `JWT_SECRET` | Auth | Bắt buộc ngầm (dùng trực tiếp `!` non-null assertion trong `auth.middleware.ts`, không có check tồn tại tường minh — nếu thiếu, `jwt.verify` sẽ lỗi runtime khi có request đầu tiên, không fail-fast lúc khởi động) |
| `JWT_REFRESH_SECRET` | Auth | Tương tự `JWT_SECRET`, dùng trong `auths.service.ts:refresh()` |
| `JWT_EXPIRES_IN` | Auth | **Comment out trong `.env.example`, và KHÔNG được `grep` thấy dùng ở bất kỳ đâu trong `src/`** — biến chết, đúng như đã bị comment (không phải discrepancy, chỉ là ghi chú dự phòng chưa dùng) |
| `DEFAULT_REGISTER_ROLE_NAME` | Auth | Optional, default `"USER"` (code) |
| `SMTP_HOST/PORT/USER/PASS/SECURE`, `MAIL_FROM` | Email | Dùng bởi `shared/utils/mailer.ts` (chưa đọc chi tiết ở phase này) |
| `CLIENT_URL` | CORS + email link | Dùng cho `cors()` origin VÀ build `resetLink` trong email — **xuất hiện 2 lần trong `.env.example`** (1 lần ở nhóm "Cấu hình môi trường email", 1 lần ở nhóm "Frontend cấu hình port") — trùng lặp khai báo, không phải 2 biến khác nhau (copy-paste, không gây lỗi runtime nhưng gây nhiễu khi đọc file mẫu) |
| `VITE_API_BASE_URL` | Frontend | Comment out — không liên quan backend (dự phòng cho frontend chưa tồn tại) |
| `MONGO_DEBUG`, `MONGO_SLOW_MS` | DB logging | Đọc bởi `mongo.logger.ts` nhưng **hàm `registerMongoLogger()` KHÔNG được gọi ở bất kỳ đâu** (xem mục 8) — 2 biến này hiện KHÔNG có tác dụng thực tế dù được tài liệu hoá đầy đủ trong `.env.example` |
| `NODE_ENV` | Chung | Bật `morgan("dev")` khi `"development"`; cũng dùng trong `mongo.logger.ts` (dead code) |
| `PERF_SAMPLE_RATE` | Performance | Optional, default `0.1`, dùng bởi `performanceMiddleware` |
| `DASHBOARD_CACHE_TTL_MS` | Dashboard | Được khai báo trong `.env.example` nhưng CHƯA xác minh nơi dùng ở phase này (thuộc domain Dashboard, ngoài phạm vi đọc sâu Phase 03 — dashboard.service.ts chưa đọc) |
| `MONGO_MAX_POOL_SIZE`, `MONGO_MIN_POOL_SIZE` | Database | **CONFIRMED discrepancy**: được dùng thực tế trong `database.ts` (default 20/2) nhưng **KHÔNG xuất hiện trong `.env.example`** — thiếu tài liệu hoá, người vận hành đọc `.env.example` sẽ không biết 2 biến này tồn tại. |

### 7.2 Dead code trong configuration

- `config/database/database.ts` chứa **~40 dòng code cũ bị comment nguyên khối** ở đầu file (phiên bản `connectDB` trước khi có `MONGO_MAX_POOL_SIZE`/`MONGO_MIN_POOL_SIZE`) — không ảnh hưởng runtime nhưng là code organization issue (nhiễu khi đọc/audit).
- `config/database/mongo.logger.ts` — `registerMongoLogger()` viết đầy đủ logic (log query chậm, log query dev, cảnh báo thiếu index) nhưng **không được import/gọi ở `server.ts` hay bất kỳ đâu khác** (`grep` xác nhận). Đây là dead code — toàn bộ tính năng "Mongo query debug logging" tài liệu hoá trong `.env.example` hiện KHÔNG hoạt động.

---

## 8. Logging

**Không có structured logger thực thụ (winston/pino)** — toàn bộ hệ thống dùng `console.log`/`console.warn`/`console.error` trực tiếp. Tự bản thân `error.middleware.ts` có comment thừa nhận rõ: *"đây KHÔNG phải structured logger thực thụ... vẫn dùng console.error, chỉ đổi FORMAT"*.

| Nguồn log | Cơ chế | Đích |
|---|---|---|
| `error.middleware.ts:logError()` | `console.error(JSON.stringify({level, timestamp, requestId, method, path, status, errorCode, message, stack}))` | stdout, dạng JSON 1 dòng (có `requestId` để đối chiếu với header `X-Request-Id` client nhận được) |
| `database.events.ts` | `console.log/warn/error` với emoji, không có cấu trúc JSON | stdout |
| `mongo.logger.ts` | Log JSON chi tiết mỗi Mongo query (nếu bật) | **DEAD — không được gọi** (mục 7.2) |
| `performanceMiddleware` + `performanceLogBuffer.ts` | KHÔNG dùng `console` — ghi vào buffer RAM, flush theo batch xuống MongoDB (model `apiPerformance`) mỗi 10 giây hoặc khi đủ 50 bản ghi (comment trong `database.shutdown.ts` xác nhận số liệu này; nội dung chi tiết `performanceLogBuffer.ts` chưa đọc toàn bộ ở phase này) | MongoDB (`apiPerformance` collection) |
| `morgan("dev")` | Access log dạng dev, chỉ khi `NODE_ENV=development` | stdout |

**Không có** log rotation, log aggregation (ELK/Loki), hay external logging service (Datadog, Sentry) trong dependencies — xác nhận từ Phase 01 (`package.json`), không phát hiện thêm ở Phase 03.

---

## 9. Error Handling — Tổng hợp

- **1 error handler chính thức** (`middlewares/error.middleware.ts`), wire vào `app.ts` cuối middleware chain.
- **1 file error handler khác đã deprecated** (`shared/errors/errorHandler.ts`) — tự đánh dấu `@deprecated` trong comment đầu file, có `console.warn` phòng hờ nếu vô tình bị wire nhầm; `grep` xác nhận KHÔNG có import nào trỏ tới file này ngoài chính nó — an toàn, chỉ là dead code, không phải lỗi runtime.
- Pattern chuẩn: `throw ApiError.xxx(...)` trong service → `catchAsync` bọc controller bắt promise rejection → `next(error)` → `errorHandler`.
- **Ngoại lệ (mục 4)**: domain `upload` không theo pattern này (tự `try/catch` + `res.status().json()` trực tiếp ở 1 hàm, không try/catch ở 3 hàm còn lại — dựa vào Express 5 tự forward rejection).
- `getSafeStatus()` trong `error.middleware.ts` validate `err.status` là integer trong khoảng 400–599 trước khi dùng, tránh lỗi hạ tầng nếu 1 lỗi từ thư viện ngoài (vd Axios) có field `status` không hợp lệ tình cờ trùng tên.

---

## 10. Request Lifecycle — Trace bổ sung (khác 2 flow đã trace ở Phase 02)

### 10.1 Login

```
[Client] POST /api/auths/login {username, password}
  app.ts (global middleware, riêng /api/auths có thêm authLimiter 20/15min)
  auth.routes.ts: authRateLimiter (20/15min, CÙNG NGƯỠNG với authLimiter ở app.ts — 2 limiter độc lập
                  áp lên cùng route, không chia sẻ counter) → validateBody(LoginDTO)
  auth.controller.ts:login → AuthService.login(username, password)
    → User.findOne({username}).select("+password").populate("role","name").populate("department","code name")
    → nếu !user || !isActive: bcrypt.compare(password, DUMMY_HASH) rồi throw 401 (chống timing/enumeration)
    → bcrypt.compare(password, user.password); sai → throw 401 (cùng message với nhánh trên)
    → generateAccessToken(...) + generateRefreshToken(...)
    → RefreshToken.create({user, token, expiresAt: +7 ngày})
    → UserAudit.create({action:"LOGIN"})
  auth.controller.ts trả res.json({message, data:{accessToken, refreshToken, user}})
[Client] nhận token
```

**Phát hiện**: `/api/auths/login` chịu 2 tầng rate-limit riêng biệt cùng cấu hình (20 req/15 phút) — 1 từ `app.ts` (áp cho cả prefix `/api/auths`) và 1 từ `authRateLimiter.middleware.ts` (áp riêng route). Cả 2 dùng `express-rate-limit` mặc định (in-memory store, per-process) nhưng là 2 instance limiter độc lập, không chia sẻ bộ đếm — về hiệu quả thực tế không sai (request vẫn bị chặn ở ngưỡng thấp hơn khi 1 trong 2 đạt giới hạn trước) nhưng là cấu hình dư thừa/trùng lặp logic (2 nguồn đếm request khác nhau cho cùng 1 route).

### 10.2 Upload file chung (khác Excel import)

```
[Client] POST /api/upload (multipart/form-data, field "files")
  authenticate → authorizePermission("UPLOAD_FILES")
  → uploader.array("files")  (multer diskStorage, backend/uploads/, filename: `${Date.now()}-${originalname}`)
  upload.controller.ts:uploadFiles (KHÔNG dùng catchAsync)
    → saveFilesToDB(files) → Upload.insertMany([{fileName, fileUrl:"/uploads/...", fileSize, mimeType}])
  → res.json({message:"Upload success", data: result})   (KHÔNG có field "success")
[Client] nhận danh sách file đã lưu
```

---

## 11. Code Organization — Đánh giá (mô tả, KHÔNG refactor)

### 11.1 Separation of concerns
- **Tốt** ở domain `documents`: tách rõ `.validator` (rule nghiệp vụ) / `.mapper` (transform dữ liệu) / `.query` (data access thuần) / `.constants` / `.types` — controller mỏng, chỉ gọi service.
- **Không đồng đều** ở domain `upload`: business logic (`saveFilesToDB`), validate (`upload.validator.ts` — không dùng) và middleware factory (`createUploader`) đều nằm trong `services/upload/`, nhưng file validate viết ra rồi không gọi (dead code) và controller tự làm việc mà lẽ ra middleware/service nên làm (error formatting thủ công).

### 11.2 Coupling & Dependency direction
- Khớp hoàn toàn với Phase 02 (Documents phụ thuộc nhiều nhất, Dashboard coupling rộng nhất nhưng chỉ đọc) — không phát hiện thêm chiều phụ thuộc mới ở Phase 03.
- `authorizePermission.middleware.ts` phụ thuộc trực tiếp `models/rbac/policy.model`, `models/users/userAudit.model`, và `shared/utils/Policycondition.evaluator` — 1 middleware tầng cross-cutting nhưng import thẳng model của 2 domain khác (RBAC, Users) thay vì qua service layer riêng — chấp nhận được vì đây là middleware hạ tầng dùng chung, không phải business service, nhưng đáng ghi nhận là 1 điểm phá vỡ nguyên tắc "chỉ service gọi model" nếu áp dụng triệt để.

### 11.3 Duplication
- 2 rate-limiter cấu hình giống hệt nhau (`app.ts` inline `authLimiter` và `authRateLimiter.middleware.ts`) cho cùng nhóm route — xem mục 10.1.
- 2 cấu hình Multer khác nhau (`middlewares/upload.middleware.ts` vs `services/upload/upload.middleware.ts`) — không hẳn là "duplicate logic" (mục đích khác nhau: Excel import vs file upload chung) nhưng là 2 nguồn cấu hình Multer riêng biệt không dùng chung 1 factory, dễ nhầm lẫn khi bảo trì.
- 2 nơi định nghĩa `errorHandler` (`middlewares/error.middleware.ts` — đang dùng, và `shared/errors/errorHandler.ts` — deprecated) — đã tự ghi nhận trong code, không cần lặp lại đánh giá.

### 11.4 Dead code tổng hợp (Phase 03)

| File | Đối tượng chết | Trạng thái |
|---|---|---|
| `shared/errors/errorHandler.ts` | Toàn bộ file | Tự đánh dấu `@deprecated`, không được import |
| `middlewares/loadDocument.middleware.ts` | Toàn bộ middleware | Viết đủ logic, chưa gắn vào route nào |
| `config/database/mongo.logger.ts` | `registerMongoLogger()` | Không được gọi ở đâu, dù `.env.example` tài liệu hoá `MONGO_DEBUG`/`MONGO_SLOW_MS` như đang hoạt động |
| `services/upload/upload.validator.ts` | `validateFiles()` | Không có consumer |
| `services/documents/documents.validator.ts` | `validateStatusTransition`, `validateStatusPermission` | Tự đánh dấu deprecated trong comment, thiết kế cũ không khớp schema hiện tại |
| `config/database/database.ts` | ~40 dòng code cũ | Comment nguyên khối, không xoá |

### 11.5 Error handling consistency
Đã nêu ở mục 9 — nhất quán tốt ngoại trừ domain `upload`.

---

## 12. Business Rules — IMPLEMENTED vs UNKNOWN (tổng hợp nhanh, chi tiết đầy đủ để Phase 08)

**IMPLEMENTED (có evidence trực tiếp, liệt kê ở mục 6):**
- Đăng ký public, gán role mặc định, không auto-login.
- Chống enumeration + timing attack ở login và forgot-password.
- Rate limit reset password: 3 lần/15 phút/user (DB-based, không phải middleware).
- Logout chỉ tự thu hồi token của chính mình.
- Reset password thu hồi toàn bộ refresh token hiện có.
- 1 Asset không được có 2 đề xuất sửa chữa `pending` song song.
- REPORT – PROPOSAL là quan hệ 1-1 ở tầng application (dù DB schema vẫn mảng).
- Document Update chỉ cho sửa `title`/`meta`.
- Restore Document chỉ chủ sở hữu hoặc Admin.

**UNKNOWN / cần xác minh ở phase sau (KHÔNG suy diễn thêm ở đây):**
- `deleteDocumentService` có thực sự gọi `countReportsByProposal` trước khi cho xoá PROPOSAL hay không (file `document.service.ts` dòng 416+ chưa đọc chi tiết).
- Toàn bộ logic `rejectStep`, `cancelWorkflow`, `completeWorkflow` trong `workflow.service.ts` (chưa đọc, chỉ xác nhận tồn tại qua tên hàm export).
- `DASHBOARD_CACHE_TTL_MS` dùng ở đâu cụ thể trong `dashboard.service.ts` (chưa đọc domain Dashboard ở phase này).
- Route `/uploads/<file>` có thực sự được Express serve tĩnh (`express.static`) hay không — không thấy trong `app.ts`, cần grep thêm ở phase sau nếu cần xác nhận file có truy cập được qua HTTP.

---

## 13. Câu hỏi/điểm chưa xác nhận được ở phase này (chuyển sang phase sau)

- Toàn bộ logic chi tiết trong `document.service.ts` (8 hàm, 1113 dòng) và `workflow.service.ts` (9 hàm, 1120 dòng) ngoài 2 hàm đã trace ở Phase 02 — để Phase 08 (Business Logic) đọc sâu.
- `shared/utils/mailer.ts`, `shared/helpers/auth.helper.ts` (generateAccessToken/RefreshToken, hash reset token) — chưa đọc nội dung chi tiết (chỉ biết tồn tại và được gọi từ đâu).
- Domain Dashboard, Excel, Notifications, RBAC (ngoài permission.cache), Assets/Medical Devices — chưa đọc controller/service chi tiết ở Phase 03 (ngoài phạm vi "Backend chung", một phần thuộc phạm vi Phase 08 Business Logic theo domain).
- Có route Express nào serve static file (`express.static`) cho thư mục `backend/uploads/` hay không — chưa xác nhận, ảnh hưởng tới việc file upload qua `/api/upload` có thực sự truy cập được qua URL trả về hay không.
- `performanceLogBuffer.ts` — chưa đọc toàn bộ logic buffer/flush (chỉ biết từ comment ở `database.shutdown.ts`: flush mỗi 10s hoặc 50 bản ghi).

---

**PHASE 03 COMPLETED**
