# 13 — FINAL PROJECT REPORT

> Phase: 13 — Final Project Report
> Phạm vi: TỔNG HỢP toàn bộ 12 phase phân tích trước (01–12). KHÔNG phân tích lại source code từ đầu; chỉ quay lại source khi cần verify 1 finding quan trọng bị nghi ngờ mâu thuẫn.
> Nguồn: `00_PROJECT_MEMORY.md`, `01_PROJECT_OVERVIEW.md` → `12_ISSUES_AND_RISKS.md`, tất cả tại commit `f4ce8e9083e16c01177f53a3871b66cfde4133b8` (branch `main`, "update", 2026-08-24).
> Quy ước: **CONFIRMED** = evidence trực tiếp trong source (kế thừa từ các phase trước). **INFERRED** = suy luận hợp lý, chưa test runtime. **UNKNOWN** = chưa đủ evidence. Report này không tạo claim mới ngoài những gì đã có trong 12 tài liệu nguồn.

---

## 0. GHI CHÚ VỀ TÍNH NHẤT QUÁN TRƯỚC KHI TỔNG HỢP (CONFLICT DETECTED)

Trước khi tổng hợp, đối chiếu `00_PROJECT_MEMORY.md` với các tài liệu Phase 11/12 phát hiện 1 điểm KHÔNG nhất quán:

- **Document A** (`00_PROJECT_MEMORY.md`, mục "Các phase đã hoàn thành" / "Phase tiếp theo"): liệt kê Phase 01–10 là hoàn thành, Phase 11 (Technical Debt) là **phase tiếp theo, chưa thực hiện**.
- **Document B** (`docs/11_TECHNICAL_DEBT.md`, `docs/12_ISSUES_AND_RISKS.md`): cả 2 file tồn tại đầy đủ nội dung theo đúng format SKILL.md, kết thúc bằng dòng xác nhận `**PHASE 11 COMPLETED**` và `**PHASE 12 COMPLETED**`.
- **Source-of-truth**: nội dung thực tế của tài liệu phân tích (Document B) được ưu tiên hơn trạng thái ghi trong Project Memory, vì Memory chỉ là bản tóm tắt điều phối và rõ ràng chưa được cập nhật sau khi Phase 11/12 hoàn tất ở một phiên làm việc trước đó.
- **Resolution**: Report này coi Phase 11 và Phase 12 là ĐÃ HOÀN THÀNH (dựa trên nội dung thực tế của 2 file), và sẽ cập nhật lại `00_PROJECT_MEMORY.md` ở bước cuối để đồng bộ đúng trạng thái thật trước khi đóng Phase 13.

---

## 1. EXECUTIVE SUMMARY

**Project là gì**: `document-manager` — hệ thống backend quản lý **tài liệu (Document) và tài sản/thiết bị y tế (Asset/Medical Device)** nội bộ cho một tổ chức dạng bệnh viện, có quy trình duyệt tài liệu đa cấp (Workflow), phân quyền RBAC + ABAC (Policy-based), và dashboard báo cáo tổng hợp. (Nguồn: README, Phase 01 §1)

**Mục đích**: số hoá quy trình tạo — trình duyệt — lưu trữ tài liệu nội bộ (đề xuất, biên bản, tham chiếu) gắn với vòng đời tài sản y tế (bảo hành, kiểm định, cấp phát), thay thế quy trình giấy tờ thủ công. (INFERRED từ domain model, Phase 08 §1)

**Quy mô**: 116 endpoint / 87 path pattern, 21 Mongoose model, 15 route file (~1227 dòng route), thư mục `services/` là lớn nhất hệ thống (468K) — cho thấy phần lớn độ phức tạp nằm ở business logic tầng Service chứ không phải ở routing/controller. (Phase 01, Phase 05; **[CẬP NHẬT DEV-071, 2026-09-21]** model count là snapshot Phase 01 — nay là **31 model** sau `DEV-057`→`070`, xem `docs/04_DATABASE_ANALYSIS.md`; endpoint/route/service-size KHÔNG được re-verify trong DEV-071, ngoài phạm vi task đó)

**Công nghệ**: Node.js + TypeScript, Express 5, MongoDB/Mongoose, JWT, Zod, Swagger/OpenAPI, ExcelJS, node-cron, Nodemailer. Xem chi tiết mục 2.

**Architecture**: monolith **layered theo domain (vertical slicing)**, 1 process, 1 kết nối MongoDB dùng chung, không microservices, không API Gateway, không message queue, không cache layer ngoài. (Phase 02 §1)

**Mức độ hoàn thiện**:
- Backend **implement đầy đủ về mặt tính năng** cho toàn bộ domain nêu trong README (Document, Workflow, Asset, Medical Device, RBAC/ABAC theo mô hình, Dashboard, Excel import/export).
- **Không có frontend** trong repo tại thời điểm phân tích — đây là dự án backend-only/API service. (Phase 01, Phase 06)
- **Zero test coverage**: có cấu hình Jest đầy đủ nhưng không có 1 file test nào trong source. (Phase 01 §Testing, ISS-07)
- **Không có Docker/CI-CD** nào trong repo. (Phase 01)
- OpenAPI documentation **gần như hoàn hảo** so với implementation thực tế: 116/116 endpoint và 87/87 path khớp giữa `openAPI.yaml` và route thực tế. (Phase 05 §9)
- Tầng **ABAC (Policy) được thiết kế đầy đủ nhưng hoàn toàn chết ở runtime** — không route nào kích hoạt được (Phase 07 §5.3, SEC-07, ISS-03) — đây là khoảng cách lớn nhất giữa "thiết kế trên giấy" và "hành vi thực tế" của toàn hệ thống.

**Điểm mạnh lớn nhất**: kiến trúc layered rõ ràng, response format có chuẩn hoá (dù chưa 100% nhất quán), domain `documents` được tách module tốt (validator/mapper/query riêng), một số pattern bảo mật và hiệu năng tốt đã được áp dụng nhất quán ở domain trung tâm (xem mục 15).

**Các vấn đề lớn nhất** (chi tiết ở mục 11/14):
1. **CRITICAL** — Privilege escalation lên ADMIN qua `PUT /api/users/:id` (SEC-05/ISS-01).
2. **CRITICAL** — Hard-delete Document theo tháng không kiểm tra tham chiếu ngược, có thể làm hỏng dữ liệu vĩnh viễn (ISS-02).
3. **CRITICAL/HIGH** — `POST /api/documents/proposal` thiếu authorization check (SEC-06/ISS-09) — bất kỳ user đăng nhập nào cũng tạo được đề xuất tài liệu.
4. **HIGH** — Toàn bộ tầng ABAC/Policy chết hoàn toàn ở runtime (SEC-07/ISS-03) — hệ thống chỉ có RBAC coarse-grained bảo vệ thực tế, dù được quảng bá là RBAC+ABAC.
5. **HIGH (dài hạn)** — Zero test coverage trên toàn bộ 116 endpoint (ISS-07).
6. `GET /api/documents` pagination hỏng hoàn toàn (luôn trả trang 1/10 bất kể query) (ISS-08).
7. Rủi ro NoSQL operator injection ở 3 domain (RBAC, Departments, UserAudit) do thiếu sanitize (SEC-13/ISS-04).

---

## 2. TECHNOLOGY STACK

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| **Frontend** | Không tồn tại | Repo chỉ có `backend/` — backend-only tại thời điểm phân tích (Phase 01, Phase 06) |
| **Backend** | Node.js, TypeScript, Express 5 (`^5.2.1`) | Layered theo domain; entry `backend/server.ts` → `backend/src/app.ts` |
| **Database** | MongoDB + Mongoose (`^9.1.5`) | Single database, 21 model tại Phase 01 → **31 model** sau DEV-057→070 (DEV-071, xem `04_DATABASE_ANALYSIS.md`); cần replica set cho transaction (UNKNOWN đã verify ở production hay chưa) |
| **Authentication** | JWT (`jsonwebtoken ^9.0.3`) + `bcrypt ^6.0.0` | Access + Refresh token; RBAC + ABAC theo model (ABAC dead runtime) |
| **Validation** | Zod (`^4.3.6`) | DTO layer, một số route bị comment out |
| **API Docs** | Swagger/OpenAPI (`swagger-jsdoc`, `swagger-ui-express`), `openAPI.yaml` (~160K) | Khớp gần hoàn hảo với implementation |
| **File processing** | ExcelJS (`^4.4.0`), `docx ^9.6.1`, Multer (`^2.1.0`), `qrcode` | Export streaming tốt; import có N+1 transaction |
| **Khác** | `node-cron`, `nodemailer`, `helmet`, `cors`, `compression`, `cookie-parser`, `morgan`, `express-rate-limit` | Cron alert Asset/Medical Device; email fire-and-forget |
| **Testing** | `ts-jest` (cấu hình có, **0 test case**) | Zero test coverage — ISS-07 |
| **Deployment** | Không có Dockerfile/docker-compose/CI-CD | README nhắc script backup/seed không tồn tại thực tế trong `scripts/` |

---

## 3. ARCHITECTURE

Kiến trúc **monolith, layered theo domain**, backend-only, REST/JSON (Phase 02 §1):

```
Client (không xác định — không có frontend trong repo)
        │  HTTP/JSON
        ▼
Express App (backend/src/app.ts)
        │
        ▼
Middleware pipeline (global: helmet, cors, json, compression,
cookieParser, morgan[dev], rateLimit[/api/auths], performanceMiddleware)
        │
        ▼
Router (theo domain, 15 nhóm) → Middleware route-level
(authenticate → authorizePermission → validateBody/Params/Query)
        │
        ▼
Controller (theo domain) → Service (business logic)
        │
        ▼
Model (Mongoose) → MongoDB
        │
        ▼
Response JSON chuẩn hoá { success, message, data } (không 100% nhất quán — xem mục 5)
```

Đặc điểm chính (Phase 02):
- 1 process Node.js duy nhất, 1 kết nối MongoDB dùng chung cho toàn bộ domain — **không phải microservices**.
- **Vertical slicing**: mỗi domain có đủ 5 lớp riêng (`routes/`, `controllers/`, `services/`, `models/`, `dto/`).
- **Cross-domain coupling xảy ra ở tầng Service** — service gọi thẳng service/model domain khác, không qua interface/event bus trung gian (TD-Architecture, ISS-47).
- Không có API Gateway, message queue, service mesh, cache layer ngoài (Redis/CDN) — chỉ có cache in-memory `Map` cho permission (TTL 5 phút, không chia sẻ giữa instance nếu scale-out).
- Cron job (`node-cron`) chạy trong cùng process, không có job queue riêng.

---

## 4. MODULE MAP

| Module | Responsibility | Main files | Dependencies |
|---|---|---|---|
| **Documents** | Quản lý tài liệu gắn workflow duyệt | `services/documents/*`, `models/documents/document.model.ts` | Workflow, RBAC, Notifications, Assets |
| **Workflow** | Quy trình duyệt đa cấp | `services/documents/workflow.service.ts`, `workflowTemplate/Instance.model.ts` | Documents, RBAC (Role), Notifications, Assets (side-effect) |
| **Assets** | Vòng đời tài sản vật lý | `services/assets/assetDevice/*`, `models/assets/asset.model.ts` | Documents, Notifications, Departments |
| **Medical Devices** | Mở rộng Asset cho thiết bị y tế (kiểm định) | `models/assets/medicalDeviceProfile.model.ts`, `calibrationRecord.model.ts` | Assets (1-1), Notifications |
| **RBAC** | Role/Permission + ABAC (Policy — dead runtime) | `services/rbac/*`, `models/rbac/{role,permission,policy}.model.ts` | Users |
| **Users** | Tài khoản + nhật ký thao tác | `services/users/users.service.ts`, `models/users/{user,userAudit}.model.ts` | RBAC, Departments |
| **Departments** | Danh mục khoa/phòng | `models/departments/department.model.ts` | Dùng bởi Documents, Assets, Users |
| **Notifications** | Thông báo nội bộ (side-effect) | `services/notifications/notification.service.ts` | Không phụ thuộc domain nào (chỉ bị gọi từ domain khác) |
| **Auth** | Đăng ký/đăng nhập/token | `services/auth/auths.service.ts`, `models/auth/{refreshToken,passwordResetToken}.model.ts` | Users, RBAC |
| **Dashboard** | Thống kê tổng hợp (read-only) | `services/dashboard/dashboard.service.ts` | Documents, Assets, MedicalDevice, Users, Departments (đọc thẳng model) |
| **Excel/Export** | Import/Export hàng loạt | `services/excel/excel.service.ts`, `assetExcel.service.ts`, `models/importAudit/importhistory.model.ts` | Documents, Departments, Assets |
| **Upload** | Lưu file chung | `services/upload/*`, `models/uploadFiles/upload.model.ts` | Không phụ thuộc domain nghiệp vụ |
| **Performances** | Theo dõi hiệu năng API | `shared/performance/performanceLogBuffer.ts`, `models/apiPerformance/apiPerformance.model.ts` | — |

(Nguồn: Phase 08 §1, Phase 02 §7)

---

## 5. BACKEND

**Architecture**: layered theo domain, entry `server.ts` → `app.ts`; thứ tự middleware toàn cục quan trọng (rate-limit riêng `/api/auths`, `performanceMiddleware` áp mọi route). Mount order đặc biệt quan trọng cho `/api/assets/*` sub-path (phải mount trước path tổng quát hơn để tránh Express khớp nhầm). (Phase 02 §3, Phase 03 §1-2)

**Routes**: 15 route file, ~1227 dòng, 116 endpoint. Domain `documents` tách file service rõ nhất (`.service`, `.validator`, `.mapper`, `.query`, `.types`, `.constants`) — cho thấy đây là domain phức tạp/được refactor nhiều nhất. (Phase 03 §6.2)

**Controllers**: format response phổ biến nhất `{success, message?, data?}`, nhưng **không đồng nhất 100%** — domain `auth` không có field `success`; domain `upload` lệch nhiều nhất (không dùng `catchAsync`/`ApiError`, tự `try/catch` + `res.status().json()`). (Phase 03 §4, Phase 05 §6.2)

**Services**: business logic chính nằm ở đây (thư mục lớn nhất hệ thống). `Auth Service` (473 dòng) xử lý login/token; `Document Service` tách 6 file. Cross-cutting: `ApiError`, `catchAsync`, `withTransaction` (yêu cầu replica set), cache permission in-memory, `Policycondition.evaluator.ts` (parser tự viết, không dùng `eval`/`Function`).

**Middleware**: phát hiện `loadDocument.middleware.ts` là **dead middleware** (viết đủ nhưng không gắn route nào — CONFIRMED, Phase 03 §5.1); 2 cấu hình Multer riêng biệt cho 2 mục đích (upload chung vs Excel import).

**Business logic**: xem mục 10.

**Dead code tích luỹ** (CONFIRMED, Phase 03 §11.4, Phase 07): `errorHandler.ts` cũ (deprecated), `loadDocument.middleware.ts`, `mongo.logger.ts` (`registerMongoLogger()` không được gọi dù `.env.example` tài liệu hoá như đang hoạt động), `upload.validator.ts:validateFiles()`, 2 hàm tự đánh dấu deprecated trong `documents.validator.ts`, `ROLE_PERMISSIONS` (223 dòng, không có seed script dùng), `assignRole()` (có safeguard đúng nhưng không gắn route nào).

---

## 6. DATABASE

**Database**: MongoDB, single database qua Mongoose ODM; kết nối `database.ts` fail-fast nếu thiếu `MONGO_URI`, tự retry 5s nếu lỗi lần đầu (không giới hạn số lần). (Phase 04 §2)

**Models**: 21 model tại Phase 04 → **31 model** sau `DEV-057`→`070` (**[CẬP NHẬT DEV-071, 2026-09-21]**, xem
`docs/04_DATABASE_ANALYSIS.md` §4.22–§4.31: thêm Vendor/Contract, ConsumableCategory/Item/Request/Transaction,
TwoFactorOtp, AssetMaintenancePlan, DocumentPdfExport, DocumentVersion), model trung tâm là `Document` (8
index, nhiều nhất hệ thống) và `WorkflowInstance`.

**Relationships**: chủ yếu qua `ref:` ObjectId (User→Role, Document→Department, Asset→Category, MedicalDeviceProfile 1-1 Asset). Ngoại lệ đáng chú ý: **`WorkflowInstance.steps[].role` lưu free string thay vì ObjectId reference** — rủi ro Workflow "kẹt vĩnh viễn" nếu Role bị đổi tên/xoá sau khi Template đã tạo. (Phase 02, Phase 04 §12.3, TD-Architecture)

**Important queries**:
- `getPendingApprovalsForRole` (`WorkflowInstance`) — dùng `$expr + $arrayElemAt`, **không có index**, khả năng cao full collection scan (COLLSCAN), rủi ro hiệu năng cao nhất hệ thống (PERF-01, ISS-05).
- Dashboard (`adminDashboardSummaryService`) — dùng `Promise.all` chạy song song nhiều aggregate (điểm tốt).

**Indexes** (tổng hợp Phase 04 §10): **7/21 model không có index** ngoài `_id` — `RefreshToken`, `Role`, `Permission`, `Policy`, `WorkflowTemplate`, `WorkflowInstance`, `Upload`. Trong đó `RefreshToken`, `Policy`, `WorkflowInstance` có evidence bị query theo field không index ở tần suất cao (login/refresh/logout, ABAC fallback, hộp thư chờ duyệt). **[CẬP NHẬT DEV-071, 2026-09-21]** danh sách 7 model trên KHÔNG đổi, nhưng mẫu số nay là 31 (cả 10 model mới từ `DEV-057`→`070` đều CÓ index) → tỷ lệ thực tế **7/31 (≈23%)**, giảm so với 7/21 (≈33%).

**Data risks** (Phase 04 §12):
- Hard-delete `deleteDocumentsByMonthService` và `hardDeleteAssetService` **không check tham chiếu ngược** trước khi xoá → dữ liệu mồ côi/mất tham chiếu vĩnh viễn (ISS-02).
- RBAC: Role có thể bị xoá dù đang được dùng trong Workflow Template/Instance (không có guard).
- `Document.meta`/`Asset.specs` là `Mixed` field, không có ràng buộc shape ở tầng DB.
- Transaction (`withTransaction`) yêu cầu MongoDB replica set — **chưa xác minh** ở môi trường production thực tế (UNKNOWN, ISS-10).

---

## 7. API

**API groups**: 15 module, khớp hoàn toàn với Phase 01/02 — Authentication, Users(+Audit), RBAC, Departments, Documents(+Workflow), Assets(+Categories, +Medical Devices), Dashboard, Notifications, Excel/Export, Upload, Performances. Tổng 116 endpoint / 87 path pattern.

**Important endpoints** (Phase 05 §4):
- `POST /api/documents/proposal` — **thiếu authorization check** (SEC-06/ISS-09, CONFIRMED).
- `POST /api/workflows/:id/approve` — flow duyệt chính, có transaction.
- `POST /api/auths/login` — chống account-enumeration/timing attack tốt.
- `GET /api/documents`, `GET /api/users`, `GET /api/notifications` — **pagination bug**, `validateQuery` bị comment out ở route trong khi service layer giả định Zod đã coerce string→number, hệ quả: `GET /api/documents` luôn trả trang 1/10 bất kể query param (ISS-08, mức độ nghiêm trọng nhất trong 3 domain).

**Authentication**: JWT access+refresh, whitelist thuật toán `HS256`.

**Authorization**: `authenticate` → `authorizePermission(permissions, options)`; 103/103 lời gọi trong route KHÔNG truyền `options.enablePolicies` → toàn bộ tầng ABAC không thể kích hoạt (chi tiết mục 9).

**API inconsistencies** (Phase 05 §11, tổng hợp ưu tiên):
- Pagination bug (3 domain, mức độ khác nhau).
- Response shape không đồng nhất (`success` field, tên field pagination `totalPages` vs `totalPage`).
- File upload không truy cập được qua HTTP — **không có `express.static()`** cho thư mục lưu file, `fileUrl` trả về không dùng trực tiếp được (TD-23).
- Comment lỗi thời trong `openAPI.yaml` về 4 permission Upload "chưa tồn tại" dù đã có trong `permission.constant.ts`.

**OpenAPI vs Implemented**: **khớp hoàn hảo** — 0 documented-but-not-implemented, 0 implemented-but-not-documented trong 116 endpoint (Phase 05 §9) — điểm tích cực nổi bật của dự án.

---

## 8. FRONTEND

**N/A — Không tồn tại.** Repo tại thời điểm phân tích chỉ có `backend/`. Không có thư mục `client/`/`web/`/`app/`, không có React/Vue/Angular, không state management, không routing frontend. Phase 06 kết luận CONFIRMED ngay từ đầu và không tiếp tục phân tích các mục Pages/Components/State/API layer/User flows vì không có evidence source để phân tích. (Phase 06 §0)

---

## 9. AUTHENTICATION & RBAC

```
Login (auths.service.ts:login)
  → Verify credential (bcrypt compare, chống timing attack)
  → Sinh Access Token (JWT, HS256, payload chứa role/department — dư thừa so với comment)
  → Sinh Refresh Token (lưu DB, KHÔNG rotate khi refresh)
  → Client lưu token (không có session server-side)
→ Mỗi request: middleware `authenticate`
  → Verify JWT, load lại `isActive` mới nhất từ DB (vô hiệu hoá user ngay lập tức nếu bị khoá)
→ middleware `authorizePermission(permissions, options)`
  → Check Role → Permission (RBAC coarse-grained, có cache in-memory TTL 5 phút)
  → (Policy/ABAC — CHẾT hoàn toàn vì `options.enablePolicies` không bao giờ được truyền)
→ Resource (Controller → Service)
```

**Login/Token** (Phase 07 §2-3): access + refresh token JWT; refresh token **không rotate**; `changePassword()` tự đổi mật khẩu **không revoke** các refresh token khác đang hoạt động — bất đối xứng so với mọi flow đổi mật khẩu khác (SEC-01, POTENTIAL RISK).

**Session**: không có session server-side (stateless JWT).

**Role/Permission**:
- Mô hình dữ liệu: `Role` ↔ `Permission` (many-to-many qua field mảng), `Policy` (ABAC, dead runtime).
- **2 lớp nguồn permission không tự động đồng bộ**: `permission.constant.ts` (code-level) vs `Permission` collection (DB thật); `ROLE_PERMISSIONS` (223 dòng cấu hình ý đồ phân quyền) được viết cho 1 seed script **không tồn tại** trong repo (SEC-09).
- **ABAC/Policy hoàn toàn không thể kích hoạt ở runtime** — phát hiện quan trọng nhất Phase 07: 103 route calls tới `authorizePermission()` đều không truyền `options.enablePolicies` (SEC-07/ISS-03, CRITICAL RISK theo Risk Matrix vì Probability = 100% thời gian).

**Findings nghiêm trọng nhất** (Phase 07 §9, Phase 09):
- **CRITICAL — Privilege escalation lên ADMIN qua `PUT /api/users/:id`**: route cập nhật user thiếu safeguard gán role, trong khi safeguard đúng đã tồn tại ở hàm `assignRole()` — nhưng hàm này **không được gắn vào bất kỳ route nào** (SEC-05/ISS-01).
- **HIGH — `POST /api/documents/proposal` thiếu authorization check** (SEC-06/ISS-09).
- **MEDIUM — Cache permission không invalidate** khi đổi role qua endpoint đang chạy (SEC-08).

**Điểm thiết kế tốt đã xác nhận** (Phase 07 §9.9, Phase 09 §10): chống account-enumeration/timing attack ở login/forgotPassword; `authenticate` luôn load `isActive` mới nhất; whitelist `HS256` tường minh; `logout()` chỉ thu hồi token của chính mình.

---

## 10. BUSINESS LOGIC

**Core business domains**: Documents, Workflow, Assets, Medical Devices, RBAC, Users, Departments, Notifications, Auth, Dashboard, Excel/Export, Upload, Performances (đầy đủ 13 domain, xem Module Map mục 4).

**Main workflows** (Phase 08 §3):
1. **Vòng đời Document + Workflow (happy path)**: tạo đề xuất (`proposal`) → submit vào Workflow (theo Template) → duyệt tuần tự từng bước theo `role` (string) → hoàn tất → cập nhật `workflowStatus`.
2. **Nhánh Reject**: dừng workflow tại bước reject, cập nhật trạng thái tương ứng.
3. **Nhánh Cancel**: người tạo có thể huỷ trước khi hoàn tất.
4. **Vòng đời sửa chữa Asset** (`PROPOSE_REPAIR → CONFIRM_STATUS`): gắn với Document loại báo cáo, đồng bộ trạng thái Asset khi Document/Workflow liên quan thay đổi.

**Status transitions**:
- `Document.workflowStatus`: state machine đầy đủ (draft → pending → approved/rejected/cancelled, tuỳ cấu hình Template).
- `Asset.status`: đồng bộ side-effect khi Workflow sửa chữa liên quan hoàn tất.
- `MedicalDeviceProfile`/`CalibrationRecord`: không phải state machine rời rạc, mà là bản ghi lịch sử theo thời gian (kiểm định định kỳ).

**Important business rules**: chi tiết đầy đủ theo format RULE/EVIDENCE/SOURCE/FUNCTION ở `08_BUSINESS_LOGIC.md` §2 (Documents, Workflow, Assets & Medical Devices, RBAC) — không lặp lại toàn bộ ở đây theo nguyên tắc tối ưu context.

**Actors**: Người tạo Document, Approver (theo role từng bước Workflow), Admin, người quản lý tài sản (IT/phòng vật tư), người được cấp phát tài sản, nhân viên kiểm định thiết bị y tế.

**Side effects** (Phase 08 §7): tạo Notification (kèm gửi email fire-and-forget, không `await`), đồng bộ trạng thái Asset khi Workflow approve — các side-effect này **nằm ngoài transaction chính theo chủ đích thiết kế** (đánh đổi consistency tuyệt đối lấy việc không để lỗi phụ làm hỏng thao tác chính; rủi ro eventual-consistency chưa có cơ chế bù trừ retry/outbox).

**Business inconsistencies** (Phase 08 §9, mới phát hiện không lặp Phase 02-07): các điểm mâu thuẫn nhỏ giữa comment code và hành vi thực tế đã ghi nhận ở mục Technical Debt (mục 13).

---

## 11. SECURITY

> Tổng hợp từ `09_SECURITY_ANALYSIS.md` — 27 finding SEC-01→SEC-27. Chỉ liệt kê CRITICAL/HIGH/MEDIUM; LOW/INFO xem Appendix (mục 11.1).

**Executive Summary security** (Phase 09 §0): 1 CRITICAL, 3 HIGH, 7 MEDIUM, 8 LOW, 3 INFO.

| ID | Severity | Category | Tóm tắt | Confidence |
|---|---|---|---|---|
| SEC-05 | **CRITICAL** | Authorization | Privilege escalation lên ADMIN qua `PUT /api/users/:id` | CONFIRMED |
| SEC-06 | **HIGH** | Authorization | `POST /api/documents/proposal` thiếu authorization check | CONFIRMED |
| SEC-07 | **HIGH** | Authorization | Tầng ABAC/Policy hoàn toàn dead ở runtime | CONFIRMED |
| SEC-13 | **HIGH** | Injection | NoSQL operator injection qua gán trực tiếp filter (RBAC/Departments/UserAudit) | CONFIRMED (code), INFERRED (khai thác) |
| SEC-01 | MEDIUM | Authentication | Refresh token không rotate + `changePassword()` không revoke | CONFIRMED |
| SEC-08 | MEDIUM | Authorization | Cache permission không invalidate khi đổi role qua endpoint thật | CONFIRMED |
| SEC-14 | MEDIUM | Injection | ReDoS/regex injection không escape (Departments, RBAC) | CONFIRMED |
| SEC-15 | MEDIUM | Injection | CSV Formula/Excel Injection — thiếu neutralize ký tự kích hoạt công thức | CONFIRMED (code), UNKNOWN (khai thác) |
| SEC-10 | MEDIUM | Input Validation | 11 route có `validateQuery` bị comment out | CONFIRMED |

(Đầy đủ 27 finding bao gồm LOW/INFO: xem `09_SECURITY_ANALYSIS.md` §9 — bảng tổng hợp gốc.)

### 11.1 Appendix — LOW/INFO (rút gọn)

Password policy yếu (min 5 ký tự), JWT secret không fail-fast lúc khởi động, JWT payload dư thừa `role`/`department`, `ROLE_PERMISSIONS` không đồng bộ DB thật, thiếu `validateParams`/`validateBody` ở Departments/1 phần RBAC, path traversal tiềm năng qua `file.originalname` không sanitize, type-check file upload chỉ dựa MIME client cung cấp, CORS mở `*` nếu thiếu `CLIENT_URL`, thiếu `trust proxy`, rò rỉ `err.message` ở 1 số nhánh lỗi, rate limiting chỉ áp dụng `/api/auths/*`. Điểm tích cực (INFO): không phát hiện secret hard-code, `.env` không commit, `User.password` bảo vệ đúng (`select:false`).

### 11.2 Điểm thiết kế bảo mật tốt (đối trọng)

Chống account-enumeration/timing attack nhất quán; whitelist JWT `HS256`; `Policycondition.evaluator.ts` không dùng `eval`/`Function`; `documents.mapper.ts` có `buildDocumentFilter` (whitelist field) và `escapeRegex` — mẫu hình tốt nên nhân rộng sang các domain còn thiếu (RBAC, Departments, UserAudit — liên quan trực tiếp SEC-13/SEC-14).

---

## 12. PERFORMANCE

> Nguồn: `10_PERFORMANCE_ANALYSIS.md` — source-code-based, KHÔNG benchmark thật. Phân loại CONFIRMED FROM CODE / POTENTIAL RISK / NEEDS BENCHMARK.

**Database bottlenecks**:
- `WorkflowInstance` COLLSCAN qua `$expr` ở endpoint duyệt tần suất cao, không index (PERF-01, CONFIRMED FROM CODE).
- `RefreshToken` không index `token`, không tự dọn (PERF-02).
- `Document` thiếu index `isActive`/`deletedAt` cho dashboard (PERF-03).
- 7/21 model không có index bổ sung (PERF-04; nay 7/31, xem DEV-071).
- Thiếu `.lean()` nhất quán ở list endpoint Users/RBAC (PERF-05, POTENTIAL RISK).

**API issues**: không có caching layer nào (Redis/CDN/HTTP cache) toàn hệ thống (PERF-14); pagination bug là hệ quả performance ngoài ý muốn ở Users/Notifications (PERF-15, NEEDS BENCHMARK).

**Backend issues**:
- **PERF-07 (đáng chú ý nhất)**: Excel import Document — mỗi dòng file mở 1 MongoDB transaction riêng, tối đa 5000 transaction/file (`MAX_IMPORT_ROWS=5000`), không batch.
- PERF-09: Cron cảnh báo Asset/Medical Device — N+1 query Role/User lặp lại mỗi asset, ghi tuần tự không batch.
- PERF-10: Import Asset Excel — đã tránh N+1 cho lookup category/department (điểm tốt) nhưng ghi vẫn tuần tự, không `insertMany`.
- PERF-13: overhead cố hữu `withTransaction`, bị khuếch đại bởi PERF-07.

**Frontend issues**: N/A (không có frontend).

**File processing**: Export Excel (Document, Asset) dùng cursor + `ExcelJS.stream.xlsx.WorkbookWriter` streaming — **thiết kế tốt** (PERF-11). Import thì có N+1 transaction/ghi tuần tự như trên.

**Điểm thiết kế hiệu năng tốt** (đối trọng, Phase 10 §7): export streaming đúng chuẩn; `syncDepartmentFromExcel` dùng `insertMany({ordered:false})`; `performanceLogBuffer.ts` batch + sampling giảm tải ghi log; giới hạn `MAX_IMPORT_ROWS/MAX_SYNC_ROWS=5000` chặn trường hợp cực đoan; Dashboard dùng `Promise.all` song song hoá aggregate; email trong `createNotification` fire-and-forget không chặn luồng chính.

---

## 13. TECHNICAL DEBT

> Nguồn: `11_TECHNICAL_DEBT.md` — 30 mục TD-01→TD-30 theo 9 nhóm (Architecture, Code Quality, API, Database, Security*, Performance*, Testing, Deployment, Maintainability). *Security/Performance debt chỉ reference finding ID, không lặp nội dung.

**TOP technical debt** (ưu tiên CRITICAL/HIGH theo `11_TECHNICAL_DEBT.md` §10, tóm lược):

| Nhóm | Vấn đề nổi bật nhất | Effort khắc phục |
|---|---|---|
| Architecture | Toàn bộ tầng ABAC là kiến trúc hoàn chỉnh nhưng chết hoàn toàn ở runtime | Trung bình (quyết định giữ/bỏ trước) |
| Architecture | `WorkflowInstance.steps[].role` lưu free string, không phải ObjectId reference | Trung bình–Cao (đổi schema + migration) |
| Architecture | 2 lớp nguồn permission không có cầu nối tự động (`permission.constant.ts` vs DB) | Trung bình |
| Code Quality | 7 vị trí dead code (errorHandler cũ, loadDocument, mongo.logger, upload.validator, documents.validator×2, ROLE_PERMISSIONS, assignRole) | Thấp (cần xác nhận kỹ trước khi xoá) |
| Code Quality | Response format không đồng nhất giữa domain (`success` field, tên pagination field) | Thấp–Trung bình |
| Testing | Không có bất kỳ test case nào dù đã cấu hình Jest | Cao (khối lượng lớn) |
| Deployment | Không có Docker/CI-CD nào | Trung bình |
| Deployment | README tham chiếu script không tồn tại (`seed:rbac`, `seed:medical-devices`, backup script) | Thấp |

(Đầy đủ 30 mục TD-01→TD-30 với Evidence/Impact/Priority/Recommendation/Effort: xem `11_TECHNICAL_DEBT.md` §1-9.)

---

## 14. ISSUES & RISKS

> Nguồn: `12_ISSUES_AND_RISKS.md` — Risk Register đầy đủ ISS-01→ISS-51+.

### TOP 10 ISSUES (CRITICAL & HIGH, chi tiết đầy đủ ở `12_ISSUES_AND_RISKS.md` §3)

| # | ID | Issue | Severity |
|---|---|---|---|
| 1 | ISS-01 | Privilege escalation lên ADMIN qua `PUT /api/users/:id` | CRITICAL |
| 2 | ISS-02 | Hard-delete Document theo tháng không kiểm tra tham chiếu ngược | CRITICAL |
| 3 | ISS-03 | Toàn bộ tầng ABAC (Policy) chết hoàn toàn ở runtime | HIGH |
| 4 | ISS-04 | Rủi ro NoSQL operator injection qua gán trực tiếp filter | HIGH |
| 5 | ISS-05 | `WorkflowInstance` không index, full collection scan tần suất cao | HIGH |
| 6 | ISS-06 | Excel import Document: N+1 transaction (tối đa 5000/file) | HIGH |
| 7 | ISS-07 | Zero test coverage trên toàn bộ 116 endpoint | HIGH (dài hạn) |
| 8 | ISS-08 | `GET /api/documents` luôn trả trang 1/10 bất kể query | HIGH |
| 9 | ISS-09 | `POST /api/documents/proposal` thiếu authorization check | HIGH |
| 10 | ISS-10 | MongoDB replica set (bắt buộc cho transaction) chưa xác minh production | UNKNOWN impact nếu sai = CRITICAL |

### TOP 10 RISKS (theo Risk Matrix Probability × Impact, `12_ISSUES_AND_RISKS.md` §4-5)

| # | ID | Risk | Risk Class |
|---|---|---|---|
| 1 | ISS-01 | Privilege escalation ADMIN | Critical Risk |
| 2 | ISS-02 | Hard-delete Document không check reference | Critical Risk |
| 3 | ISS-09 | `documents/proposal` thiếu authorization | Critical Risk |
| 4 | ISS-03 | ABAC dead runtime | Critical Risk |
| 5 | ISS-07 | Zero test coverage | Critical Risk (dài hạn) |
| 6 | ISS-04 | NoSQL operator injection | High Risk |
| 7 | ISS-06 | Excel import N+1 transaction | High Risk |
| 8 | ISS-08 | Pagination Documents hỏng hoàn toàn | High Risk |
| 9 | ISS-05 | `WorkflowInstance` COLLSCAN | High Risk |
| 10 | ISS-10 | Giả định replica set chưa xác minh | Unclassified (Impact CRITICAL nếu sai, Probability UNKNOWN) |

---

## 15. STRENGTHS

Không chỉ là danh sách lỗi — các điểm tích cực đã được xác nhận xuyên suốt 12 phase:

- **Good architecture decisions**: layered theo domain nhất quán; `shared/` tách cross-cutting concerns rõ ràng (`ApiError`, `catchAsync`, `withTransaction`); side-effect (Notification, đồng bộ Asset) được đặt ngoài transaction chính một cách **có chủ đích** để tránh lỗi phụ làm hỏng thao tác chính.
- **Good patterns**: `documents.mapper.ts:buildDocumentFilter` (whitelist field cứng) và `escapeRegex` — mẫu hình nên nhân rộng sang các domain còn thiếu.
- **Good security practices**: chống account-enumeration/timing attack nhất quán ở login/forgotPassword; whitelist thuật toán JWT (`HS256`) tường minh; `authenticate` luôn load lại `isActive` mới nhất mỗi request; `User.password` có `select:false`; không phát hiện secret hard-code; `Policycondition.evaluator.ts` không dùng `eval`/`Function` dù hiện dead code (an toàn nếu sau này được kích hoạt); template email chỉ dùng `<%= %>` escaped output.
- **Good abstractions**: domain `documents` tách 6 file service riêng biệt (service/validator/mapper/query/types/constants) — mẫu hình tách trách nhiệm rõ ràng, dễ bảo trì hơn các domain khác.
- **Reusable components**: `performanceLogBuffer.ts` (batch-flush giảm 50–100 lần round-trip DB); pattern export Excel dùng cursor + streaming (`ExcelJS.stream.xlsx.WorkbookWriter`) áp dụng nhất quán cho cả Document và Asset; `insertMany({ordered:false})` trong `syncDepartmentFromExcel`.
- **Maintainable areas**: OpenAPI documentation khớp hoàn hảo 116/116 endpoint với implementation thực tế — hiếm gặp trong dự án thực tế, giúp onboarding và tích hợp dễ dàng hơn hẳn.

---

## 16. RECOMMENDED ROADMAP

> Mỗi mục liên kết trực tiếp với Issue/Risk ID (mục 14) hoặc Technical Debt ID (mục 13).

### Phase A — Immediate (0–1 tuần)
- Bỏ comment `authorizePermission("DOCUMENT_CREATE")` ở `POST /api/documents/proposal` — 1 dòng, rủi ro thay đổi rất thấp. **(ISS-09/SEC-06)**
- Khôi phục `validateQuery(QueryDocumentDTO)` cho `GET /api/documents` — fix pagination. **(ISS-08)**
- Rà soát dữ liệu Role/Permission thật trong MongoDB xem role nào đang có `USER_UPDATE`; thu hồi tạm nếu không hợp lý. **(ISS-01/SEC-05)**
- Xác minh cấu hình MongoDB production có phải replica set hay không (`rs.status()`). **(ISS-10)**
- Ngừng/hạn chế tính năng "xoá Document theo tháng" cho tới khi có guard tham chiếu. **(ISS-02)**

### Phase B — Short Term (1–4 tuần)
- Áp safeguard của `assignRole()` vào route `update()` User; gọi `clearPermissionCache()` khi role đổi. **(ISS-01)**
- Thêm guard đếm tham chiếu (`WorkflowInstance`/`referenceTo`/`Notification`) trước `deleteMany` ở hard-delete Document/Asset. **(ISS-02)**
- Rà soát toàn bộ 116 route tìm các dòng `authorizePermission` bị comment tương tự SEC-06. **(ISS-09)**
- Quyết định rõ ràng giữ/bỏ ABAC; nếu giữ, gắn `options.enablePolicies` cho route Document/Asset. **(ISS-03)**
- Khôi phục `validateQuery` Zod nghiêm ngặt ở 11 route đã comment; thêm kiểm tra `typeof value === "string"` tại Service cho RBAC/Departments/UserAudit. **(ISS-04)**
- Thêm script `test` vào `package.json`; viết test cho luồng CRITICAL/HIGH (login/RBAC, workflow transition, hard-delete guard). **(ISS-07)**
- Refactor `importDocumentsExcel` sang batch transaction theo nhóm dòng (100–500 dòng/transaction). **(ISS-06)**
- Thêm index `{status:1}` tối thiểu cho `WorkflowInstance` (test ở staging trước). **(ISS-05)**

### Phase C — Medium Term (1–3 tháng)
- Tách endpoint "gán role" thành luồng riêng, permission `ROLE_ASSIGN` riêng, audit log riêng. **(ISS-01)**
- Đánh giá chuyển hẳn Document sang soft-delete đồng bộ với domain khác. **(ISS-02)**
- Rà soát thủ công toàn diện department-scoping/ownership ở mọi endpoint `:id` để xác nhận không có IDOR. **(ISS-03, TD liên quan)**
- Thêm middleware sanitize NoSQL tổng quát tương thích Express 5; nhân rộng `buildDocumentFilter`/`escapeRegex` sang mọi domain. **(ISS-04, SEC-13/14)**
- Chuẩn hoá response format toàn hệ thống (field `success`, tên pagination). **(TD Code Quality)**
- Thêm `express.static()` có kiểm soát truy cập cho thư mục upload. **(TD-23)**
- Xoá dead code đã xác nhận không dùng (7 vị trí). **(TD-24)**
- Đánh giá denormalize `currentStepRole` để loại bỏ phụ thuộc `$expr` trong query Workflow. **(ISS-05)**

### Phase D — Long Term (3+ tháng)
- Thiết lập ngưỡng test coverage tối thiểu trong CI; mở rộng dần ra toàn bộ 116 endpoint. **(ISS-07)**
- Xây dựng Docker/CI-CD chính thức, ghi nhận rõ yêu cầu hạ tầng (replica set) vào tài liệu triển khai. **(ISS-10, TD Deployment)**
- Cân nhắc Redis-based permission cache nếu có kế hoạch scale-out đa instance. **(TD-29)**
- Đổi `WorkflowInstance.steps[].role` từ free string sang ObjectId reference tới `Role` (cần migration dữ liệu). **(TD Architecture)**
- Xây dựng cơ chế bù trừ (retry/outbox pattern) cho side-effect nằm ngoài transaction chính. **(ISS-48)**

---

## 17. PRIORITY MATRIX

| Priority | Issue | Impact | Effort | Recommendation |
|---|---|---|---|---|
| P0 | ISS-01 — Privilege escalation ADMIN | CRITICAL | Thấp (safeguard đã có sẵn, chỉ cần gắn) | Áp `assignRole()` safeguard vào `update()` User ngay |
| P0 | ISS-09 — `documents/proposal` thiếu authorization | HIGH | Rất thấp (1 dòng) | Bỏ comment `authorizePermission` ngay |
| P0 | ISS-08 — Pagination Documents hỏng | MEDIUM–HIGH | Rất thấp (1 dòng) | Khôi phục `validateQuery` ngay |
| P0 | ISS-10 — Replica set chưa xác minh | CRITICAL nếu sai | Rất thấp (chỉ verify, không đổi code) | Verify hạ tầng ngay lập tức |
| P1 | ISS-02 — Hard-delete không check reference | CRITICAL | Trung bình | Thêm guard đếm tham chiếu trước xoá |
| P1 | ISS-04 — NoSQL operator injection | HIGH | Trung bình | Vá nhanh tại Service + khôi phục validateQuery |
| P1 | ISS-03 — ABAC dead runtime | HIGH | Trung bình–Cao (cần quyết định chiến lược) | Quyết định giữ/bỏ; nếu giữ thì kích hoạt có chọn lọc |
| P1 | ISS-05 — WorkflowInstance COLLSCAN | MEDIUM | Thấp (thêm index, cần staging trước) | Thêm index `{status:1}` |
| P2 | ISS-06 — Excel import N+1 transaction | HIGH (chỉ khi traffic/file lớn) | Trung bình | Refactor sang batch transaction |
| P2 | ISS-07 — Zero test coverage | HIGH (dài hạn) | Cao | Bắt đầu từ luồng CRITICAL/HIGH, mở rộng dần |
| P3 | TD Code Quality (response format, dead code) | LOW | Thấp–Trung bình | Dọn dần khi chạm vào từng file |
| P3 | TD Deployment (Docker/CI-CD, README) | LOW | Trung bình | Lên kế hoạch riêng, không khẩn cấp |

---

## 18. DEVELOPER ONBOARDING

### 1. Where to start
Đọc `01_PROJECT_OVERVIEW.md` (mục đích, tech stack) → `02_ARCHITECTURE.md` (luồng request tổng thể) → source thực tế bắt đầu từ `backend/server.ts` → `backend/src/app.ts`.

### 2. Important folders
- `backend/src/routes/` — điểm vào của mọi domain.
- `backend/src/services/` — chứa toàn bộ business logic (folder lớn nhất, 468K).
- `backend/src/models/` — 21 Mongoose schema tại Phase 01 → 31 sau `DEV-057`→`070` (DEV-071).
- `backend/src/shared/` — cross-cutting concerns (`ApiError`, `catchAsync`, `withTransaction`, cache, cron, performance).
- `backend/src/docs/openAPI.yaml` — tài liệu API đầy đủ, khớp 100% với implementation, nên dùng làm reference đầu tiên khi tìm hiểu 1 endpoint cụ thể.

### 3. Important modules
Documents, Workflow, RBAC (đặc biệt hiểu rõ ABAC hiện KHÔNG hoạt động dù có model đầy đủ), Assets/Medical Devices — 4 module này chiếm phần lớn độ phức tạp nghiệp vụ.

### 4. Important APIs
`POST /api/documents/proposal`, `POST /api/workflows/:id/approve`, `POST /api/auths/login`, `GET /api/documents` (lưu ý bug pagination đang tồn tại — mục 14 ISS-08).

### 5. Important database models
`Document` (trung tâm, 8 index), `WorkflowInstance` (không index, cẩn thận khi thêm feature liên quan tới truy vấn hàng loạt), `User`/`Role`/`Permission` (RBAC), `Asset`/`MedicalDeviceProfile` (1-1).

### 6. Authentication
JWT access+refresh, middleware `authenticate` → `authorizePermission`. **Lưu ý quan trọng**: `options.enablePolicies` hiện KHÔNG được truyền ở bất kỳ route nào — ABAC/Policy không có tác dụng bảo vệ thực tế dù model tồn tại đầy đủ.

### 7. Business workflows
Xem sơ đồ vòng đời Document+Workflow ở mục 10 báo cáo này, chi tiết đầy đủ tại `08_BUSINESS_LOGIC.md` §3.

### 8. How to run
Cấu hình `.env` theo `.env.example` (`PORT`, `MONGO_URI` bắt buộc — fail-fast nếu thiếu); `npm run dev` (dùng `ts-node-dev`, dựa trên script build/dev đã ghi nhận Phase 01). **Lưu ý**: các script README nhắc (`seed:rbac`, `seed:medical-devices`) **không tồn tại thật** trong `package.json`/`scripts/` — không dựa vào README cho việc này.

### 9. How to test
**Chưa có cách nào** — 0 test case dù đã cấu hình Jest (`ts-jest`, pattern `**/__tests__/**/*.test.ts`). Đây là gap lớn nhất về chất lượng dài hạn (ISS-07).

### 10. What to be careful about
- **ABAC không hoạt động** — đừng giả định resource-level authorization đang được bảo vệ ngoài RBAC coarse-grained.
- **Pagination `GET /documents`/`/users`/`/notifications` có bug** — đừng dựa vào `page`/`limit` query cho tới khi được fix.
- **Hard-delete Document/Asset không check tham chiếu** — cẩn trọng tuyệt đối khi dùng tính năng xoá theo tháng.
- **`withTransaction` yêu cầu replica set** — nếu deploy môi trường mới không phải replica set, các luồng dùng transaction sẽ lỗi.
- Thứ tự mount route `/api/assets/*` là bắt buộc (sub-path phải mount trước path tổng quát).

---

## 19. ARCHITECTURE QUICK REFERENCE

```
document-manager (backend-only, Node.js/TS/Express 5/MongoDB)
  │
  ├── Modules: Documents, Workflow, Assets, Medical Devices, RBAC(+ABAC dead),
  │            Users, Departments, Notifications, Auth, Dashboard, Excel, Upload, Performances
  │
  ├── Frontend: KHÔNG TỒN TẠI (backend-only tại thời điểm phân tích)
  │
  ├── API: 116 endpoint / 87 path, REST/JSON, JWT auth, RBAC coarse-grained
  │        (ABAC không hoạt động), OpenAPI khớp 100% implementation
  │
  ├── Backend: layered theo domain, routes→middleware→controllers→services→models
  │            Business logic tập trung ở services/ (folder lớn nhất)
  │
  └── Database: MongoDB (Mongoose), 21 model tại Phase 01 → 31 sau DEV-057→070 (DEV-071), Document là model trung tâm,
               WorkflowInstance rủi ro hiệu năng cao nhất (không index),
               transaction yêu cầu replica set (chưa xác minh production)
```

**5 điều quan trọng nhất cần nhớ**: (1) không có frontend, (2) ABAC chết ở runtime, (3) 1 lỗ hổng leo thang đặc quyền CRITICAL đang tồn tại (`PUT /users/:id`), (4) pagination Documents hỏng hoàn toàn, (5) zero test coverage.

---

## 20. FINAL VERIFICATION

- **Không tự tạo thông tin không có evidence**: mọi con số/finding trong report này trích trực tiếp từ 12 tài liệu nguồn (Phase 01–12), có ghi rõ nguồn (Phase X §Y hoặc ID finding) tại mỗi mục.
- **Không biến inference thành fact**: các finding gắn nhãn INFERRED/POTENTIAL RISK/UNKNOWN ở tài liệu gốc được giữ nguyên nhãn khi trích dẫn vào report này (vd SEC-13 "CONFIRMED (code), INFERRED (khai thác)", ISS-10 "UNKNOWN" probability).
- **Không duplicate quá nhiều nội dung**: report này tóm lược và trỏ về tài liệu chi tiết (`0X_....md`) thay vì chép lại toàn bộ bảng gốc, đúng theo OBJECTIVE của Phase 13.
- **Kiểm tra consistency giữa các documents**: đã thực hiện ở mục 0 — phát hiện 1 conflict (trạng thái Phase 11/12 giữa Memory và tài liệu thật) và đã ghi rõ resolution. Không phát hiện conflict nội dung nghiệp vụ/kỹ thuật nào khác giữa 12 tài liệu khi đối chiếu chéo Architecture ↔ Backend ↔ Database ↔ API ↔ Auth/RBAC ↔ Business Logic ↔ Security ↔ Performance ↔ Technical Debt ↔ Issues (các phase sau đều kế thừa và trích dẫn đúng finding ID của phase trước, không có số liệu mâu thuẫn).
- **Unknowns quan trọng còn tồn đọng xuyên suốt project** (không lặp lại toàn bộ, chỉ nêu những cái ảnh hưởng lớn nhất tới mức độ nghiêm trọng thực tế của các finding CRITICAL/HIGH):
  - Dữ liệu Role/Permission THẬT trong MongoDB (ảnh hưởng trực tiếp mức độ khai thác ISS-01/SEC-05).
  - Môi trường production có phải MongoDB replica set hay không (ISS-10, ảnh hưởng mọi luồng `withTransaction`).
  - Số lượng bản ghi thực tế và traffic thực tế theo endpoint (ảnh hưởng mức độ nghiêm trọng thực tế của mọi finding hiệu năng PERF-01→16).
  - Mức độ khai thác thực tế của NoSQL operator injection (SEC-13) và path traversal upload (SEC-16) — cần test runtime, ngoài phạm vi phân tích tĩnh của toàn bộ project này.
  - Nội dung `DANH-GIA-TONG-THE.md`, `luong-du-lieu-DMS.html`, `mongodb-transaction-setup-guide.md` — chưa từng được đọc chi tiết xuyên suốt 13 phase (ngoài phạm vi source-of-truth chính là source code).

---

**PHASE 13 COMPLETED — PROJECT ANALYSIS COMPLETED**
