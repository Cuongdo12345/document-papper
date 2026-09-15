# 01 — PROJECT OVERVIEW

> Phase: 01 — Clone & Project Discovery
> Trạng thái: Khảo sát bề mặt (không phân tích sâu, không đánh giá quality)

---

## 1. Project Purpose

Theo `README.md` (nguồn duy nhất mô tả mục đích, không suy diễn thêm):

> "Document & Medical Device Manager" — Hệ thống quản lý tài liệu và tài sản/thiết bị y tế nội bộ, hỗ trợ:
> - Workflow duyệt tài liệu đa cấp
> - Quản lý vòng đời tài sản (bảo hành, kiểm định)
> - Phân quyền RBAC + ABAC (Policy-based)
> - Báo cáo/dashboard tổng hợp

Ngoài ra trong repo còn có 2 file tài liệu bổ sung chưa được đọc chi tiết ở phase này:
- `DANH-GIA-TONG-THE.md` (12K) — có vẻ là một tài liệu đánh giá tổng thể, đã tồn tại sẵn trong repo (không phải do Claude tạo).
- `luong-du-lieu-DMS.html` (56K) — tài liệu mô tả luồng dữ liệu DMS, dạng HTML.

Hai file trên **chưa được đọc/phân tích nội dung** ở Phase 01, cần xem xét ở phase sau.

---

## 2. Repository Information

| Thông tin | Giá trị |
|---|---|
| Remote URL | https://github.com/Cuongdo12345/document-papper.git |
| Local path | `/home/claude/document-papper` |
| Branch hiện tại | `main` |
| Commit hiện tại | `f4ce8e9083e16c01177f53a3871b66cfde4133b8` ("update") |
| Tác giả commit mới nhất | Đỗ Mạnh Cường-60135196 <caicui050400@gmail.com> |
| Ngày commit | 2026-08-24 |
| Project name (package.json) | `document-manager` (version 1.0.0) |
| Kích thước repo | ~91MB (bao gồm `.git`) |

---

## 3. Technology Stack

Xác định từ `backend/package.json` — **chỉ liệt kê những gì có bằng chứng trong dependencies thực tế**:

### Ngôn ngữ
- TypeScript (toàn bộ `src/` và `server.ts` là `.ts`)
- Cấu hình: `tsconfig.json`, `tsconfig.test.json`

### Backend Framework
- Express 5 (`express: ^5.2.1`)
- Runtime: Node.js

### Database / ODM
- MongoDB
- Mongoose (`mongoose: ^9.1.5`) — ODM
- `mongoose-to-swagger` — sinh Swagger schema từ Mongoose model

### Authentication
- JWT (`jsonwebtoken: ^9.0.3`) — access + refresh token (theo README)
- `bcrypt: ^6.0.0` — hash mật khẩu
- RBAC + ABAC (Policy-based) — có model `role.model.ts`, `permission.model.ts`, `policy.model.ts`

### Validation
- Zod (`zod: ^4.3.6`)

### API Documentation
- Swagger/OpenAPI (`swagger-jsdoc`, `swagger-ui-express`, file `src/docs/openAPI.yaml` ~160K)

### Xử lý file / Export
- ExcelJS (`exceljs: ^4.4.0`) — export Excel
- `docx: ^9.6.1` — export Word
- Multer (`multer: ^2.1.0`) — upload file
- `file-saver`, `qrcode`

### Khác
- `node-cron: ^4.6.0` — job định kỳ (cron)
- `nodemailer: ^9.0.3` — gửi email (có view email tại `src/views/email/`)
- `helmet`, `cors`, `compression`, `cookie-parser`, `morgan` — middleware bảo mật/logging chuẩn Express
- `express-rate-limit` — chống brute-force

### Build tools
- `typescript` (`tsc`)
- `ts-node-dev` — hot reload dev
- Script build tuỳ chỉnh: `scripts/copy-static-assets.js` (copy yaml/ejs sang `dist/`)

### Testing tools
- `ts-jest`, cấu hình tại `backend/jest.config.js`
- Test match pattern: `**/__tests__/**/*.test.ts`
- **Lưu ý**: Ở thời điểm khảo sát, **không tìm thấy thư mục `__tests__` hoặc file `*.test.ts` nào trong source** — cấu hình test tồn tại nhưng chưa có test case nào được viết (hoặc chưa được commit).

### Deployment tools
- **Không tìm thấy** Dockerfile, docker-compose, hay pipeline CI/CD (`.github/workflows`, `.gitlab-ci.yml`, v.v.) trong repo.
- README có đề cập "quan trọng cho Docker" trong comment code (`database.ts`) nhưng **không có file Docker thực tế nào trong repo**.
- Script backup MongoDB thủ công: `backend/scripts/backup-mongo.sh` (Linux) / `.ps1` (Windows) — **được README nhắc tới nhưng chưa xác minh sự tồn tại thực tế của các file này trong `backend/scripts/`** (thư mục `scripts/` hiện chỉ có `ma-chay-script.ts`, `seed-assets.ts`, `seed-assignment-history.ts` — cần đối chiếu lại ở phase sau).

### Frontend
- **Không tìm thấy thư mục frontend nào trong repo.** Toàn bộ source code hiện có chỉ gồm `backend/`. Đây là dự án **backend-only** (API service) tại thời điểm clone.

### State management
- Không áp dụng (không có frontend).

---

## 4. Directory Structure

```
document-papper/                       (repo root)
├── README.md
├── DANH-GIA-TONG-THE.md               (tài liệu có sẵn, chưa đọc chi tiết)
├── luong-du-lieu-DMS.html             (tài liệu có sẵn, chưa đọc chi tiết)
├── .gitignore
└── backend/                           (toàn bộ source code nằm ở đây)
    ├── server.ts                      # entry point khởi động server
    ├── package.json
    ├── tsconfig.json / tsconfig.test.json
    ├── jest.config.js
    ├── mongodb-transaction-setup-guide.md
    ├── scripts/
    │   ├── ma-chay-script.ts
    │   ├── seed-assets.ts
    │   └── seed-assignment-history.ts
    └── src/
        ├── app.ts                     # cấu hình Express app, đăng ký routes
        ├── config/
        │   ├── database/              # kết nối MongoDB (connect, events, shutdown)
        │   └── swagger/                # setup Swagger UI
        ├── controllers/                # theo domain (assets, auth, dashboard, departments,
        │                               #   documents, excel, notifications, performances, rbac,
        │                               #   upload, users)
        ├── docs/
        │   └── openAPI.yaml            # OpenAPI spec (~160K)
        ├── dto/                        # Zod schema validate input, theo domain
        ├── interfaces/                 # TS interface cho model, theo domain
        ├── middlewares/                # auth, authorizePermission, error, loadDocument,
        │                               #   performance, upload, validate, authRateLimiter
        ├── models/                     # Mongoose schema, theo domain
        ├── routes/                     # Express router, theo domain
        ├── services/                   # business logic, theo domain
        ├── shared/
        │   ├── cache/
        │   ├── constants/              # permission constants, role-permission map, ...
        │   ├── cron/                   # cron jobs (cảnh báo asset)
        │   ├── errors/                 # ApiError
        │   ├── helpers/
        │   ├── performance/
        │   ├── types/
        │   └── utils/
        └── views/
            └── email/                  # template email (ejs), dùng bởi Nodemailer
```

### Ghi chú
- **Không có** thư mục `tests/` cấp cao (chỉ có cấu hình Jest, chưa có test file).
- **Không có** thư mục Docker/CI-CD.
- **Không có** thư mục frontend (`client/`, `web/`, `app/`, v.v.).

---

## 5. Application Architecture (sơ bộ)

Kiến trúc phân lớp theo domain, kiểu layered/MVC mở rộng:

```
Route → Middleware (auth/validate/rate-limit) → Controller → Service → Model (Mongoose) → MongoDB
```

- **Routes** (`src/routes/`): định nghĩa endpoint, gắn middleware, theo domain.
- **Middlewares** (`src/middlewares/`): xác thực JWT (`auth.middleware.ts`), phân quyền permission (`authorizePermission.middleware.ts`), validate body bằng Zod (`validate.middleware.ts`), rate limit riêng cho auth (`authRateLimiter.middleware.ts`), xử lý lỗi tập trung (`error.middleware.ts`), đo hiệu năng (`performance.middleware.ts`), upload file (`upload.middleware.ts`), load document (`loadDocument.middleware.ts`).
- **Controllers** (`src/controllers/`): nhận request, gọi service, trả response — theo từng domain (assets, auth, dashboard, departments, documents, excel, notifications, performances, rbac, upload, users).
- **Services** (`src/services/`): business logic, thư mục lớn nhất trong `src/` (468K) — cho thấy phần lớn logic nghiệp vụ tập trung ở đây.
- **DTO** (`src/dto/`): schema Zod để validate input.
- **Models** (`src/models/`): Mongoose schema, ánh xạ tới MongoDB collections.
- **Shared** (`src/shared/`): constants (permission, role-permission map, quy tắc document, workflow docs), cron jobs, error class, cache, helpers, utils.

Ứng dụng khởi động qua `server.ts` → import `app.ts` (Express instance đã đăng ký middleware + routes) → kết nối MongoDB → đăng ký cron job → lắng nghe HTTP.

---

## 6. Frontend

Không có. Repo chỉ chứa backend API service tại thời điểm khảo sát.

---

## 7. Backend

- Framework: Express 5, ngôn ngữ TypeScript, chạy trên Node.js.
- Entry: `backend/server.ts`.
- App setup: `backend/src/app.ts` — đăng ký middleware bảo mật (helmet, cors, rate-limit), request ID, performance tracking, Swagger, và 13 nhóm route domain.
- Kiến trúc: layered theo domain (routes → controllers → services → models), mô tả ở mục 5.
- Danh sách domain hiện có trong routes: `documents`, `departments`, `auth`, `users` (+ `user-audits`), `performances`, `dashboard`, `excel` (export), `upload`, `documents/workflow`, `rbac`, `notifications`, `assets` (+ `asset-categories`, `medical-devices`).

---

## 8. Database

- MongoDB, kết nối qua Mongoose (`src/config/database/database.ts`).
- Bắt buộc biến môi trường `MONGO_URI`; nếu thiếu sẽ throw lỗi ngay khi khởi động.
- Có auto-retry kết nối sau 5s nếu thất bại.
- Pool size cấu hình qua env `MONGO_MAX_POOL_SIZE` (mặc định 20) / `MONGO_MIN_POOL_SIZE` (mặc định 2).
- Có file riêng cho database events (`database.events.ts`) và shutdown hook (`database.shutdown.ts`), cùng logger riêng (`mongo.logger.ts`).
- Danh sách Mongoose model tìm thấy (21 model, theo domain):
  - `apiPerformance/apiPerformance.model.ts`
  - `users/user.model.ts`, `users/userAudit.model.ts`
  - `auth/passwordResetToken.model.ts`, `auth/refreshToken.model.ts`
  - `importAudit/importhistory.model.ts`
  - `assets/asset.model.ts`, `assets/assetCategory.model.ts`, `assets/assetAssignmentHistory.model.ts`, `assets/medicalDeviceProfile.model.ts`, `assets/calibrationRecord.model.ts`
  - `notifications/notification.model.ts` (+ `notification.types.ts`)
  - `rbac/role.model.ts`, `rbac/permission.model.ts`, `rbac/policy.model.ts`
  - `departments/department.model.ts`
  - `uploadFiles/upload.model.ts`
  - `documents/counter.model.ts`, `documents/workflowTemplate.model.ts`, `documents/document.model.ts`, `documents/workflowInstance.model.ts`
- Có tài liệu riêng `backend/mongodb-transaction-setup-guide.md` (12K) — hướng dẫn setup transaction MongoDB, chưa đọc chi tiết.
- README cảnh báo vận hành quan trọng: không xoá trực tiếp collection cốt lõi (`User`, `Role`, `Department`) rồi tạo lại vì sẽ sinh `_id` mới làm gãy tham chiếu `ObjectId`.

---

## 9. Authentication

- Cơ chế: JWT access token + refresh token (theo README và `auth.middleware.ts`).
- `auth.middleware.ts`:
  - Lấy token từ header `Authorization: Bearer <token>`.
  - Verify bằng `jwt.verify` với whitelist thuật toán `HS256` (tường minh, tránh algorithm confusion).
  - Validate `decoded.id` là ObjectId hợp lệ trước khi dùng để query DB.
- Model liên quan: `refreshToken.model.ts`, `passwordResetToken.model.ts`.
- Route auth (`src/routes/auth/auth.routes.ts`): `/register`, `/login`, `/refresh-token`, `/logout`, `/forgot-password`, `/reset-password` — tất cả các route nhận input đều có `validateBody` (Zod DTO); `/login`, `/register`, `/refresh-token` có `authRateLimiter`.
- Phân quyền: RBAC (Role-Permission) + ABAC (Policy) — có `authorizePermission.middleware.ts` riêng (chạy sau `authenticate`, dùng cache để tránh query permission mỗi request), cùng các model `role.model.ts`, `permission.model.ts`, `policy.model.ts`, và hằng số `permission.constant.ts`, `permission.descriptors.ts`, `rolePermission.map.ts` trong `shared/constants/`.
- Bảo mật bổ sung: `helmet()`, rate-limit toàn cục cho `/api/auths` (20 request/15 phút), `bcrypt` cho hash mật khẩu.

---

## 10. Main Modules

Xác định từ cấu trúc `routes/`, `controllers/`, `services/`, `models/` (có bằng chứng rõ ràng trong source):

1. **Authentication** — đăng ký, đăng nhập, refresh token, quên/đặt lại mật khẩu.
2. **Users** — quản lý user, kèm **User Audit** (nhật ký thao tác user).
3. **RBAC** — quản lý Role, Permission, Policy (ABAC).
4. **Departments** — quản lý khoa/phòng.
5. **Documents** — CRUD tài liệu, kèm **Workflow** duyệt tài liệu đa cấp (workflow template + workflow instance).
6. **Assets** — quản lý tài sản, gồm:
   - Asset Categories (phân loại tài sản)
   - Medical Devices (thiết bị y tế — kiểm định, phân loại A/B/C/D theo README)
   - Asset Assignment History
   - Calibration Record (hồ sơ kiểm định/hiệu chuẩn)
7. **Dashboard** — thống kê tổng hợp (admin, tài sản, thiết bị y tế).
8. **Excel/Export** — xuất Excel/Word.
9. **Upload** — upload file.
10. **Notifications** — thông báo trong hệ thống.
11. **Performances** — theo dõi hiệu năng API (model `apiPerformance`).
12. **Import Audit** — nhật ký import dữ liệu (model `importhistory.model.ts`, có liên quan tới các script seed).

---

## 11. Entry Points

| Loại | File |
|---|---|
| Application entry point | `backend/server.ts` |
| Backend/API entry point | `backend/src/app.ts` (Express app + route registration) |
| Database initialization | `backend/src/config/database/database.ts` (`connectDB()`), gọi từ `server.ts` |
| Authentication entry point | `backend/src/middlewares/auth.middleware.ts` (`authenticate`), routes tại `backend/src/routes/auth/auth.routes.ts` |
| Frontend entry point | Không có (không tồn tại frontend trong repo) |

---

## 12. Configuration

- `.env.example` tồn tại tại `backend/.env.example` (nội dung cụ thể chưa được đọc ở phase này).
- Biến môi trường bắt buộc xác nhận được từ code: `PORT`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (dùng cho CORS).
- Biến môi trường tuỳ chọn xác nhận được: `MONGO_MAX_POOL_SIZE`, `MONGO_MIN_POOL_SIZE`, `NODE_ENV` (bật `morgan("dev")` khi `development`).
- `tsconfig.json` và `tsconfig.test.json` — cấu hình TypeScript riêng cho build và test.
- `src/config/swagger/swagger.ts` — cấu hình Swagger UI, phục vụ tại `/api-docs` theo README.

---

## 13. Build/Deployment

- Dev: `npm run dev` → `ts-node-dev --respawn --transpile-only server.ts`.
- Build: `npm run build` → `tsc && node scripts/copy-static-assets.js` (copy tài nguyên tĩnh như `openAPI.yaml`, template `.ejs` sang `dist/` — README nhấn mạnh bước này bắt buộc, thiếu sẽ crash khi `npm start`).
- Production start: `npm start` → `node dist/server.js`.
- **Không có** Dockerfile/docker-compose hay pipeline CI/CD nào trong repo tại thời điểm khảo sát.
- Backup MongoDB: script `backend/scripts/backup-mongo.sh` / `.ps1` được README đề cập — **cần xác minh lại sự tồn tại thực tế trong phase sau** vì không thấy trong danh sách `ls backend/scripts/` (chỉ thấy `ma-chay-script.ts`, `seed-assets.ts`, `seed-assignment-history.ts`).
- Seed scripts theo README: `npm run seed:medical-devices`, `npm run seed:rbac` — **cần đối chiếu lại với `package.json` scripts thực tế ở phase sau** vì các script này không thấy xuất hiện trong `scripts` object đã đọc được (`dev`, `build`, `start`).

---

## 14. Testing

- Framework: Jest (qua `ts-jest`), cấu hình tại `backend/jest.config.js`.
- Test pattern: `**/__tests__/**/*.test.ts`, root `src/`.
- **Không tìm thấy test file thực tế nào** trong repo tại thời điểm khảo sát — cấu hình test đã sẵn sàng nhưng chưa có test case.
- Không có script `test` trong `package.json` (`scripts` chỉ có `dev`, `build`, `start`).

---

## 15. Các điểm cần phân tích sâu (đưa sang Phase 02+)

- Đối chiếu chênh lệch giữa README (đề cập `npm run seed:medical-devices`, `npm run seed:rbac`, `backup-mongo.sh/.ps1`) và thực tế file/scripts tìm thấy trong `backend/scripts/` và `package.json`.
- Đọc chi tiết `.env.example` để liệt kê đầy đủ biến môi trường cấu hình.
- Đọc `DANH-GIA-TONG-THE.md` và `luong-du-lieu-DMS.html` — có thể là tài liệu đánh giá/luồng dữ liệu có sẵn, cần xác định nguồn gốc và độ tin cậy trước khi dùng làm tham chiếu.
- Đọc `backend/mongodb-transaction-setup-guide.md` để hiểu cách hệ thống dùng MongoDB transaction (liên quan tới các thao tác nghiệp vụ đa bước, ví dụ workflow duyệt tài liệu).
- Phân tích chi tiết luồng RBAC + ABAC (role.model, permission.model, policy.model, rolePermission.map, permission.descriptors) — cách phối hợp giữa RBAC và ABAC.
- Phân tích chi tiết luồng Workflow duyệt tài liệu đa cấp (`workflowTemplate.model.ts`, `workflowInstance.model.ts`, `workflow.routes.ts`).
- Phân tích module Assets/Medical Devices (phân loại A/B/C/D, kiểm định/calibration).
- Xác minh toàn bộ danh sách endpoint qua `src/docs/openAPI.yaml` (160K, chưa đọc chi tiết ở phase này).
- Kiểm tra cơ chế cron jobs (`shared/cron/`) — mục đích, lịch chạy, tác vụ nào (README gợi ý liên quan cảnh báo Asset).
- Làm rõ vì sao chưa có test case nào dù đã có cấu hình Jest đầy đủ.
- Xác nhận project có kế hoạch frontend hay không (hiện tại 100% backend-only).
