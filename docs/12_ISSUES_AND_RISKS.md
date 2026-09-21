# 12 — ISSUES & RISKS ANALYSIS (RISK REGISTER)

> Phase: 12 — Issues & Risks Analysis
> Phạm vi: TỔNG HỢP risk register từ toàn bộ evidence đã CONFIRMED/INFERRED ở Phase 01–11. KHÔNG tìm lỗi mới, KHÔNG phân tích sâu thêm, KHÔNG suy đoán ngoài evidence đã có, KHÔNG sửa source code.
> Nguồn: `00_PROJECT_MEMORY.md`, `02_ARCHITECTURE.md`, `03_BACKEND_ANALYSIS.md`, `04_DATABASE_ANALYSIS.md`, `05_API_ANALYSIS.md`, `06_FRONTEND_ANALYSIS.md` (N/A), `07_AUTH_RBAC_ANALYSIS.md`, `08_BUSINESS_LOGIC.md`, `09_SECURITY_ANALYSIS.md`, `10_PERFORMANCE_ANALYSIS.md`, `11_TECHNICAL_DEBT.md` — tất cả tại commit `f4ce8e9083e16c01177f53a3871b66cfde4133b8`.
> Quy ước: **CONFIRMED** = evidence trực tiếp trong source. **INFERRED** = suy luận hợp lý, chưa test runtime/chưa có dữ liệu vận hành thật. **UNKNOWN** = chưa đủ evidence để kết luận.

---

## 1. ISSUE CATEGORIES

| Category | Số issue (Critical/High) | Tổng issue |
|---|---|---|
| Architecture | 1 | 6 |
| Backend | 0 | 5 |
| Database | 2 | 9 |
| API | 2 | 7 |
| Frontend | N/A (không có frontend) | 0 |
| Authentication | 0 | 4 |
| Authorization | 2 | 3 |
| Business Logic | 0 | 2 |
| Security (chung — injection/file upload/secrets/API security/data) | 1 | 9 |
| Performance | 1 | 4 |
| Deployment | 1 | 5 |
| Maintainability | 1 | 4 |

*(Một issue có thể được tham chiếu chéo giữa Security và category kỹ thuật gốc — vd SEC-05 xuất hiện ở cả Security lẫn Authorization; đếm ở bảng trên theo category chính được gán.)*

---

## 2. SEVERITY DEFINITION (áp dụng theo SKILL.md/yêu cầu Phase 12)

| Severity | Định nghĩa |
|---|---|
| CRITICAL | Có thể gây mất dữ liệu, compromise hệ thống, hoặc ngừng hoạt động nghiêm trọng |
| HIGH | Ảnh hưởng lớn đến security, business hoặc reliability |
| MEDIUM | Có thể gây lỗi hoặc khó maintain |
| LOW | Cải thiện chất lượng |
| INFO | Observation (bao gồm cả điểm tích cực) |

---

## 3. ISSUE REGISTER — CHI TIẾT (CRITICAL & HIGH)

Các issue MEDIUM/LOW/INFO được liệt kê dạng bảng tổng hợp ở §7 (không lặp lại format đầy đủ để tối ưu context — chi tiết gốc luôn có tại tài liệu phase tương ứng).

---

### ISS-01 — Privilege escalation lên ADMIN qua `PUT /api/users/:id` — ✅ RESOLVED (2026-08-30, xem `docs/tasks/TASK-001.md`)
- **Category**: Authorization
- **Severity**: CRITICAL (trước fix)
- **Evidence (TRƯỚC FIX)**: Hàm `update()` (được endpoint đang chạy thật gọi) cho phép đổi `user.role` sang bất kỳ `roleId` nào, kể cả role `ADMIN`, không có safeguard chặn và không gọi `clearPermissionCache()`. Hàm `assignRole()` cùng file CÓ đủ 2 safeguard này nhưng là dead code, không gắn route nào.
- **Source file**: `backend/src/services/users/users.service.ts`
- **Function/Class**: `update()` (đã fix) vs `assignRole()` (vẫn dead code, không nằm trong phạm vi fix này — xem TASK-001 "Ghi chú ngoài phạm vi")
- **Current behavior (TRƯỚC FIX)**: Bất kỳ user nào giữ permission `USER_UPDATE` có thể gọi `PUT /api/users/:id` để tự đổi (hoặc đổi cho user khác) `role` thành `ADMIN`.
- **Expected behavior**: Đổi role sang `ADMIN` (hoặc bất kỳ role đặc quyền cao) qua endpoint cập nhật thông thường phải bị chặn hoặc yêu cầu quyền/luồng riêng biệt cao hơn, tương tự safeguard đã viết sẵn trong `assignRole()`.
- **Impact (TRƯỚC FIX)**: Chiếm quyền ADMIN toàn hệ thống → bypass hoàn toàn mọi `authorizePermission` khác (do ADMIN bypass string-match `role.name === "ADMIN"`).
- **Risk (TRƯỚC FIX)**: Đây là con đường leo thang đặc quyền nghiêm trọng nhất toàn dự án — 1 lỗ hổng duy nhất vô hiệu hoá toàn bộ mô hình RBAC.
- **Fix đã áp dụng (2026-08-30)**: `update()` chặn tuyệt đối `role.name === "ADMIN"` (throw `ApiError.badRequest`, không có ngoại lệ kể cả người gọi là ADMIN), kèm gọi `clearPermissionCache()` khi role thực sự đổi (đóng luôn SEC-08). Chi tiết implementation: `docs/tasks/TASK-001.md`. **Chưa xử lý**: wire `assignRole()` thành route riêng (long-term recommendation, để task khác); `create()` vẫn cho phép tạo user mới với role ADMIN trực tiếp (ghi nhận, ngoài phạm vi ISS-01).
- **Test đã chạy**: KHÔNG có automated test (dự án không có Jest/ts-jest cài đặt — xem `docs/00_PROJECT_MEMORY.md`); người dùng chủ động chọn không thiết lập testing cho task này. Đã chạy `npx tsc --noEmit` (PASS, không lỗi type). **CHƯA chạy test runtime/manual qua HTTP thật** — hành vi sau fix chưa được xác minh bằng request thực tế.
- **Confidence**: CONFIRMED (code, cả trước và sau fix — đọc trực tiếp diff). Mức độ khai thác thực tế trong quá khứ (đã từng bị lợi dụng hay chưa) vẫn **UNKNOWN**.

---

### ISS-02 — Hard-delete Document theo tháng không kiểm tra tham chiếu ngược
- **Category**: Database
- **Severity**: CRITICAL
- **Evidence**: `deleteDocumentsByMonthService` thực hiện `deleteMany` thật trên `Document`, không kiểm tra `WorkflowInstance` đang tham chiếu, `Document.referenceTo[]` của document khác, hay `Notification.resourceId` trỏ tới document sắp xoá.
- **Source file**: `backend/src/services/documents/*.service.ts` (hàm `deleteDocumentsByMonthService`, theo Phase 04 §12.1)
- **Function/Class**: `deleteDocumentsByMonthService`
- **Current behavior**: Xoá vĩnh viễn Document theo khoảng tháng mà không rà soát bất kỳ bảng nào còn tham chiếu tới `_id` sắp xoá.
- **Expected behavior**: Trước khi hard-delete, kiểm tra và chặn/cảnh báo nếu còn `WorkflowInstance`, document khác qua `referenceTo`, hoặc `Notification` đang tham chiếu; hoặc chuyển sang soft-delete.
- **Impact**: Dữ liệu mồ côi vĩnh viễn, không thể phục hồi (không phải soft-delete) — sai lệch âm thầm, khó phát hiện cho tới khi có truy vấn join/populate thất bại ở nơi khác.
- **Risk**: Mất dữ liệu không thể đảo ngược, khó phát hiện sớm vì không có lỗi tức thời khi xoá.
- **Recommendation**: Thêm guard đếm tham chiếu ngược trước `deleteMany`, hoặc chuyển hẳn sang soft-delete (đã có field `isActive`/`deletedAt` trong model).
- **Confidence**: CONFIRMED (code — không có bước kiểm tra reference nào trước lệnh xoá thật).

---

### ISS-03 — Toàn bộ tầng ABAC (Policy) chết hoàn toàn ở runtime
- **Category**: Architecture / Security
- **Severity**: HIGH
- **Evidence**: 103/103 lệnh gọi `authorizePermission()` trong toàn bộ routes không truyền `options.enablePolicies`/`resource`/`action` → nhánh đánh giá ABAC (bước 5 trong middleware) không bao giờ thực thi. `loadDocument.middleware.ts` (middleware duy nhất gán `req.resource`) không gắn vào route nào.
- **Source file**: `backend/src/middlewares/authorizePermission.middleware.ts`, toàn bộ `backend/src/routes/**/*.ts`, `backend/src/middlewares/loadDocument.middleware.ts`
- **Function/Class**: `authorizePermission()` middleware factory
- **Current behavior**: Hệ thống chỉ có RBAC coarse-grained (permission-level) hoạt động thật; toàn bộ Policy model, evaluator 319 dòng, CRUD API Policy được xây dựng đầy đủ nhưng không bao giờ được đánh giá.
- **Expected behavior**: Nếu ABAC là 1 phần thiết kế bảo vệ (resource-level authorization, IDOR protection, department-scoping tập trung), các route cần bảo vệ ở mức này phải truyền đủ tham số kích hoạt.
- **Impact**: Mất hẳn 1 tầng phòng thủ được quảng cáo trong thiết kế; kiểm soát phạm vi dữ liệu (department-scoping/ownership) hiện chỉ tồn tại rải rác, thủ công ở một số service cụ thể — không đảm bảo bao phủ toàn diện (rà soát đầy đủ vẫn UNKNOWN, Phase 07 §9.7).
- **Risk**: Rủi ro IDOR/truy cập chéo phạm vi dữ liệu tiềm ẩn ở các endpoint chưa được rà soát thủ công.
- **Recommendation**: (a) Hoàn thiện kích hoạt ABAC ở route cần resource-level check, hoặc (b) gỡ bỏ có chủ đích để giảm bề mặt tấn công/nhiễu bảo trì, kèm rà soát thủ công toàn diện department-scoping.
- **Confidence**: CONFIRMED — phát hiện dead-code lớn nhất toàn dự án.

---

### ISS-04 — Rủi ro NoSQL operator injection qua gán trực tiếp filter
- **Category**: Security (Injection)
- **Severity**: HIGH
- **Evidence**: `rbac.service.ts:getPermissionService/getPolicieService` (`filter.resource = resource`), `department.service.ts:getAllDepartmentsService`, `userAudits.service.ts:buildAuditFilter` (`filter.performedBy = performedBy`) đều gán thẳng giá trị query string vào Mongo filter không ép kiểu string. Không có middleware sanitize (`express-mongo-sanitize` hoặc tương đương) trong toàn bộ dependencies. Các route GET tương ứng đều nằm trong nhóm có `validateQuery` bị comment out.
- **Source file**: `backend/src/services/rbac/rbac.service.ts`, `backend/src/services/departments/*.ts`, `backend/src/services/users/userAudits.service.ts`
- **Function/Class**: `getPermissionService`, `getPolicieService`, `getAllDepartmentsService`, `buildAuditFilter`
- **Current behavior**: Express/`qs` hỗ trợ cú pháp bracket (`?performedBy[$ne]=null`) tự dựng thành object `{ $ne: null }`; object này được gán thẳng vào filter và truyền vào `.find()` như 1 MongoDB operator hợp lệ.
- **Expected behavior**: Field dùng làm filter phải được ép kiểu `string` tường minh (Zod `.string()` hoặc kiểm tra `typeof`) trước khi gán vào query object, theo mẫu hình `documents.mapper.ts:buildDocumentFilter` (whitelist field) đã áp dụng đúng ở domain Documents.
- **Impact**: Attacker có thể thay đổi ngữ nghĩa truy vấn (bypass filter dự kiến, dò thông tin qua kết quả trả về).
- **Risk**: Injection tầng dữ liệu ở 3 domain (RBAC, Departments, UserAudit) — mức độ khai thác thực tế **INFERRED**, chưa test runtime (đúng nguyên tắc không exploit).
- **Recommendation**: Khôi phục `validateQuery` với Zod ép `.string()` nghiêm ngặt; thêm kiểm tra `typeof === "string"` ở tầng Service (defense in depth); cân nhắc middleware sanitize tổng quát tương thích Express 5.
- **Confidence**: CONFIRMED (code pattern), INFERRED (mức độ khai thác thực tế).

---

### ISS-05 — `WorkflowInstance` không index, full collection scan ở endpoint tần suất cao
- **Category**: Database / Performance
- **Severity**: HIGH
- **Evidence**: Model `WorkflowInstance` không có index nào ngoài `_id`. Query lấy danh sách chờ duyệt (`getPendingApprovalsForRole`) dùng `$expr + $arrayElemAt` để so khớp bước hiện tại — MongoDB không thể dùng index cho pattern này → COLLSCAN mỗi lần gọi.
- **Source file**: `backend/src/services/workflows/*.service.ts` (hàm `getPendingApprovalsForRole`), `backend/src/models/workflows/workflowInstance.model.ts`
- **Function/Class**: `getPendingApprovalsForRole`
- **Current behavior**: Mỗi lần người duyệt mở hộp thư chờ duyệt (`GET /workflows/pending`), MongoDB phải quét toàn bộ collection `WorkflowInstance`.
- **Expected behavior**: Có index hỗ trợ truy vấn theo trạng thái/bước hiện tại (vd `{status:1}` + cân nhắc denormalize `currentStepRole` để tránh phụ thuộc `$expr`).
- **Impact**: Độ trễ tăng dần theo số lượng workflow tích luỹ theo thời gian — đây là endpoint nghiệp vụ lõi (duyệt tài liệu), dùng liên tục.
- **Risk**: Suy giảm hiệu năng có thể trở thành nghiêm trọng khi dữ liệu tăng, không có cơ chế cảnh báo sớm (không có APM/threshold alerting xác nhận trong repo).
- **Recommendation**: Thêm index `{status:1}` tối thiểu; đánh giá lại việc denormalize field hỗ trợ lọc trực tiếp thay vì `$expr + $arrayElemAt`.
- **Confidence**: CONFIRMED FROM CODE (cấu trúc query + thiếu index); mức độ nghiêm trọng thực tế phụ thuộc số lượng bản ghi thật — **NEEDS BENCHMARK**.

---

### ISS-06 — Excel import Document: N+1 transaction (tối đa 5000 transaction/file)
- **Category**: Performance
- **Severity**: HIGH
- **Evidence**: `importDocumentsExcel` mở 1 MongoDB transaction (`withTransaction`) riêng cho MỖI dòng dữ liệu trong file Excel, không gom nhóm/batch; giới hạn `MAX_IMPORT_ROWS = 5000` → tối đa 5000 transaction độc lập cho 1 lần import.
- **Source file**: `backend/src/services/excel/excel.service.ts`
- **Function/Class**: `importDocumentsExcel`
- **Current behavior**: Mỗi dòng Excel = 1 vòng đời transaction riêng biệt (begin → operation → commit/rollback).
- **Expected behavior**: Gom nhiều dòng vào 1 transaction (batch theo lô hợp lý, vd 100–500 dòng/transaction) để giảm overhead round-trip và tải lên MongoDB.
- **Impact**: File lớn (gần ngưỡng 5000 dòng) tạo áp lực rất lớn lên MongoDB (overhead transaction, connection pool, session limit) — import chậm, tốn tài nguyên, rủi ro timeout/thất bại một phần.
- **Risk**: Đây là finding hiệu năng nghiêm trọng nhất toàn dự án (theo Phase 10) — tác động trực tiếp tới tính khả dụng của MongoDB khi có import đồng thời.
- **Recommendation**: Refactor sang batch transaction theo nhóm dòng thay vì per-row; cân nhắc dùng `bulkWrite`/`insertMany` kết hợp transaction ở cấp batch.
- **Confidence**: CONFIRMED FROM CODE. Mức độ ảnh hưởng thực tế theo tần suất/kích thước file import trong vận hành thật — **NEEDS BENCHMARK**.

---

### ISS-07 — Zero test coverage trên toàn bộ 116 endpoint dù đã cấu hình Jest đầy đủ
- **Category**: Maintainability
- **Severity**: HIGH
- **Evidence**: `jest.config.js` + `ts-jest` cấu hình đầy đủ trong `package.json`, nhưng không có bất kỳ file `*.test.ts`/thư mục `__tests__` nào trong toàn bộ repo. Không có script `test` trong `package.json` (chỉ `dev`, `build`, `start`).
- **Source file**: `backend/package.json`, `backend/jest.config.js` (cấu hình), toàn repo (không có file test)
- **Function/Class**: N/A (thiếu, không phải lỗi 1 hàm cụ thể)
- **Current behavior**: Mọi business rule phức tạp (status machine Document/Workflow/Asset, công thức hiệu lực RBAC, các guard hard-delete) không có bất kỳ test tự động nào xác nhận hành vi.
- **Expected behavior**: Tối thiểu có test cho các luồng CRITICAL (authentication, RBAC formula, workflow transition, hard-delete guard).
- **Impact**: Không có lưới an toàn hồi quy cho bất kỳ thay đổi code nào trong tương lai — rủi ro tái phát các lỗi đã tìm thấy (vd pagination, thiếu safeguard escalation) mà không ai biết cho tới khi xảy ra ở production.
- **Risk**: Rủi ro dài hạn tích luỹ, tăng theo thời gian và theo số người tham gia phát triển — không giới hạn ở 1 module cụ thể.
- **Recommendation**: Thêm script `test`; viết test ưu tiên cho các luồng CRITICAL/HIGH đã ghi nhận trong Security/Business Logic Analysis trước, sau đó mở rộng dần.
- **Confidence**: CONFIRMED (zero file test, có evidence trực tiếp trong cấu trúc thư mục).

---

### ISS-08 — `GET /api/documents` luôn trả trang 1/10 bất kể `page`/`limit`
- **Category**: API
- **Severity**: HIGH
- **Evidence**: `validateQuery` bị comment out ở route Documents → query string (`page`, `limit`) không được Zod coerce từ string sang number; tầng Service giả định các giá trị này đã là number → so sánh/tính toán sai, luôn fallback về mặc định (trang 1, 10 bản ghi).
- **Source file**: `backend/src/routes/documents/document.route.ts` (route), tầng service Documents tương ứng (theo Phase 05 §4.4)
- **Function/Class**: middleware `validateQuery` (bị comment) trên route `GET /documents`
- **Current behavior**: Client truyền `?page=2&limit=20` nhưng API luôn trả 10 bản ghi đầu tiên (trang 1) không đổi.
- **Expected behavior**: Phân trang phải phản ánh đúng tham số `page`/`limit` client gửi, như thiết kế DTO `QueryDocumentDTO` đã định nghĩa.
- **Impact**: Tính năng phân trang — vốn cần thiết cho danh sách Document (thực thể trung tâm của hệ thống) — hỏng hoàn toàn với bất kỳ dataset nào lớn hơn 10 bản ghi.
- **Risk**: Ảnh hưởng trực tiếp tới trải nghiệm sử dụng thực tế của module lõi nhất trong hệ thống; đây là bug đang hoạt động (không phải rủi ro tiềm ẩn).
- **Recommendation**: Khôi phục `validateQuery(QueryDocumentDTO)` ở route.
- **Confidence**: CONFIRMED (kế thừa Phase 05 §4.4, đã trace root cause chính xác).

---

### ISS-09 — `POST /api/documents/proposal` thiếu authorization check
- **Category**: Authorization
- **Severity**: HIGH
- **Evidence**: Route chỉ có middleware `authenticate`; dòng `authorizePermission("DOCUMENT_CREATE")` bị comment out.
- **Source file**: `backend/src/routes/documents/document.route.ts`
- **Function/Class**: route `POST /proposal`
- **Current behavior**: Bất kỳ user đã đăng nhập (`authenticate` pass) đều tạo được Document proposal, không kiểm tra permission `DOCUMENT_CREATE`.
- **Expected behavior**: Chỉ user có permission `DOCUMENT_CREATE` (theo thiết kế RBAC của hệ thống) mới được tạo Document proposal.
- **Impact**: Vi phạm nguyên tắc least-privilege — bất kỳ role nào (kể cả role không được thiết kế để tạo tài liệu) đều có thể tạo Document.
- **Risk**: Broken Access Control ở 1 endpoint nghiệp vụ lõi; dễ khai thác (chỉ cần đăng nhập, không cần điều kiện đặc biệt).
- **Recommendation**: Bỏ comment, kích hoạt lại `authorizePermission("DOCUMENT_CREATE")` — sửa 1 dòng.
- **Confidence**: CONFIRMED.

---

### ISS-10 — Yêu cầu MongoDB replica set (bắt buộc cho transaction) chưa được xác minh ở production
- **Category**: Deployment
- **Severity**: HIGH (tiềm năng — POTENTIAL RISK)
- **Evidence**: 5 file trong service layer dùng `withTransaction` (bao gồm workflow approval, Excel import Document — ISS-06, và các luồng khác đã ghi nhận xuyên suốt Phase 02/04/08). `withTransaction` của MongoDB **bắt buộc** phải chạy trên replica set (hoặc sharded cluster) — không hoạt động trên standalone MongoDB instance.
- **Source file**: Không có 1 file cấu hình hạ tầng nào trong repo xác nhận replica set (repo không có Dockerfile/docker-compose mô tả topology MongoDB — carry-over ISS Deployment khác); cross-reference `backend/src/config/database/*.ts` (kết nối), các service dùng `withTransaction` (Phase 02 §10, Phase 04 §14 #10, Phase 08 §9 #5).
- **Function/Class**: N/A (thuộc về hạ tầng triển khai, ngoài phạm vi source code thuần)
- **Current behavior**: Code giả định môi trường chạy có replica set; không có kiểm tra/fallback nào nếu kết nối tới standalone instance.
- **Expected behavior**: Môi trường production phải là replica set (dù chỉ 1 node) để `withTransaction` hoạt động; nếu không, mọi luồng dùng transaction sẽ throw lỗi runtime.
- **Impact**: Nếu giả định sai (production chạy standalone MongoDB), TOÀN BỘ 5 luồng dùng transaction — bao gồm workflow approval và Excel import — sẽ lỗi ngay khi được gọi, không phải lỗi âm thầm mà là crash chức năng.
- **Risk**: Đây là 1 giả định hạ tầng chưa xác minh nhưng có khả năng làm sập nhiều chức năng lõi cùng lúc nếu sai — mức độ Probability **UNKNOWN** (ngoài phạm vi source-code-only), nhưng Impact nếu xảy ra là CRITICAL/HIGH.
- **Recommendation**: Xác minh cấu hình MongoDB production là replica set trước khi go-live hoặc ngay lập tức nếu đã live; nếu không thể đảm bảo replica set, cần refactor các luồng dùng transaction sang cơ chế khác (compensating actions/saga) hoặc chấp nhận rủi ro có ghi nhận.
- **Confidence**: CONFIRMED (code phụ thuộc `withTransaction`), UNKNOWN (thực trạng hạ tầng triển khai thật — carry-over xuyên suốt từ Phase 02).

---

## 4. RISK MATRIX (Probability × Impact)

> Probability được đánh giá dựa trên evidence về điều kiện kích hoạt (có cần điều kiện đặc biệt hay không, đã đang hoạt động hay tiềm ẩn). Khi Probability không đủ evidence để xác định, ghi rõ **UNKNOWN** thay vì suy đoán.

| ID | Issue | Impact | Probability | Risk Classification |
|---|---|---|---|---|
| ISS-01 | Privilege escalation ADMIN | CRITICAL | ~~MEDIUM~~ → **RESOLVED 2026-08-30** (xem TASK-001) | ~~Critical Risk~~ → **Resolved** |
| ISS-02 | Hard-delete Document không check ref | CRITICAL | MEDIUM (tính năng đã tồn tại, có thể được dùng cho dọn dẹp định kỳ) | **Critical Risk** |
| ISS-03 | ABAC dead runtime | HIGH | HIGH (đã đúng 100% thời gian, là trạng thái cấu trúc cố định) | **Critical Risk** |
| ISS-09 | Proposal thiếu authorization | HIGH | HIGH (bất kỳ user đăng nhập nào cũng trigger được ngay) | **Critical Risk** |
| ISS-07 | Zero test coverage | HIGH (dài hạn) | HIGH (đã đúng 100% thời gian) | **Critical Risk** (dài hạn, tích luỹ) |
| ISS-04 | NoSQL operator injection | HIGH | MEDIUM (cần attacker biết cú pháp bracket query) | **High Risk** |
| ISS-06 | Excel import N+1 transaction | HIGH | MEDIUM (phụ thuộc tần suất/kích thước file import thật) | **High Risk** |
| ISS-08 | Pagination Documents hỏng | MEDIUM | HIGH (bug đang hoạt động, luôn trigger) | **High Risk** |
| ISS-05 | WorkflowInstance COLLSCAN | MEDIUM | HIGH (chắc chắn xảy ra, tăng dần theo dữ liệu) | **High Risk** |
| ISS-10 | Replica set chưa xác minh | CRITICAL (nếu sai) | UNKNOWN | **Không phân loại được — cần xác minh hạ tầng trước khi đánh giá risk chính thức** |

**Chú thích phân loại**: Critical Risk = Impact CRITICAL/HIGH kết hợp Probability HIGH, hoặc Impact CRITICAL kết hợp Probability MEDIUM trở lên. High Risk = Impact HIGH kết hợp Probability MEDIUM, hoặc Impact MEDIUM kết hợp Probability HIGH (chắc chắn xảy ra dù hậu quả từng lần không thảm khốc). ISS-10 không được ép vào 1 ô ma trận vì Probability thực sự UNKNOWN theo evidence hiện có — xếp riêng như 1 rủi ro "chưa xác định được mức độ" chờ xác minh hạ tầng, theo đúng nguyên tắc không suy đoán ngoài evidence.

---

## 5. TOP 10 RISKS

> Lựa chọn dựa trên tổ hợp Impact + Probability (§4), không dựa trên cảm tính. Mỗi risk đã có evidence trực tiếp ở §3.

| # | ID | Risk | Risk Class |
|---|---|---|---|
| 1 | ISS-01 | Privilege escalation lên ADMIN qua `PUT /api/users/:id` | Critical Risk |
| 2 | ISS-02 | Hard-delete Document theo tháng không check tham chiếu ngược | Critical Risk |
| 3 | ISS-09 | `POST /api/documents/proposal` thiếu authorization | Critical Risk |
| 4 | ISS-03 | Tầng ABAC/Policy chết hoàn toàn ở runtime | Critical Risk |
| 5 | ISS-07 | Zero test coverage trên 116 endpoint | Critical Risk (dài hạn) |
| 6 | ISS-04 | NoSQL operator injection (RBAC/Departments/UserAudit) | High Risk |
| 7 | ISS-06 | Excel import Document — N+1 transaction (tối đa 5000/file) | High Risk |
| 8 | ISS-08 | `GET /api/documents` pagination hỏng hoàn toàn | High Risk |
| 9 | ISS-05 | `WorkflowInstance` COLLSCAN ở endpoint duyệt tần suất cao | High Risk |
| 10 | ISS-10 | Giả định MongoDB replica set cho transaction chưa xác minh | Unclassified (Impact CRITICAL nếu sai, Probability UNKNOWN) |

---

## 6. RECOMMENDATIONS (Immediate / Short-term / Long-term)

### #1 — ISS-01: Privilege escalation ADMIN
- **Immediate action**: Rà soát DB thật xem role nào đang có `USER_UPDATE`; nếu có role không nên có quyền này, thu hồi tạm thời trong lúc chờ fix.
- **Short-term action**: Áp safeguard của `assignRole()` vào `update()`; gọi `clearPermissionCache()` khi role đổi.
- **Long-term action**: Tách endpoint "gán role" thành 1 luồng riêng, yêu cầu permission cao hơn (`ROLE_ASSIGN` riêng biệt), có audit log riêng cho hành động đổi role.

### #2 — ISS-02: Hard-delete Document không check reference
- **Immediate action**: Ngừng/hạn chế sử dụng tính năng "xoá theo tháng" cho tới khi có guard; nếu bắt buộc dùng, backup dữ liệu liên quan trước khi chạy.
- **Short-term action**: Thêm guard đếm `WorkflowInstance`/`referenceTo`/`Notification` tham chiếu trước `deleteMany`, chặn hoặc cảnh báo nếu còn tham chiếu.
- **Long-term action**: Đánh giá chuyển hẳn sang soft-delete cho toàn bộ domain Document, đồng bộ với các domain khác đã dùng `isActive`/`deletedAt`.

### #3 — ISS-09: `documents/proposal` thiếu authorization
- **Immediate action**: Bỏ comment `authorizePermission("DOCUMENT_CREATE")` — có thể triển khai ngay, rủi ro thay đổi rất thấp (1 dòng).
- **Short-term action**: Rà soát toàn bộ 116 route 1 lần nữa để tìm các dòng `authorizePermission` bị comment tương tự (grep pattern `// .*authorizePermission`).
- **Long-term action**: Thêm CI check/lint rule cảnh báo khi route thiếu middleware authorization so với danh sách route yêu cầu.

### #4 — ISS-03: ABAC dead runtime
- **Immediate action**: Quyết định rõ ràng: giữ và hoàn thiện ABAC, hay loại bỏ có chủ đích — hiện đang ở trạng thái lấp lửng (tồn tại nhưng vô dụng) gây hiểu lầm mức độ bảo mật thật.
- **Short-term action**: Nếu giữ — gắn `options.enablePolicies`/`resource`/`action` + `loadDocument` (hoặc middleware tương đương) vào các route thực sự cần resource-level check (ưu tiên Document, Asset — dữ liệu nhạy cảm/department-scoped).
- **Long-term action**: Rà soát thủ công toàn diện department-scoping/ownership ở mọi endpoint `:id` (hiện vẫn UNKNOWN, Phase 07 §9.7) để xác nhận không có lỗ hổng IDOR đang tồn tại dù ABAC chưa kích hoạt.

### #5 — ISS-07: Zero test coverage
- **Immediate action**: Thêm script `test` vào `package.json`.
- **Short-term action**: Viết test cho các luồng CRITICAL/HIGH đã ghi nhận trong risk register này trước (login/RBAC formula, workflow transition, hard-delete guard sau khi fix ISS-02).
- **Long-term action**: Thiết lập ngưỡng coverage tối thiểu trong CI (khi có CI — xem ISS Deployment liên quan), mở rộng dần ra toàn bộ 116 endpoint.

### #6 — ISS-04: NoSQL operator injection
- **Immediate action**: Đối với 3 domain bị ảnh hưởng (RBAC, Departments, UserAudit), thêm kiểm tra `typeof value === "string"` ngay tại Service trước khi gán filter — có thể vá nhanh không cần đổi route.
- **Short-term action**: Khôi phục `validateQuery` với Zod `.string()` nghiêm ngặt ở toàn bộ 11 route đã comment (bao gồm cả các route không liên quan trực tiếp injection nhưng cùng nguyên nhân gốc).
- **Long-term action**: Thêm middleware sanitize tổng quát tương thích Express 5 ở tầng `app.ts`; áp dụng mẫu hình whitelist field của `documents.mapper.ts:buildDocumentFilter` cho mọi domain còn lại.

### #7 — ISS-06: Excel import N+1 transaction
- **Immediate action**: Giám sát/giới hạn tạm thời kích thước file import thực tế đang được dùng trong vận hành (nếu traffic thật đã gần ngưỡng 5000 dòng).
- **Short-term action**: Refactor `importDocumentsExcel` sang batch transaction theo nhóm dòng (vd 100–500 dòng/transaction) thay vì per-row.
- **Long-term action**: Benchmark thời gian xử lý thực tế với file lớn (đã ghi trong Unknowns Phase 10) để xác nhận mức cải thiện sau refactor; áp dụng cùng pattern cho Asset Excel import (ISS liên quan PERF-10).

### #8 — ISS-08: Pagination Documents hỏng
- **Immediate action**: Khôi phục `validateQuery(QueryDocumentDTO)` — fix 1 dòng, rủi ro thay đổi rất thấp, nên làm cùng đợt với ISS-09.
- **Short-term action**: Kiểm tra lại 2 domain khác cùng lỗi gốc (Users, Notifications — theo Phase 05 §4.5-4.6) đã fix đúng cách chưa.
- **Long-term action**: Thêm test tự động cho pagination (thuộc phạm vi ISS-07) để tránh tái phát khi có refactor sau này.

### #9 — ISS-05: `WorkflowInstance` COLLSCAN
- **Immediate action**: Không có immediate fix an toàn nếu chưa qua staging (thêm index trên collection lớn có thể gây lock tạm thời) — lên kế hoạch bảo trì.
- **Short-term action**: Thêm index `{status:1}` tối thiểu ở môi trường staging trước, đo lại hiệu năng truy vấn.
- **Long-term action**: Đánh giá denormalize `currentStepRole` để loại bỏ hoàn toàn phụ thuộc `$expr + $arrayElemAt` trong truy vấn chính.

### #10 — ISS-10: Replica set chưa xác minh
- **Immediate action**: Xác minh ngay cấu hình MongoDB production (chạy `rs.status()` hoặc kiểm tra connection string `replicaSet=` param) — đây là hành động xác minh, không phải thay đổi code.
- **Short-term action**: Nếu xác nhận KHÔNG phải replica set, ưu tiên khẩn cấp: hoặc chuyển đổi hạ tầng sang replica set (kể cả 1-node), hoặc refactor tạm thời các luồng `withTransaction` sang cơ chế không cần transaction cho tới khi hạ tầng sẵn sàng.
- **Long-term action**: Ghi nhận yêu cầu hạ tầng này vào tài liệu triển khai chính thức (hiện chưa có Dockerfile/docker-compose mô tả topology) để tránh tái diễn khi có triển khai mới/di dời hạ tầng.

---

## 7. ISSUE REGISTER — TỔNG HỢP MEDIUM / LOW / INFO

> Format rút gọn (ID, Category, Severity, Title, Evidence/Source, Confidence) — chi tiết đầy đủ (current/expected behavior, impact, recommendation) đã có sẵn tại tài liệu phase gốc được tham chiếu, không lặp lại ở đây để tối ưu context.

| ID | Category | Severity | Title | Evidence / Source | Confidence |
|---|---|---|---|---|---|
| ISS-11 | Authentication | MEDIUM | Refresh token không rotate; `changePassword` không revoke token khác | `auths.service.ts:refresh`, `users.service.ts:changePassword` — SEC-01 | CONFIRMED |
| ISS-12 | Authorization | MEDIUM | Permission cache không invalidate khi đổi role qua `update()` đang chạy | `users.service.ts:update` — SEC-08 | CONFIRMED |
| ISS-13 | Security (Injection) | MEDIUM | ReDoS/regex injection không escape (Departments, RBAC search) | `department.service.ts`, `rbac.service.ts` (`getRoleService` etc.) — SEC-14 | CONFIRMED (code), POTENTIAL RISK (mức độ) |
| ISS-14 | Security (Injection) | MEDIUM | CSV Formula/Excel Injection ở export UserAudit | `userAudits.service.ts:escapeCsvField/exportAuditLogsCSV` — SEC-15 | CONFIRMED (code), UNKNOWN (khai thác) |
| ISS-15 | API | MEDIUM | 11 route `validateQuery` bị comment out (gốc của ISS-04/ISS-08 và nhiều bug khác) | 8 file route — SEC-10, Phase 05 §5.2 | CONFIRMED |
| ISS-16 | Database | MEDIUM | `RefreshToken` thiếu index `token`, không TTL cleanup | Phase 04 §14 #2, PERF-02 | CONFIRMED |
| ISS-17 | Deployment | MEDIUM | Không có Dockerfile/docker-compose/CI-CD nào | Phase 01 §13 | CONFIRMED |
| ISS-18 | Database | MEDIUM | Hard-delete Asset không check `Document.relatedAsset` | Phase 04 §12.2 | CONFIRMED |
| ISS-19 | Database | MEDIUM | Xoá Role không check `WorkflowTemplate/Instance.steps[].role` (string) | Phase 04 §12.3 | CONFIRMED |
| ISS-20 | Performance | MEDIUM | `buildMapFromReports` tải toàn bộ Document theo subType không lọc phạm vi mỗi lần export | `buildMapReports.ts` — PERF-08 | CONFIRMED FROM CODE |
| ISS-21 | Performance | MEDIUM | Cron cảnh báo Asset: N+1 Role/User query mỗi asset, ghi tuần tự | `assetAlerts.service.ts` — PERF-09 | CONFIRMED FROM CODE |
| ISS-22 | Maintainability | MEDIUM | `ROLE_PERMISSIONS` "trên giấy" không đồng bộ DB thật (script seed không tồn tại) | `rolePermission.map.ts` — SEC-09 | CONFIRMED |
| ISS-23 | API | MEDIUM | RBAC thiếu `validateParams(IdParamDTO)` ở PUT/DELETE; Departments thiếu toàn bộ validate | `rbac.routes.ts`, `department.routes.ts` — SEC-11 | CONFIRMED |
| ISS-24 | Backend | MEDIUM | Response format không đồng nhất giữa domain (`auth`, `upload` lệch khỏi `{success,message,data}`) | Phase 03 §4, Phase 05 §11 #7 | CONFIRMED |
| ISS-25 | Database | MEDIUM | Read-modify-write `approveStep` không xử lý `VersionError` khi duyệt đồng thời | Phase 04 §12.5 | CONFIRMED (code), chưa test concurrency thật |
| ISS-26 | API | LOW–MEDIUM | `DELETE /documents/delete-by-month` thiếu `validateBody` cho `month`/`year` | Phase 04 §12.1, SEC-12 | CONFIRMED |
| ISS-27 | API | LOW–MEDIUM | File upload không truy cập được qua HTTP (không có `express.static`) | Phase 05 §5.4 | CONFIRMED |
| ISS-28 | Security (Injection) | LOW–MEDIUM | Path traversal tiềm năng qua `file.originalname` không sanitize | `upload.middleware.ts:storage.filename` — SEC-16 | CONFIRMED (code), INFERRED (khai thác) |
| ISS-29 | Security (API) | LOW–MEDIUM | CORS mở `*` nếu thiếu `CLIENT_URL`, kết hợp `credentials:true` | `app.ts` — SEC-21 | CONFIRMED, UNKNOWN (triển khai thật) |
| ISS-30 | Authentication | LOW | Password policy yếu (`min(5)`, không yêu cầu độ phức tạp) | DTO đăng ký/đổi mật khẩu — SEC-02 | CONFIRMED |
| ISS-31 | Authentication | LOW | JWT secret đọc bằng non-null assertion, không fail-fast lúc khởi động | `auth.middleware.ts`, `auth.helper.ts` — SEC-03 | CONFIRMED |
| ISS-32 | Authentication | LOW | JWT payload chứa `role`/`department` dư thừa, mâu thuẫn comment | `auth.helper.ts`, `auths.service.ts` — SEC-04 | CONFIRMED |
| ISS-33 | Security (File Upload) | LOW | Type check file chỉ dựa MIME/extension client cung cấp | `upload.middleware.ts` — SEC-17 | CONFIRMED |
| ISS-34 | Security (API) | LOW | Không có `trust proxy`, ảnh hưởng độ chính xác rate-limit sau reverse proxy | `app.ts` — SEC-22 | CONFIRMED, UNKNOWN (hạ tầng) |
| ISS-35 | Security (API) | LOW | Rò rỉ `err.message` gốc ở nhánh lỗi không xác định | `error.middleware.ts`, `upload.controller.ts` — SEC-23 | CONFIRMED |
| ISS-36 | Database | LOW–MEDIUM | 7/21 model thiếu index ngoài `_id` (nay 7/31, xem DEV-071) | Phase 04 §10, PERF-04 | CONFIRMED |
| ISS-37 | Database | LOW–MEDIUM | `Document` thiếu index compound `isActive/deletedAt` cho dashboard | Phase 04 §9.2, PERF-03 | CONFIRMED |
| ISS-38 | Database | LOW–MEDIUM | Thiếu `.lean()` ở list endpoint Users/RBAC | `users.service.ts:getList`, `rbac.service.ts` — PERF-05 | CONFIRMED |
| ISS-39 | Backend | LOW | Dead code tích luỹ (7 vị trí: errorHandler, loadDocument, mongo.logger, upload.validator, documents.validator×2, `assignRole`) | Phase 03 §11.4, Phase 07 §6.1/9.2 | CONFIRMED |
| ISS-40 | Backend | LOW | 2 rate-limiter trùng cấu hình; 2 cấu hình Multer riêng biệt | Phase 03 §11.3 | CONFIRMED |
| ISS-41 | Backend | LOW | Comment code lỗi thời/mâu thuẫn hành vi thực tế (JWT payload, hard-delete Asset, workflow route, openAPI) | Phase 03 §3.2(d), Phase 05 §9.1, Phase 07 §3.1 | CONFIRMED |
| ISS-42 | Maintainability | LOW | Không có script `test` trong `package.json` | Phase 01 §14 | CONFIRMED |
| ISS-43 | Deployment | LOW | README tham chiếu script không tồn tại (`seed:rbac`, `seed:medical-devices`, `backup-mongo.*`) | Phase 01 §13 | CONFIRMED |
| ISS-44 | Deployment | LOW | `JWT_SECRET`/`CLIENT_URL` không validate tồn tại lúc bootstrap | SEC-03, SEC-21 | CONFIRMED |
| ISS-45 | Architecture | LOW | Cache permission in-memory không chia sẻ giữa instance (chặn scale-out) | Phase 02 §6, Phase 07 §5.4 | CONFIRMED |
| ISS-46 | Architecture | LOW | Không có cache layer ngoài (Redis/CDN/HTTP cache header) | Phase 02 §1, PERF-14 | CONFIRMED |
| ISS-47 | Architecture | LOW | Cross-domain coupling — Service gọi thẳng Service/Model domain khác, không qua interface trung gian | Phase 02 §7 | CONFIRMED |
| ISS-48 | Business Logic | LOW–MEDIUM | Side-effect (Notification, đồng bộ Asset khi approve) nằm ngoài transaction chính theo chủ đích | Phase 02 §9.3 | CONFIRMED (thiết kế có chủ đích, chưa có cơ chế bù trừ) |
| ISS-49 | Business Logic / Database | MEDIUM | `WorkflowInstance.steps[].role` lưu free string, không phải ObjectId — Workflow có thể kẹt vĩnh viễn nếu Role đổi tên/xoá | Phase 02, Phase 04 §12.3 | CONFIRMED |
| ISS-50 | Data Security | LOW | Response Upload không nhất quán về shape (không có field nhạy cảm) | `upload.controller.ts` — SEC-25 | CONFIRMED |
| ISS-51 | Data Security | LOW | Log không có redaction chủ động cho query string nhạy cảm (chưa có evidence vi phạm cụ thể) | `error.middleware.ts` — SEC-27 | INFERRED |

### Điểm tích cực đối trọng (INFO — không phải issue, ghi nhận cho khách quan)
- Không phát hiện secret hard-code trong source (SEC-19); `.env` không commit ở working tree hiện tại (SEC-20, chưa quét toàn bộ git history).
- `User.password` có `select:false` đúng cách (SEC-26).
- 116/116 endpoint và 87/87 path khớp hoàn hảo giữa `openAPI.yaml` và route thực tế (không có API documentation debt ở mức path/method).
- Excel export Document/Asset dùng streaming đúng chuẩn (`ExcelJS.stream.xlsx.WorkbookWriter`); `performanceLogBuffer.ts` batch-flush hiệu quả; `escapeRegex`/`buildDocumentFilter` (domain Documents) là mẫu hình bảo mật tốt nên nhân rộng.
- Whitelist thuật toán JWT (`HS256`) tường minh; chống account-enumeration/timing attack nhất quán ở login/forgotPassword; `Policycondition.evaluator.ts` không dùng `eval`/`Function` dù hiện dead code.

---

## 8. UNKNOWNS ẢNH HƯỞNG TRỰC TIẾP ĐẾN ĐÁNH GIÁ RISK (kế thừa, không phân tích thêm ở phase này)

- Dữ liệu Role/Permission thật trong MongoDB — ảnh hưởng trực tiếp mức độ khai thác thực tế của ISS-01 (Probability trong Risk Matrix).
- Môi trường production có phải MongoDB replica set hay không — ảnh hưởng trực tiếp ISS-10 và khả năng thực thi mọi khuyến nghị liên quan `withTransaction` (ISS-02, ISS-06 nếu chuyển hướng dùng transaction).
- Số lượng bản ghi thực tế (`WorkflowInstance`, `RefreshToken`, `Document`) và traffic thực tế theo endpoint — ảnh hưởng mức độ nghiêm trọng thực tế của ISS-05, ISS-16, ISS-36, ISS-37.
- Tần suất/kích thước file Excel import thực tế trong vận hành — ảnh hưởng Probability của ISS-06.
- `note` field trong `UserAudit` có bao giờ chứa input người dùng thô hay không — ảnh hưởng mức độ khai thác thực tế của ISS-14.
- Có đứng sau reverse proxy hay không — ảnh hưởng ISS-34.
- `CLIENT_URL` có luôn được set đúng ở mọi môi trường triển khai hay không — ảnh hưởng ISS-29.

---

**PHASE 12 COMPLETED**
