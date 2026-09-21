# Phase 15 — Architecture Review

> Ngày: 2026-08-31. Đánh giá kiến trúc CURRENT STATE dựa trên historical analysis (Phase 02/03/05), `docs/14_ANALYSIS_AUDIT.md`, và source code hiện tại. KHÔNG phân tích lại toàn bộ project, KHÔNG refactor, KHÔNG sửa source.
>
> **Quan hệ với `docs/21_GLOBAL_ARCHITECTURE_REVIEW.md`** (đã tồn tại, viết 2026-08-31 trước phase này): tài liệu đó tổng hợp kiến trúc từ 8 module code review (REVIEW-00→16), theo 11 hạng mục riêng (Layer Violations, Coupling, Cohesion...). Phase 15 này đọc TRỰC TIẾP `02_ARCHITECTURE.md`/`03_BACKEND_ANALYSIS.md`/`05_API_ANALYSIS.md` (không đọc lại `06_FRONTEND_ANALYSIS.md` vì file này KHÔNG TỒN TẠI — xem Mục 4) theo đúng cấu trúc 18 mục được yêu cầu, và bổ sung các finding MỚI rút ra trực tiếp từ 2 tài liệu Phase 03/05 chưa từng được đưa vào `21_GLOBAL_ARCHITECTURE_REVIEW.md` (đánh số tiếp `ARCH-27` trở đi). Finding trùng với tài liệu đó được THAM CHIẾU LẠI bằng ID gốc (`ARCH-01`→`ARCH-26`), không lặp lại toàn văn.

---

## 1. Objective

Đánh giá kiến trúc hiện tại của hệ thống (backend-only monolith) theo các trục: tách trách nhiệm (responsibility separation), coupling, cohesion, hướng phụ thuộc (dependency direction), circular dependency, duplicate logic, ranh giới API/Database. Mục tiêu là XÁC MINH và BỔ SUNG — không phải viết lại từ đầu — dựa trên bằng chứng đã có trong `02_ARCHITECTURE.md` (Phase 02), `03_BACKEND_ANALYSIS.md` (Phase 03, đọc toàn văn), `05_API_ANALYSIS.md` (Phase 05, đọc toàn văn), `14_ANALYSIS_AUDIT.md` (Phase 14), và `21_GLOBAL_ARCHITECTURE_REVIEW.md`.

---

## 2. Current Architecture

Không đổi so với Phase 02, đã được `14_ANALYSIS_AUDIT.md` Mục 4 xác nhận lại (CONFIRMED) qua 8 module review độc lập:

- **Kiểu**: Monolith, layered theo domain (vertical slicing), backend-only, REST/JSON thuần, 1 process Node.js duy nhất.
- **5 lớp trên mỗi domain (lý thuyết)**: `routes/ → middlewares → controllers/ → services/ → models/`; thực tế chỉ domain `documents` áp dụng đủ 5 lớp (thêm `.validator/.mapper/.query/.types/.constants`) — xem ARCH-22 (Mục 8/11).
- **Database**: MongoDB/Mongoose, single database, transaction qua `session.withTransaction()` (yêu cầu replica set — chưa xác minh hạ tầng thật, `14_ANALYSIS_AUDIT.md` Mục 20).
- **Không có**: API Gateway, message queue, service mesh, cache layer ngoài (Redis), structured logger (winston/pino — CONFIRMED ở Phase 03 §8, chưa từng được ghi trong `02_ARCHITECTURE.md`/`21_GLOBAL_ARCHITECTURE_REVIEW.md` — xem ARCH-30).
- **Frontend**: KHÔNG TỒN TẠI trong repo (xem Mục 4).

---

## 3. Backend Architecture Review

Nguồn: `03_BACKEND_ANALYSIS.md` (đọc toàn văn) — xác nhận lại bằng `14_ANALYSIS_AUDIT.md` Mục 5.

### 3.1 Routes
15 file route, 1227 dòng, pattern chuẩn `authenticate → authorizePermission → validateParams? → validateBody? → controller`. Áp dụng nhất quán ở đa số domain — ngoại lệ đã biết: `POST /documents/proposal` thiếu `authorizePermission` (ISS-09, vẫn OPEN — `14_ANALYSIS_AUDIT.md` Mục 15).

### 3.2 Middleware
8 middleware cross-cutting (`authenticate`, `authorizePermission`, `validateBody/Query/Params`, `authRateLimiter`, `errorHandler`, `uploadExcel`, `loadDocument`, `performanceMiddleware`). `loadDocument.middleware.ts` là **dead middleware xác nhận CONFIRMED** — viết đủ logic (kể cả hướng dẫn cách gắn cho ABAC) nhưng chưa từng được gắn vào route nào (`03_BACKEND_ANALYSIS.md` §5.1) — hệ quả trực tiếp: nhánh ABAC của `authorizePermission` không có route nào cung cấp đủ `req.resource` để đánh giá policy condition.

### 3.3 Controllers
Đa số mỏng, dùng `catchAsync` + `ApiError`. Ngoại lệ DUY NHẤT: `upload.controller.ts` — không dùng `catchAsync`/`ApiError` ở bất kỳ hàm nào, tự `try/catch`/`res.status().json()` (đã xác nhận ARCH-09 trong `21_GLOBAL_ARCHITECTURE_REVIEW.md`).

### 3.4 Services
Domain `documents` tách rõ nhất (`.validator/.mapper/.query/.types/.constants`), các domain khác Service gọi thẳng Model (đã xác nhận ARCH-22).

### 3.5 Models/Data Access
21 Mongoose model tại thời điểm review này → **31 model** sau `DEV-057`→`070` (**[CẬP NHẬT DEV-071,
2026-09-21]**, xem `docs/04_DATABASE_ANALYSIS.md` §4.22–§4.31; tầng data-access của 10 model mới CHƯA được
review lại ở đây — ngoài phạm vi DEV-071). Chỉ `documents` có tầng data-access tách riêng (`.query.ts`).

### 3.6 Utilities/Configuration
Xem Mục 8 (Configuration) — nhiều vị trí thiếu đồng bộ giữa `.env.example` và code thực tế dùng (ARCH-28).

### 3.7 Error Handling
1 error handler chính thức (`error.middleware.ts`), 1 file deprecated tự đánh dấu (`shared/errors/errorHandler.ts`, dead code, không ai import). Ngoại lệ nhất quán: domain `upload` (xem 3.3).

---

## 4. Frontend Architecture Review

**KHÔNG ÁP DỤNG.** `docs/06_FRONTEND_ANALYSIS.md` KHÔNG TỒN TẠI trong repo tại thời điểm review này (đã kiểm tra `wc -l` trực tiếp — file không có). Repo chỉ có `backend/`, không có `client/`/`web/`/`app/`, không React/Vue/Angular, không state management (`02_ARCHITECTURE.md` §2, xác nhận lại xuyên suốt toàn bộ 16 module review — không review nào phát hiện thư mục frontend). Mọi mục "Pages/Components/Hooks/Stores/API layer/Routing/Permission guards" theo yêu cầu Bước 4 của task này **không có đối tượng để đánh giá**.

---

## 5. API Boundary Review

Trace: `Frontend (không tồn tại) → API Client (không tồn tại) → HTTP → Backend Route → Middleware → Controller → Service`. Vì không có frontend, boundary thực tế bắt đầu từ HTTP request bất kỳ (client ngoài phạm vi repo).

### 5.1 Boundary Route↔Middleware — vấn đề chính: Service tin tưởng ngầm Middleware ĐÃ chạy đúng (ARCH-27, HIGH — MỚI)

- **Area**: API Boundary (Route/Middleware ↔ Service)
- **Problem**: Service layer được viết với giả định "Zod DTO đã coerce string→number ở tầng route" nhưng route thực tế đã bị comment `validateQuery` — không có cơ chế nào (type system, test, lint) phát hiện sự lệch pha này.
- **Evidence**: `05_API_ANALYSIS.md` §4.4-4.6 (đọc toàn văn) — 3 domain độc lập (Documents, Users, Notifications) cùng mắc lỗi: `document.service.ts:getAllDocumentsService` dùng `Number.isInteger(page)` (kiểm tra KIỂU, không parse — luôn `false` với string) → luôn fallback `page=1`; `users.service.ts:getList` hoàn toàn KHÔNG có phòng thủ (`skip = (page-1)*limit` với `page`/`limit` là `undefined`/string thô); `notification.controller.ts` dùng TypeScript type assertion (`as unknown as {page:number}`) — chỉ có tác dụng lúc biên dịch, KHÔNG chuyển đổi giá trị lúc runtime.
- **File**: `services/documents/document.service.ts`, `services/users/users.service.ts:getList`, `controllers/notifications/notification.controller.ts`.
- **Function/Class**: `getAllDocumentsService`, `getList`, notification list controller.
- **Current Behavior**: `GET /api/documents?page=X&limit=Y` LUÔN trả trang 1/10 bất kể query. `GET /api/users`/`GET /api/notifications` có hành vi runtime KHÔNG XÁC ĐỊNH với `page`/`limit` (`.skip(NaN)`/`.limit("<string>")`) — chưa test runtime (UNKNOWN theo `05_API_ANALYSIS.md` §12).
- **Impact**: Đây là ví dụ RÕ NHẤT của lỗi kiến trúc "hợp đồng ngầm giữa 2 tầng không được ràng buộc bởi type system" — Service tin tưởng 1 side-effect của Middleware (coercion) mà không có cách nào TypeScript/runtime phát hiện khi Middleware đó bị tắt. **Asset domain (`asset.service.ts`) là NGOẠI LỆ DUY NHẤT dùng đúng `parseInt(page, 10)` tường minh** — không phụ thuộc `validateQuery` — chứng minh đây không phải giới hạn kỹ thuật mà là thiếu nhất quán khi viết code.
- **Confidence**: HIGH (evidence trực tiếp, đọc code cả 4 domain).
- **Liên hệ**: Hệ quả cụ thể của ARCH-24 (`21_GLOBAL_ARCHITECTURE_REVIEW.md` — "validateQuery bị comment không đồng đều") — ARCH-27 bổ sung PHÂN TÍCH CƠ CHẾ tại sao đây là vấn đề kiến trúc (ngầm coupling giữa layer), không chỉ là 1 bug đơn lẻ.

### 5.2 Boundary Route params — thiếu nhất quán `validateParams(IdParamDTO)` (ARCH-29, MEDIUM — MỚI)

- **Area**: API Boundary (Route layer)
- **Problem**: `validateParams(IdParamDTO)` (ép `:id` phải là ObjectId hợp lệ trước khi vào Controller) được áp dụng KHÔNG đồng đều.
- **Evidence**: `05_API_ANALYSIS.md` §5.1 — `rbac.routes.ts` chỉ có `validateParams` ở `GET /:id`, THIẾU ở toàn bộ `PUT`/`DELETE` theo `:id` (Permission/Role/Policy); `department.routes.ts` KHÔNG có `validateParams` ở BẤT KỲ route nào.
- **File**: `routes/rbac/rbac.routes.ts`, `routes/departments/department.routes.ts`.
- **Current Behavior**: `:id` không hợp lệ rơi vào Mongoose `CastError` (được `error.middleware.ts` map về 400) thay vì bị chặn RÕ RÀNG ở tầng route — hành vi cuối giống nhau (400) nhưng đường đi khác nhau, giảm tính đoán trước của API boundary.
- **Impact**: MEDIUM — không phải lỗ hổng, nhưng là inconsistency ở đúng lớp có trách nhiệm rõ ràng nhất (route validation).
- **Confidence**: HIGH.

### 5.3 Boundary Response contract — tên field pagination lệch giữa domain (ARCH-31, LOW — MỚI)

- **Area**: API Boundary (Response contract)
- **Evidence**: `05_API_ANALYSIS.md` §6.3 — Documents trả `pagination:{..., totalPages}`, Users trả `pagination:{..., totalPage}` (thiếu "s") — 2 domain cùng khái niệm, tên field khác nhau.
- **Impact**: LOW — bất kỳ client nào (kể cả tương lai nếu có frontend) phải tự biết field name khác nhau theo từng domain thay vì dùng chung 1 type.
- **Confidence**: HIGH.

### 5.4 Boundary File access — file lưu nhưng không có route serve (đã biết, tham chiếu lại)

Xem `ARCH` tương ứng đã có trong Global Security/Architecture Review — `05_API_ANALYSIS.md` §5.4 xác nhận DỨT ĐIỂM (grep toàn bộ, không có `express.static` nào) — không lặp lại chi tiết, tham chiếu HIGH-09 (`20_GLOBAL_SECURITY_REVIEW.md`), RV00-01.

---

## 6. Database Boundary Review

Trace: `Service → Data Access → Model → Database`.

- **Data access responsibility**: chỉ domain `documents` có tầng `.query.ts` tách biệt Service (business rule) khỏi Model (Mongoose query thuần) — 20/21 model còn lại bị Service gọi trực tiếp (ARCH-22, đã có trong Global Architecture Review). **[CẬP NHẬT DEV-071, 2026-09-21]** "21" là tổng tại thời điểm review này; nay là 31 model (`DEV-057`→`070`) — tỷ lệ "còn lại bị Service gọi trực tiếp" CHƯA được re-verify cho 10 model mới (Vendors/Inventory/2FA/PDF export/Document version), ngoài phạm vi DEV-071.
- **Model coupling**: Dashboard/Excel import thẳng Model domain khác, bỏ qua Service layer (ARCH-01, ARCH-02).
- **Query placement**: nhất quán ở domain có `.query.ts`; ở domain khác, query nằm ngay trong Service (chấp nhận được với domain nhỏ, nhưng không có ranh giới rõ khi domain lớn dần).
- **Aggregation placement**: tập trung đúng trong `services/dashboard/*.ts` — không có aggregation nào bị đặt lẫn trong Controller.
- **Transaction responsibility**: `withTransaction()` (shared util) được gọi từ Service, đúng vị trí (Service điều phối transaction, không phải Controller/Model) — 5 file dùng, đã audit đầy đủ ở `14_ANALYSIS_AUDIT.md` Mục 6. Side-effect (Notification, sync Asset) CHỦ ĐÍCH nằm ngoài transaction chính (ARCH-18, ARCH-19, ARCH-20 — đã có trong Global Architecture Review).
- **Referential integrity boundary**: validate CHỈ ở chiều "tạo" quan hệ mới, KHÔNG có ở chiều "huỷ nguồn" — pattern lặp lại ≥3 domain độc lập (ARCH-05, HIGH — đã có, xem Mục 9).

Không phát hiện vấn đề MỚI ở Database Boundary ngoài những gì đã có trong `16_DATABASE_CROSS_DOMAIN_REVIEW.md`/`21_GLOBAL_ARCHITECTURE_REVIEW.md` — Mục này XÁC NHẬN LẠI, không lặp chi tiết.

---

## 7. Authentication/RBAC Architecture

> ⚠️ OUTDATED một phần (2026-09-11, DEV-041): dòng "KHÔNG route nào wire đủ ABAC (loadDocument dead)" bên dưới KHÔNG còn đúng — từ DEV-009A/034/038/039 (2026-09-06→10), `GET /documents/:id` đã wire đầy đủ `enablePolicies+resource+action` + `loadDocument.middleware.ts`. Nhận định "department-scoping bị mỗi domain tự cài đặt rời rạc" (ARCH-06) thì VẪN ĐÚNG, xem review đầy đủ + đề xuất hướng giải quyết ở `docs/development/tasks/DEV-041.md`.

Không đổi so với Phase 02 §6, xác nhận lại ở `14_ANALYSIS_AUDIT.md` Mục 9-10:

```
authenticate (JWT verify, load User+role+department+isActive, KHÔNG load permission)
  → authorizePermission(perms, opts)
      1. Super Admin bypass (so khớp CHUỖI role.name==="ADMIN" — không phải cờ hệ thống riêng)
      2. RBAC check (cache in-memory TTL 5 phút, fallback getUserEffectivePermissions)
      3. ABAC fallback (chỉ khi enablePolicies+resource+action — KHÔNG route nào truyền đủ, vì loadDocument dead — mục 3.2)
```

**Điểm kiến trúc yếu nhất đã xác nhận nhiều lần độc lập** (Phase 07/09 gốc, REVIEW-02, Global Security Review, `14_ANALYSIS_AUDIT.md`): bypass dựa trên so khớp CHUỖI `"ADMIN"` — cho phép 2 con đường tấn công độc lập tới CÙNG hậu quả (ISS-01, đã RESOLVED; `RV02-01`, vẫn CRITICAL/OPEN — đổi TÊN 1 role khác thành "ADMIN"). Tầng ABAC được thiết kế đúng cho resource-level authorization nhưng **không có route nào wire đủ** (`loadDocument` dead — mục 3.2) — hệ quả kiến trúc: department-scoping bị mỗi domain tự cài đặt rời rạc, không nhất quán (ARCH-06, HIGH).

---

## 8. Module Dependency Review

Không đổi so với Phase 02 §7 (dependency graph là DAG thuần, xác nhận KHÔNG có circular dependency — Mục 12). Bổ sung 1 quan sát MỚI từ `05_API_ANALYSIS.md` không có trong Phase 02/`21_GLOBAL_ARCHITECTURE_REVIEW.md`:

### ARCH-32 — `GET /api/assets/:id/documents` dùng permission domain khác (`DOCUMENT_VIEW` thay vì `ASSET_*`) (INFO — MỚI, không phải bug)

- **Area**: Module Dependency (Authorization boundary xuyên domain)
- **Evidence**: `05_API_ANALYSIS.md` §7 mục 4 — route Asset nhưng check quyền Document, có comment giải thích rõ đây là quyết định tường minh (không phải sơ suất).
- **Current Behavior**: Endpoint thuộc route-tree `assets/` nhưng quyền truy cập được quyết định bởi permission catalog của domain `documents` — thể hiện đúng bản chất dữ liệu trả về (danh sách Document liên quan tới Asset) hơn là vị trí route.
- **Impact**: INFO — decision hợp lý, nhưng là 1 dạng "permission cross-domain wiring" cần ghi chú rõ khi audit RBAC theo route-prefix (dễ bị hiểu nhầm là thiếu sót nếu chỉ nhìn qua danh sách permission theo domain).
- **Confidence**: HIGH.

---

## 9. Coupling Findings

Tổng hợp (tham chiếu ID gốc, không lặp toàn văn — đã có đầy đủ evidence trong `21_GLOBAL_ARCHITECTURE_REVIEW.md`):

| ID | Finding | Mức độ |
|---|---|---|
| ARCH-01 | Dashboard import thẳng Model domain khác, bỏ qua Service | MEDIUM |
| ARCH-02 | Excel service đọc thẳng Model `Department` | LOW-MEDIUM |
| ARCH-04 | Cụm coupling sâu nhất: Documents↔Assets↔Notifications↔RBAC (không có event bus/abstraction trung gian) | **HIGH** |
| ARCH-05 | Phòng thủ tham chiếu bất đối xứng (chặt ở "tạo", lỏng ở "huỷ nguồn") — lặp lại ≥3 domain | **HIGH** |
| ARCH-06 | Authorization/scoping không tập trung — mỗi domain tự làm khác nhau | **HIGH** |
| ARCH-27 (mới, Mục 5.1) | Service ngầm phụ thuộc side-effect của Middleware (coercion) không được type-system ràng buộc | **HIGH** |

**Nhận xét bổ sung từ Phase 03/05 chưa có trong Global Architecture Review**: `authorizePermission.middleware.ts` (tầng cross-cutting) phụ thuộc trực tiếp `models/rbac/policy.model`, `models/users/userAudit.model` (`03_BACKEND_ANALYSIS.md` §11.2) — middleware hạ tầng dùng chung nhưng import thẳng Model của 2 domain nghiệp vụ (RBAC, Users) thay vì qua service layer riêng — chấp nhận được về mặt thực dụng (đã ghi ARCH-03 trong Global Architecture Review), nhưng đáng chú ý đây là 1 trong RẤT ÍT nơi middleware cross-cutting có domain knowledge trực tiếp.

---

## 10. Cohesion Findings

Tham chiếu `21_GLOBAL_ARCHITECTURE_REVIEW.md` Mục 4 (ARCH-07: `excel.service.ts` 996 dòng đa domain; ARCH-08: `workflow.service.ts` bị pha loãng bởi ~500 dòng code chết). Bổ sung từ Phase 03:

### ARCH-33 — Domain `upload`: cohesion thấp giữa validate/business logic/middleware factory (MEDIUM — MỚI)

- **Area**: Cohesion (domain Upload)
- **Evidence**: `03_BACKEND_ANALYSIS.md` §11.1 — business logic (`saveFilesToDB`), validate (`upload.validator.ts` — viết ra nhưng KHÔNG được gọi, dead code) và middleware factory (`createUploader`) đều nằm rải rác trong `services/upload/`, controller tự làm việc lẽ ra middleware/service nên làm (error formatting thủ công thay vì qua `ApiError`).
- **File**: `services/upload/upload.validator.ts` (`validateFiles` — dead), `services/upload/upload.service.ts`, `services/upload/upload.middleware.ts`, `controllers/upload/upload.controller.ts`.
- **Current Behavior**: 1 hàm validate viết đầy đủ logic (max size, max total size, max files, allowed types) nhưng KHÔNG CÓ consumer nào — `createUploader` tự có logic validate riêng, không dùng hàm này.
- **Impact**: Domain Upload là nơi TẬP TRUNG NHIỀU NHẤT các lệch khỏi convention chung của hệ thống (response shape — Mục 5.3; error handling — Mục 3.3; nay thêm cohesion) — củng cố nhận định "đây là domain phát triển sớm/tách biệt, chưa được đồng bộ lại" đã nêu ở ARCH-23 (Global Architecture Review).
- **Confidence**: HIGH.

---

## 11. Responsibility Violations

| ID | Finding | Nguồn |
|---|---|---|
| ARCH-27 | Service tin tưởng ngầm Middleware đã coerce dữ liệu — vi phạm ranh giới trách nhiệm giữa 2 tầng | Mục 5.1 (mới) |
| ARCH-03 | `authorizePermission` (middleware) ghi thẳng vào `UserAudit` model (domain Users) | `21_GLOBAL_ARCHITECTURE_REVIEW.md` |

### ARCH-34 — 2 hàm business-logic cũ (`validateStatusTransition`/`validateStatusPermission`) còn tồn tại trong `documents.validator.ts`, thiết kế KHÔNG còn khớp schema hiện tại (LOW-MEDIUM — MỚI)

- **Area**: Responsibility (Service layer — validate rule đã lỗi thời)
- **Evidence**: `03_BACKEND_ANALYSIS.md` §6.2 — 2 hàm tự đánh dấu `deprecated` trong comment, viết cho thiết kế `DocumentStatus`/`repairStatus` CŨ (đã bị thay bằng `workflowStatus` xử lý qua `workflow.service.ts`).
- **File**: `services/documents/documents.validator.ts`.
- **Current Behavior**: Tồn tại song song với validate logic MỚI (qua `workflow.service.ts`) mà không rõ ràng cái nào đang thực sự chịu trách nhiệm cho rule gì — chưa xác nhận có consumer nào khác gọi 2 hàm cũ này ở nơi khác (UNKNOWN, `03_BACKEND_ANALYSIS.md` tự ghi nhận).
- **Impact**: Nhầm lẫn trách nhiệm khi đọc code — 1 người review domain Document có thể tưởng rule status transition nằm ở đây, trong khi thực tế đã chuyển hẳn sang `workflow.service.ts`.
- **Confidence**: MEDIUM (chưa xác nhận 100% không còn consumer nào).

---

## 12. Circular Dependencies

**KHÔNG PHÁT HIỆN** — xác nhận lại LẦN THỨ 3 độc lập (Phase 02 §7, REVIEW-00 §3, `21_GLOBAL_ARCHITECTURE_REVIEW.md` Mục 2), không có evidence mới nào từ Phase 03/05 mâu thuẫn với kết luận này. Toàn bộ dependency graph (Documents→{Assets,Notifications,RBAC,Users}; RBAC→Users; Auth→{Users,RBAC}; Dashboard→{Documents,Assets,MedicalDevice,Users,Departments}; Excel→{Departments,ImportAudit}; Cron→{Assets,Notifications}) vẫn là DAG thuần.

---

## 13. Duplicate Logic

| ID | Finding | Nguồn |
|---|---|---|
| ARCH-12 | Business rule CONFIRM_STATUS↔PROPOSE_INK/REPAIR hard-code độc lập ở ≥4 vị trí, 1 vị trí lệch | `21_GLOBAL_ARCHITECTURE_REVIEW.md` (CRITICAL) |
| ARCH-13 | `runPaginatedAggregate` cài đặt 2 lần độc lập + 1 bản viết tay riêng | `21_GLOBAL_ARCHITECTURE_REVIEW.md` |
| ARCH-14 | `permission.descriptors.ts` — duplicate data-definition RBAC, dữ liệu SAI/lệch | `21_GLOBAL_ARCHITECTURE_REVIEW.md` |
| ARCH-26 | 2 rate-limiter độc lập, cùng cấu hình, cùng route | `21_GLOBAL_ARCHITECTURE_REVIEW.md` |

### ARCH-35 — 2 cấu hình Multer riêng biệt không dùng chung 1 factory (LOW — MỚI)

- **Area**: Duplicate Logic (File upload configuration)
- **Evidence**: `03_BACKEND_ANALYSIS.md` §5.2 — `middlewares/upload.middleware.ts` (`uploadExcel`, memory storage, dùng cho import Excel) và `services/upload/upload.middleware.ts` (`createUploader`, disk storage, dùng cho domain Upload chung + calibration certificate) là 2 factory Multer ĐỘC LẬP, không chia sẻ logic chung.
- **Current Behavior**: Không hẳn "duplicate logic" theo nghĩa chặt (mục đích khác nhau: memory vs disk storage) nhưng là 2 nguồn cấu hình Multer riêng biệt, dễ nhầm lẫn khi cần sửa 1 rule chung (vd giới hạn kích thước file toàn hệ thống phải sửa 2 nơi).
- **Impact**: LOW — chấp nhận được ở quy mô hiện tại, ghi nhận cho tham khảo nếu có thêm loại upload thứ 3 trong tương lai (nên cân nhắc 1 factory chung có tham số storage type).
- **Confidence**: HIGH.

---

## 14. Architecture Strengths

(Tổng hợp — không lặp evidence chi tiết, đã có ở `21_GLOBAL_ARCHITECTURE_REVIEW.md` Mục 12 + bổ sung từ Phase 03/05)

1. **Không có circular dependency** ở bất kỳ tầng nào đã kiểm tra (Mục 12).
2. **Controller mỏng nhất quán** trên toàn hệ thống, chỉ 1 ngoại lệ (`upload.controller.ts`).
3. **Error handling tập trung** (`ApiError`+`catchAsync`+`errorHandler`), `getSafeStatus()` phòng thủ đúng chống lỗi hạ tầng khi `err.status` không hợp lệ.
4. **Domain `documents` là mẫu hình tốt về tách trách nhiệm** — nên nhân rộng.
5. **API/OpenAPI đồng bộ CAO BẤT THƯỜNG**: `05_API_ANALYSIS.md` §9 — 87 path / 116 operation khớp TUYỆT ĐỐI giữa `openAPI.yaml` và routes thực tế (0 path documented-nhưng-không-implement, 0 path implement-nhưng-không-documented) — mức đồng bộ tài liệu-code cao hơn hẳn phần còn lại của codebase, kể cả `openAPI.yaml` còn tự ghi cảnh báo bảo mật khớp chính xác với code thật (vd endpoint `/documents/proposal`).
6. **Transaction pattern có tài liệu hoá đầy đủ**, đánh đổi transaction-boundary đều CÓ CHỦ ĐÍCH (ARCH-18/19/20).
7. **Chống enumeration/timing attack nhất quán** ở `login`/`forgotPassword` (Phase 03 §6.1) — thiết kế bảo mật chủ động, không phải tình cờ.
8. **`documents.mapper.ts:buildDocumentFilter`/`escapeRegex`** — mẫu hình chống injection/ReDoS tốt, nên nhân rộng (đã ghi nhận ở Global Security Review).
9. **Asset domain xử lý pagination ĐÚNG** (`parseInt` tường minh) trong khi 3 domain khác sai — bằng chứng cho thấy đội phát triển CÓ NĂNG LỰC làm đúng, vấn đề là tính nhất quán khi áp dụng, không phải giới hạn kỹ thuật.

---

## 15. Architecture Weaknesses

1. **Không có cơ chế authorization/scoping tập trung** (ARCH-06) — root cause từ ABAC dead + `loadDocument` dead (Mục 3.2, 7).
2. **Ranh giới Route↔Service không được type-system ràng buộc** — Service ngầm giả định Middleware đã chạy đúng, không có cách nào phát hiện khi giả định đó sai (ARCH-27, Mục 5.1) — đây là điểm YẾU KIẾN TRÚC MỚI quan trọng nhất phát hiện được ở Phase 15 này.
3. **Data-access layer (`.query.ts`) chỉ có ở 1/nhiều domain** (ARCH-22) — 2 biến thể kiến trúc song song không tài liệu hoá khi nào dùng cái nào.
4. **Kỷ luật dọn dead-code không đồng đều** (ARCH-15) — mở rộng thêm 2 vị trí mới ở Phase 15 (`services/upload/upload.validator.ts:validateFiles`, `documents.validator.ts:validateStatusTransition/validateStatusPermission` — Mục 10, 11).
5. **Không có structured logger** (winston/pino) — toàn bộ dùng `console.*` trực tiếp, tự nhận trong code là "không phải structured logger thực thụ" (`03_BACKEND_ANALYSIS.md` §8) — hạn chế khả năng quan sát (observability) khi scale, chưa từng được ghi nhận trong `02_ARCHITECTURE.md` hay `21_GLOBAL_ARCHITECTURE_REVIEW.md`.
6. **Configuration/`.env.example` không đồng bộ với code thực tế dùng** (ARCH-28, Mục 16) — nhiều biến dùng thật không được tài liệu hoá, và ngược lại.
7. **Ràng buộc tham chiếu chỉ validate 1 chiều "tạo", không có ở chiều "huỷ"** (ARCH-05).
8. **Domain Upload lệch khỏi hầu hết convention chung** (response shape, error handling, cohesion) — Mục 5.3, 10.

---

## 16. Architecture Findings (tổng hợp đầy đủ, phân loại theo severity)

| ID | Area | Problem (tóm tắt) | Severity | Nguồn |
|---|---|---|---|---|
| ARCH-04 | Coupling | Cụm coupling sâu nhất Documents↔Assets↔Notifications↔RBAC, không có abstraction trung gian | **HIGH** | Global Arch Review |
| ARCH-05 | Database Boundary | Phòng thủ tham chiếu bất đối xứng (tạo chặt, huỷ lỏng), lặp ≥3 domain | **HIGH** | Global Arch Review |
| ARCH-06 | Authentication/RBAC | Không có cơ chế authorization/scoping tập trung | **HIGH** | Global Arch Review |
| ARCH-27 | API Boundary | Service ngầm phụ thuộc side-effect Middleware, không type-safe | **HIGH** | **MỚI (Phase 15)** |
| ARCH-01 | Backend/Coupling | Dashboard import thẳng Model domain khác | MEDIUM | Global Arch Review |
| ARCH-07 | Cohesion | `excel.service.ts` 996 dòng, đa domain | MEDIUM | Global Arch Review |
| ARCH-10 | Fat Service | `workflow.service.ts` không tách trách nhiệm như `document.service.ts` | MEDIUM | Global Arch Review |
| ARCH-14 | Duplicate Logic | `permission.descriptors.ts` duplicate + sai dữ liệu | MEDIUM-HIGH | Global Arch Review |
| ARCH-22 | Backend/Consistency | `.query.ts` chỉ tồn tại ở domain `documents` | MEDIUM | Global Arch Review |
| ARCH-24 | API Boundary | `validateQuery` bị comment không đồng đều | MEDIUM | Global Arch Review |
| ARCH-25 | Authentication/RBAC | Permission string literal không ràng buộc kiểu với catalog | MEDIUM | Global Arch Review |
| ARCH-28 | Configuration | `.env.example` không đồng bộ với biến thực dùng | MEDIUM | **MỚI (Phase 15)** |
| ARCH-29 | API Boundary | `validateParams(IdParamDTO)` thiếu nhất quán (RBAC, Departments) | MEDIUM | **MỚI (Phase 15)** |
| ARCH-33 | Cohesion | Domain Upload: cohesion thấp validate/business/middleware | MEDIUM | **MỚI (Phase 15)** |
| ARCH-02 | Backend/Coupling | Excel service đọc thẳng Model Department | LOW-MEDIUM | Global Arch Review |
| ARCH-08 | Cohesion | `workflow.service.ts` bị pha loãng bởi dead code | LOW-MEDIUM | Global Arch Review |
| ARCH-11 | Fat Service | `assetAssignment.service.ts` chỉ 53% code thật | LOW-MEDIUM | Global Arch Review |
| ARCH-15 | Maintainability | Kỷ luật dọn dead-code không đồng đều (mở rộng 2 vị trí mới) | LOW-MEDIUM | Global Arch Review + Mục 10/11 |
| ARCH-23 | API Boundary | Response shape Upload lệch convention | LOW-MEDIUM | Global Arch Review |
| ARCH-30 | Configuration | Không có structured logger | LOW-MEDIUM | **MỚI (Phase 15)** |
| ARCH-34 | Responsibility | 2 hàm validate cũ lỗi thời còn tồn tại song song logic mới | LOW-MEDIUM | **MỚI (Phase 15)** |
| ARCH-03 | Layer Violation | Middleware ghi thẳng Model domain Users | LOW/INFO | Global Arch Review |
| ARCH-09 | Fat Controller | `upload.controller.ts` lệch error-handling convention | LOW | Global Arch Review |
| ARCH-13 | Duplicate Logic | `runPaginatedAggregate` 2 bản + 1 viết tay | LOW-MEDIUM | Global Arch Review |
| ARCH-17 | Shared Leakage | `req.user.permissions` type không phản ánh đúng vòng đời | LOW | Global Arch Review |
| ARCH-26 | Duplicate Logic | 2 rate-limiter cùng cấu hình | LOW | Global Arch Review |
| ARCH-31 | API Boundary | Tên field pagination lệch giữa domain (`totalPages`/`totalPage`) | LOW | **MỚI (Phase 15)** |
| ARCH-35 | Duplicate Logic | 2 cấu hình Multer không dùng chung factory | LOW | **MỚI (Phase 15)** |
| ARCH-16 | Shared | Cache in-memory nhân đôi (2 implementation độc lập) | INFO/LOW | Global Arch Review |
| ARCH-32 | Module Dependency | `GET /assets/:id/documents` dùng permission cross-domain (chủ đích) | INFO | **MỚI (Phase 15)** |
| ARCH-19 | Transaction Boundary | Counter atomic ngoài transaction (đánh đổi chủ đích, ĐÚNG) | INFO (đối trọng) | Global Arch Review |

**ARCH-28 chi tiết (Configuration, MỚI)**:
- **Evidence**: `03_BACKEND_ANALYSIS.md` §7.1 — `MONGO_MAX_POOL_SIZE`/`MONGO_MIN_POOL_SIZE` dùng thật trong `database.ts` (default 20/2) nhưng KHÔNG xuất hiện trong `.env.example`; `CLIENT_URL` khai báo TRÙNG LẶP 2 lần trong `.env.example` (2 nhóm khác nhau, cùng 1 biến); `JWT_EXPIRES_IN` comment-out và KHÔNG dùng ở bất kỳ đâu trong `src/` (biến chết, đúng như đã comment — không phải discrepancy thật); `MONGO_DEBUG`/`MONGO_SLOW_MS` được tài liệu hoá đầy đủ nhưng tính năng đọc chúng (`mongo.logger.ts:registerMongoLogger()`) là dead code — người vận hành đọc `.env.example` sẽ tưởng nhầm 2 biến này đang hoạt động.
- **File**: `backend/.env.example`, `backend/src/config/database/database.ts`, `backend/src/config/database/mongo.logger.ts`.
- **Impact**: MEDIUM — không ảnh hưởng runtime trực tiếp, nhưng `.env.example` (tài liệu vận hành quan trọng nhất cho người deploy mới) không phản ánh đúng 100% hiện trạng — rủi ro cấu hình sai khi triển khai môi trường mới.
- **Confidence**: HIGH.

**ARCH-30 chi tiết (Configuration/Observability, MỚI)**:
- **Evidence**: `03_BACKEND_ANALYSIS.md` §8 — toàn bộ log qua `console.log/warn/error` trực tiếp; `error.middleware.ts` tự thừa nhận trong comment "đây KHÔNG phải structured logger thực thụ... vẫn dùng console.error, chỉ đổi FORMAT"; không có log rotation, log aggregation (ELK/Loki), external logging service (Datadog/Sentry).
- **File**: toàn bộ hệ thống (`error.middleware.ts`, `database.events.ts`, và các nơi khác dùng `console.*`).
- **Impact**: LOW-MEDIUM — chấp nhận được ở quy mô hiện tại (1 instance, chưa production-scale xác nhận), nhưng là hạn chế kiến trúc quan trọng khi cần debug production/scale ngang nhiều instance — không có cách nào tổng hợp log xuyên nhiều container/pod.
- **Confidence**: HIGH.

---

## 17. Recommended Improvements

> Chỉ liệt kê Ở MỨC KHUYẾN NGHỊ — KHÔNG chuyển thành implementation plan/code trong tài liệu này (đúng yêu cầu "Không biến recommendation thành implementation").

1. Ràng buộc kiểu cho tham số `authorizePermission(...)` bằng union type từ `keyof typeof PERMISSIONS` thay vì `string` tự do (ARCH-25) — ngăn drift permission string ngay ở compile-time.
2. Xem xét 1 middleware/decorator chung đảm bảo Route luôn chạy `validateQuery` khi Service có tham số phân trang — hoặc đổi Service sang tự parse an toàn (không phụ thuộc Middleware đã chạy) để cắt đứt coupling ngầm (ARCH-27).
3. Quyết định rõ ràng: có nên hoàn thiện ABAC (`loadDocument` + `enablePolicies`) làm cơ chế scoping tập trung, hay thay bằng 1 middleware department-scoping đơn giản hơn — hiện đang ở trạng thái "vừa không dùng vừa không gỡ" (ARCH-06).
4. Chuẩn hoá lại `.env.example` khớp 100% biến thực dùng (ARCH-28) — việc làm nhỏ, rủi ro thấp, lợi ích vận hành cao.
5. Cân nhắc structured logger (pino/winston) nếu có kế hoạch scale ngang hoặc cần observability tốt hơn (ARCH-30) — không cấp thiết ở quy mô hiện tại.
6. Áp dụng lại pattern tách `.validator/.mapper/.query.ts` của domain `documents` cho `workflow.service.ts` (coupling sâu nhất hệ thống) khi có dịp refactor có kiểm soát (ARCH-10, liên hệ ARCH-04).
7. Dọn dead-code đã xác nhận qua nhiều phase (ARCH-15 + bổ sung Phase 15: `validateFiles`, `validateStatusTransition/validateStatusPermission`) — rủi ro thấp, có Git history lưu bản cũ.
8. Đồng bộ tên field response (`totalPages` vs `totalPage`) nếu có kế hoạch xây dựng API client/SDK dùng chung (ARCH-31).

---

## 18. Risks

| Risk | Liên hệ Finding | Mức độ (nếu không xử lý) |
|---|---|---|
| Thiếu scoping tập trung → rò rỉ dữ liệu liên phòng ban khi RBAC được cấu hình rộng hơn dự kiến | ARCH-06 | HIGH (đã có evidence cụ thể ở Global Security Review — RV05-04/RV06-04/RV07-01) |
| Service/Middleware boundary không type-safe → bug tương tự pagination có thể tái diễn ở tính năng mới bất kỳ lúc nào (không có cơ chế ngăn) | ARCH-27 | MEDIUM-HIGH (đã XẢY RA THẬT ở 3 domain, không phải rủi ro lý thuyết) |
| Cụm coupling sâu Documents↔Assets↔Notifications↔RBAC không có ranh giới rõ → thay đổi 1 domain dễ gây lỗi domain khác âm thầm (đã XẢY RA — RV05-01 CRITICAL) | ARCH-04 | HIGH |
| Không structured logger → khó chẩn đoán sự cố production, đặc biệt nếu scale ngang | ARCH-30 | MEDIUM (tăng dần theo quy mô vận hành) |
| `.env.example` sai lệch → cấu hình sai khi deploy môi trường mới (đặc biệt `MONGO_MAX_POOL_SIZE`/`MIN_POOL_SIZE` bị thiếu tài liệu) | ARCH-28 | LOW-MEDIUM |
| Kỷ luật dọn dead-code không đồng đều → chi phí review/onboarding tăng dần theo thời gian, rủi ro sửa nhầm code chết tưởng đang chạy | ARCH-15 | LOW (tích luỹ dài hạn) |

---

**PHASE 15 COMPLETED — không thực hiện Phase 16.**
