# REVIEW-00 — FOUNDATION / CROSS-CUTTING CODE REVIEW

> Phạm vi: bootstrap ứng dụng, middleware pipeline toàn cục, error handling, validation, authentication/authorization boundary, configuration, shared utilities/cache, performance middleware.
> Không phân tích domain-specific business logic (Documents, Assets, Workflow, ...) — để dành cho REVIEW-01+.
> KHÔNG sửa code. KHÔNG chạy lại Phase 01→13.
> Ngày review: 2026-08-30. Commit tại thời điểm review: `5b58fb1` (branch `main`).

---

## 1. Tài liệu/nguồn đã đọc trước khi review

- `CLAUDE.md`, `docs/00_PROJECT_MEMORY.md`, `docs/01_PROJECT_OVERVIEW.md`, `docs/02_ARCHITECTURE.md`, `docs/03_BACKEND_ANALYSIS.md`.
- Source (dependency-driven, đọc trực tiếp — không suy diễn từ docs cũ):
  - `backend/server.ts`, `backend/src/app.ts`, `backend/tsconfig.json`
  - `backend/src/config/database/{database.ts, database.events.ts, database.shutdown.ts, mongo.logger.ts}`, `backend/src/config/swagger/swagger.ts`
  - `backend/src/middlewares/*.ts` (8 file: `auth`, `authorizePermission`, `authRateLimiter`, `error`, `loadDocument`, `performance`, `upload`, `validate`)
  - `backend/src/shared/{errors/ApiError.ts, utils/catchAsync.ts, utils/withTransaction.ts, cache/memoryCache.ts}`
  - `backend/src/services/rbac/permission.cache.ts` (đã đọc kỹ ở TASK-001/002, không đọc lại toàn bộ)

Phase 02/03 đã phân tích khu vực này khá kỹ ở commit `f4ce8e9` — review này XÁC MINH LẠI bằng commit hiện tại (`5b58fb1`, đã tiến 2 commit) và bổ sung finding SECURITY-ORIENTED mà Phase 02/03 (phạm vi kiến trúc/backend thuần) không tập trung đánh giá theo mức độ nghiêm trọng.

---

## 2. Findings

### RV00-01 — Uploaded file KHÔNG được serve qua HTTP (giải quyết UNKNOWN từ Phase 03)
- **Severity**: HIGH
- **Category**: Functional Bug / Cross-cutting (Static file serving)
- **File**: `backend/src/app.ts` (toàn bộ), `backend/src/services/upload/upload.middleware.ts` (diskStorage), `backend/src/services/upload/upload.controller.ts` (trả `fileUrl: "/uploads/..."`)
- **Function/Class**: N/A (thiếu hẳn 1 middleware, không phải lỗi trong 1 hàm cụ thể)
- **Observed Behavior**: `grep -r "express.static" backend/src` không có kết quả nào. `app.ts` không mount bất kỳ static route nào cho thư mục `backend/uploads/`. File upload qua `POST /api/upload` được lưu thật vào `backend/uploads/` (disk), API trả về `fileUrl` dạng `/uploads/<filename>`, nhưng **không có route Express nào phục vụ path này**.
- **Evidence**: Phase 03 §5.2/§13 đã nêu đây là "câu hỏi chưa xác nhận được" — review này XÁC NHẬN: không tìm thấy `express.static` ở bất kỳ đâu trong `backend/src`.
- **Impact**: Với ứng dụng chạy độc lập (không có reverse proxy nào serve `/uploads` thay), URL trả về từ API **không truy cập được** — tính năng "xem lại file đã upload" thực chất không hoạt động qua chính Node app này. Nếu môi trường production có Nginx/Apache đứng trước và tự serve `/uploads` từ disk dùng chung, tính năng vẫn hoạt động nhưng KHÔNG PHẢI nhờ code Node — đây là UNKNOWN (phụ thuộc hạ tầng triển khai thật, ngoài phạm vi source code).
- **Recommendation**: Nếu ý định là Node tự serve file, thêm `app.use("/uploads", express.static(path.join(__dirname, "../uploads")))` (kèm cân nhắc access control nếu file nhạy cảm — hiện tại bất kỳ ai biết URL cũng tải được, không qua `authenticate`). Nếu ý định là để reverse proxy serve, cần ghi rõ ràng hoá yêu cầu hạ tầng này trong tài liệu deployment (hiện KHÔNG có tài liệu deployment nào trong repo).
- **Confidence**: CONFIRMED (code — không tìm thấy `express.static`). Tác động thực tế trên production: UNKNOWN (phụ thuộc hạ tầng ngoài source).

---

### RV00-02 — `errorHandler` lộ `err.message` thô cho lỗi không xác định (nhánh 500)
- **Severity**: MEDIUM
- **Category**: Security / Error Handling (Information Disclosure)
- **File**: `backend/src/middlewares/error.middleware.ts`
- **Function/Class**: `errorHandler` (nhánh 4, dòng ~102-109)
- **Observed Behavior**: Với `ApiError`, `CastError`, `ValidationError` — message trả về client đều là message tự viết, an toàn (không lộ nội tại). Nhưng với BẤT KỲ lỗi nào khác (không thuộc 3 loại trên — vd lỗi ném ra từ 1 thư viện bên thứ 3, lỗi runtime không lường trước, lỗi driver MongoDB không phải CastError/ValidationError như `MongoServerError`), code chạy: `message: err.message || "Internal Server Error"` — **trả thẳng `err.message` gốc cho client**, không che.
- **Evidence**:
  ```ts
  // error.middleware.ts, nhánh cuối cùng
  const status = getSafeStatus(err);
  logError(err, req, status);
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
    errorCode: err.errorCode || "UNKNOWN_ERROR",
  });
  ```
- **Impact**: Tuỳ loại lỗi thực tế xảy ra, thông điệp lỗi thư viện gốc (có thể chứa tên field DB, chi tiết driver, đôi khi cả 1 phần connection string trong lỗi kết nối MongoDB nếu lỗi xảy ra ở tầng đó) có thể lộ ra client. Mức độ nghiêm trọng phụ thuộc loại lỗi thực tế phát sinh trong vận hành — CLAUDE.md §23 yêu cầu không lộ "internal database details"/"error leakage" trừ khi kiểm soát rõ.
- **Recommendation**: Với nhánh lỗi không xác định (status ≥ 500 hoặc không phải 1 trong 3 loại đã biết), trả message chung cố định (vd `"Đã có lỗi xảy ra, vui lòng thử lại sau"`) cho client, giữ nguyên `err.message` chi tiết chỉ trong `logError` (đã làm đúng — log server có đủ context). Cân nhắc chỉ trả `err.message` thật khi `status < 500` (lỗi do client) và luôn che khi `status >= 500` (lỗi server).
- **Confidence**: CONFIRMED (code). Đây là **POTENTIAL RISK** về mức độ khai thác thực tế (phụ thuộc loại lỗi runtime nào thực sự xảy ra, chưa test/observe log production) — không phải lỗ hổng chắc chắn bị khai thác ngay.

---

### RV00-03 — Swagger UI (`/api-docs`) public hoàn toàn, không có bất kỳ authentication/authorization nào
- **Severity**: LOW-MEDIUM
- **Category**: Security / API Exposure
- **File**: `backend/src/config/swagger/swagger.ts`, `backend/src/app.ts` (dòng gọi `setupSwagger(app)`)
- **Function/Class**: `setupSwagger`
- **Observed Behavior**: `app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(...))` được mount TRƯỚC toàn bộ route domain, KHÔNG có `authenticate`/`authorizePermission` nào bọc quanh. `persistAuthorization: true` cho phép người dùng dán Bearer token vào UI và gọi thử API thật ngay trong trình duyệt.
- **Evidence**: đọc trực tiếp `app.ts` dòng 96 (`setupSwagger(app)`, không có middleware nào trước/sau) và `swagger.ts` toàn bộ file (8 dòng logic, không có guard).
- **Impact**: Bất kỳ ai biết URL server (không cần đăng nhập) đều xem được toàn bộ 88 endpoint, request/response schema, tên field nội bộ (bao gồm cả các domain nhạy cảm như RBAC/Users) — tăng bề mặt trinh sát (reconnaissance) cho attacker. Đây là pattern phổ biến ở môi trường dev nhưng thường được khuyến nghị tắt hoặc bảo vệ bằng auth ở production.
- **Recommendation**: Cân nhắc chỉ mount `/api-docs` khi `NODE_ENV !== "production"`, hoặc thêm 1 lớp auth cơ bản (Basic Auth/IP whitelist) nếu cần giữ ở production cho mục đích nội bộ.
- **Confidence**: CONFIRMED (code). Đây là quyết định thiết kế phổ biến, không chắc là "lỗi" — cần người vận hành xác nhận đây có phải chủ đích (docs API công khai cho đối tác/FE) hay chỉ quên tắt ở production. **UNKNOWN** về chủ đích.

---

### RV00-04 — 2 rate-limiter độc lập, cùng cấu hình, cùng áp cho `/api/auths/*` (đã biết ở Phase 03, xác nhận lại còn nguyên)
- **Severity**: LOW
- **Category**: Maintainability / Duplication
- **File**: `backend/src/app.ts` (`authLimiter`, dòng 79-86), `backend/src/middlewares/authRateLimiter.middleware.ts` (`authRateLimiter`)
- **Function/Class**: 2 instance `rateLimit()` riêng biệt.
- **Observed Behavior**: `app.ts` áp `authLimiter` (20 req/15min) cho TOÀN BỘ prefix `/api/auths`; `auth.routes.ts` (chưa đọc lại ở review này, kế thừa Phase 01/03) áp thêm `authRateLimiter` (cùng 20 req/15min) riêng cho `/login`, `/register`, `/refresh-token`. 2 bộ đếm độc lập (in-memory, không chia sẻ store).
- **Evidence**: đọc trực tiếp cả 2 file, cấu hình giống hệt nhau (`windowMs: 15*60*1000, max: 20`).
- **Impact**: Không sai về hiệu quả chặn (request vẫn bị chặn ở ngưỡng thấp hơn khi 1 trong 2 đạt giới hạn), nhưng là cấu hình dư thừa — dễ gây nhầm lẫn khi cần điều chỉnh ngưỡng (sửa 1 chỗ tưởng đã đủ, quên chỗ còn lại).
- **Recommendation**: Gộp về 1 nguồn cấu hình duy nhất — đề xuất giữ `authRateLimiter.middleware.ts` (đã dùng `standardHeaders`/`ApiError.tooManyRequests` chuẩn hơn) và bỏ `authLimiter` inline trong `app.ts`, chỉ để 3 route auth cụ thể có rate-limit qua middleware riêng.
- **Confidence**: CONFIRMED (kế thừa nguyên văn Phase 03 §10.1, xác nhận lại đúng bằng source hiện tại, không đổi).

---

### RV00-05 — `JWT_SECRET`/`JWT_REFRESH_SECRET` không được validate ở bootstrap (không fail-fast)
- **Severity**: LOW-MEDIUM
- **Category**: Configuration / Reliability
- **File**: `backend/server.ts` (chỉ check `PORT`, `MONGO_URI`), `backend/src/middlewares/auth.middleware.ts` (dùng `process.env.JWT_SECRET!` — non-null assertion)
- **Function/Class**: bootstrap script (`server.ts`), `authenticate`
- **Observed Behavior**: `server.ts` chỉ throw ngay khi thiếu `PORT`/`MONGO_URI`. Nếu `.env` thiếu `JWT_SECRET`, server vẫn khởi động bình thường — lỗi chỉ xuất hiện ở **request đầu tiên** gọi `jwt.verify(token, process.env.JWT_SECRET!, ...)` (giá trị sẽ là `undefined`, khiến `jwt.verify` throw runtime error, bị `authenticate`'s catch bắt và trả `401 "Token không hợp lệ"` — SAI Ý NGHĨA, vì đây là lỗi cấu hình hạ tầng chứ không phải token client sai).
- **Evidence**: đọc trực tiếp `server.ts` (chỉ 2 check) và `auth.middleware.ts` dòng 32 (`process.env.JWT_SECRET!`).
- **Impact**: Người vận hành deploy thiếu `JWT_SECRET` sẽ thấy TOÀN BỘ API yêu cầu đăng nhập trả về "Token không hợp lệ" ngay cả với token đúng — dễ chẩn đoán nhầm là lỗi client/token hết hạn thay vì lỗi cấu hình server, kéo dài thời gian debug.
- **Recommendation**: Thêm check `JWT_SECRET`/`JWT_REFRESH_SECRET` vào khối validate ENV ở `server.ts` (cùng chỗ với `PORT`/`MONGO_URI`), fail-fast ngay lúc khởi động với message rõ ràng.
- **Confidence**: CONFIRMED (code, kế thừa Phase 03 §7.1 — Phase 03 đã ghi nhận sự kiện này nhưng chưa đánh giá theo mức Severity; review này bổ sung đánh giá impact/recommendation cụ thể).

---

### RV00-06 — Dead code cross-cutting đã biết, xác nhận lại còn nguyên (không có thay đổi giữa 2 commit)
- **Severity**: INFO (đã biết, không phải phát hiện mới, chỉ xác nhận chưa được dọn)
- **Category**: Technical Debt
- **File/Function**:
  - `backend/src/middlewares/loadDocument.middleware.ts` — toàn bộ middleware, không gắn route nào (khớp Phase 03 §5.1, Phase 07 §5.3).
  - `backend/src/config/database/mongo.logger.ts` — `registerMongoLogger()` không được gọi ở đâu, dù `.env`/`​.env.example` vẫn khai báo `MONGO_DEBUG`/`MONGO_SLOW_MS` như đang hoạt động (khớp Phase 03 §7.2).
  - `backend/src/shared/errors/errorHandler.ts` — file `@deprecated`, không có import nào trỏ tới (khớp Phase 03 §9).
  - `backend/src/config/database/database.ts` — ~55 dòng code cũ bị comment nguyên khối ở đầu file (xác nhận lại đúng số dòng ở commit hiện tại, không đổi so với Phase 03).
- **Observed Behavior**: Cả 4 vị trí trên vẫn y nguyên ở commit `5b58fb1` so với `f4ce8e9` — không có thay đổi.
- **Impact**: Không ảnh hưởng runtime. Nhiễu khi đọc/audit code, tăng chi phí bảo trì khi có người mới đọc nhầm tưởng đang hoạt động (đặc biệt `mongo.logger.ts` vì `.env` vẫn khai báo biến liên quan).
- **Recommendation**: Không đề xuất xoá ngay (ngoài scope review). Ghi nhận lại để đưa vào `16_REFACTORING_PLAN.md` nếu có nhu cầu dọn dẹp technical debt có chủ đích.
- **Confidence**: CONFIRMED (xác nhận lại bằng source hiện tại).

---

### RV00-07 — `memoryCache.ts` không có request-coalescing, và cùng giới hạn "single-instance" như `permission.cache.ts`
- **Severity**: INFO
- **Category**: Architecture (đã tự ghi nhận trong code, xác nhận lại)
- **File**: `backend/src/shared/cache/memoryCache.ts`
- **Function/Class**: `getOrSetCache`
- **Observed Behavior**: Nhiều request cache-miss đồng thời sẽ cùng gọi `compute()` riêng lẻ (không coalescing) — đã tự ghi chú rõ trong comment source là "chấp nhận được". Cùng giới hạn in-memory single-process như `permission.cache.ts` (Phase 02 §6.4) — không đồng bộ giữa nhiều instance nếu scale ngang.
- **Impact**: Chấp nhận được ở quy mô 1 instance hiện tại (đúng như tự đánh giá trong code); trở thành vấn đề thật nếu scale ngang nhiều instance/pod mà chưa chuyển sang Redis.
- **Recommendation**: Không cần hành động ngay. Khi có kế hoạch scale ngang, xử lý đồng thời với `permission.cache.ts` (đã ghi nhận Phase 02/07) — nên dùng chung 1 giải pháp (Redis/pub-sub) cho cả 2 thay vì xử lý riêng lẻ.
- **Confidence**: CONFIRMED (code tự ghi chú rõ, không phải suy diễn).

---

## 3. Không phát hiện (đã kiểm tra, không có vấn đề)

- **Middleware order** (`app.ts`): đúng thứ tự an toàn — request-id trước tiên (phục vụ log lỗi), `helmet`/`cors` trước `express.json`, rate-limit trước route handler, `errorHandler` cuối cùng. Không có vấn đề thứ tự.
- **`catchAsync`/`ApiError`/`withTransaction`**: implementation đúng như mô tả, không phát hiện bug logic. `withTransaction` đóng `session` trong `finally` — không rò rỉ session.
- **`validate.middleware.ts`**: 3 hàm (`validateBody`/`validateQuery`/`validateParams`) đều dùng `safeParse` (không throw trực tiếp từ Zod), forward lỗi qua `next(ApiError.badRequest(...))` đúng pattern thống nhất toàn hệ thống — không có inconsistency.
- **Circular dependency**: không phát hiện ở tầng foundation/cross-cutting (middlewares/shared/config) trong phạm vi các file đã đọc — các file này chỉ phụ thuộc model/utils, không phụ thuộc ngược lại middleware khác.
- **`tsconfig.json`**: `strict: true` bật đầy đủ — mức an toàn kiểu dữ liệu tốt ở tầng compile.

---

## 4. Tổng hợp theo mức độ

| Severity | Số lượng | ID |
|---|---|---|
| HIGH | 1 | RV00-01 |
| MEDIUM | 1 | RV00-02 |
| LOW-MEDIUM | 2 | RV00-03, RV00-05 |
| LOW | 1 | RV00-04 |
| INFO | 2 | RV00-06, RV00-07 |

**Không có CRITICAL nào mới phát hiện ở review này** (CRITICAL đã biết — ISS-01/ISS-02/ISS-03/ISS-09 — thuộc domain khác, ngoài phạm vi Foundation/Cross-cutting, đã xử lý riêng ở TASK-001/002 cho ISS-01).

---

## 5. Unknowns cần xác minh thêm (không suy diễn)

- RV00-01: môi trường production thật có reverse proxy tự serve `/uploads` hay không — nếu có, mức độ nghiêm trọng giảm xuống INFO; nếu không, đây là tính năng hỏng thật sự.
- RV00-02: loại lỗi 500 thực tế nào từng xảy ra trong vận hành thật (log production) để đánh giá mức độ đã từng lộ thông tin gì — chưa có log thật để đối chiếu.
- RV00-03: chủ đích thiết kế của việc để `/api-docs` public — cần người vận hành xác nhận.

---

**REVIEW-00 COMPLETED — KHÔNG thực hiện REVIEW-01 ở lượt này theo yêu cầu.**
