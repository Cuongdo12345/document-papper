# 09 — SECURITY ANALYSIS

> Phase: 09 — Security Analysis
> Phạm vi: source-code-based security review (authentication, authorization, input validation, injection, file upload, secrets, API security, data security). KHÔNG exploit hệ thống, KHÔNG sửa code.
> Nguồn: re-clone tại thời điểm Phase 09 — commit `f4ce8e9083e16c01177f53a3871b66cfde4133b8` ("update", 2026-08-24 13:53:38 +0700) — **khớp chính xác** với `00_PROJECT_MEMORY.md`, không có thay đổi.
> Kế thừa: phần lớn finding về Authentication/Authorization/API đã có evidence chi tiết ở Phase 03/04/05/07/08 — Phase 09 **tổng hợp lại theo format Finding chuẩn** và bổ sung các phát hiện MỚI (chủ yếu ở Injection, File Upload, Secrets, API Security) chưa được phân tích ở các phase trước.
> Quy ước: **CONFIRMED** = evidence trực tiếp trong source. **INFERRED** = suy luận hợp lý từ code, chưa test runtime. **UNKNOWN** = chưa đủ evidence.

---

## 0. Tóm tắt điều hành (Executive Summary)

| Severity | Số lượng |
|---|---|
| CRITICAL | 1 |
| HIGH | 3 |
| MEDIUM | 7 |
| LOW | 8 |
| INFO | 3 |

Điểm đáng chú ý nhất: (1) **leo thang đặc quyền lên ADMIN** qua `PUT /api/users/:id` (kế thừa Phase 07, mức CRITICAL trong bối cảnh security tổng hợp), (2) **toàn bộ tầng ABAC/Policy chết ở runtime** khiến hệ thống chỉ có RBAC coarse-grained bảo vệ, (3) **rủi ro NoSQL injection/operator injection** mới phát hiện ở nhiều endpoint list (RBAC, Departments, User Audit) do gán thẳng giá trị query string vào Mongo filter mà không kiểm tra kiểu, kết hợp với việc **không có bất kỳ middleware sanitize nào** (`express-mongo-sanitize` không tồn tại trong dependencies) và các route này đã có `validateQuery` bị comment out (Phase 05).

---

## 1. AUTHENTICATION

### SEC-01 — Refresh token không rotate; `changePassword()` không revoke — refresh token bị đánh cắp sống sót qua tự đổi mật khẩu
- **Severity**: MEDIUM
- **Category**: Authentication / Session Management
- **Evidence**: `refresh()` không tạo `RefreshToken` mới (không rotate); `changePassword()` không gọi `RefreshToken.updateMany`/`deleteMany` nào, khác 3 luồng đổi mật khẩu còn lại (`resetPassword`, `resetPasswordByAdmin`, `disableUser` đều revoke toàn bộ).
- **File**: `backend/src/services/auth/auths.service.ts` (`refresh`), `backend/src/services/users/users.service.ts` (`changePassword`)
- **Function**: `refresh()`, `changePassword()`
- **Impact**: Nếu kẻ tấn công đã có refresh token hợp lệ của nạn nhân (đánh cắp trước đó), nạn nhân tự đổi mật khẩu qua `changePassword` (kịch bản phổ biến khi nghi ngờ lộ mật khẩu) KHÔNG đẩy được kẻ tấn công ra khỏi phiên — refresh token cũ vẫn dùng được tới khi hết hạn tự nhiên (7 ngày).
- **Recommendation**: Revoke toàn bộ refresh token khác của user (trừ token hiện tại nếu cần giữ session đang dùng) mỗi khi tự đổi mật khẩu; cân nhắc rotate refresh token ở mỗi lần `/refresh-token`.
- **Confidence**: CONFIRMED (kế thừa Phase 07 §3.3/9.5).

### SEC-02 — Password policy yếu
- **Severity**: LOW
- **Category**: Authentication / Credential Policy
- **Evidence**: `z.string().min(5)` — không yêu cầu độ dài lớn hơn, không yêu cầu chữ hoa/thường/số/ký tự đặc biệt — áp dụng ở cả `register`, `changePassword`, admin reset.
- **File**: `backend/src/dto/*/*.dto.ts` (DTO đăng ký/đổi mật khẩu)
- **Impact**: Giảm hiệu quả chống brute-force offline nếu hash bị lộ; tăng khả năng mật khẩu yếu/dễ đoán.
- **Recommendation**: Tăng độ dài tối thiểu (≥8), khuyến nghị/enforce độ phức tạp cơ bản, cân nhắc kiểm tra danh sách mật khẩu phổ biến.
- **Confidence**: CONFIRMED (kế thừa Phase 07 §9.6).

### SEC-03 — JWT secret đọc bằng non-null assertion / type-cast, không fail-fast lúc khởi động
- **Severity**: LOW
- **Category**: Authentication / Configuration
- **Evidence**: `jwt.verify(token, process.env.JWT_SECRET!, ...)` (`auth.middleware.ts`), `jwt.sign(payload, process.env.JWT_SECRET as string, ...)` (`auth.helper.ts`) — không có check tồn tại tường minh như `PORT`/`MONGO_URI` (throw ngay ở `server.ts`).
- **File**: `backend/src/middlewares/auth.middleware.ts`, `backend/src/shared/helpers/auth.helper.ts`
- **Impact**: Nếu `JWT_SECRET`/`JWT_REFRESH_SECRET` thiếu ở môi trường triển khai, lỗi CHỈ xuất hiện khi có request đầu tiên gọi tới (verify/sign với `undefined`), không fail-fast lúc khởi động như `PORT`/`MONGO_URI` — dễ bị bỏ sót trong review triển khai.
- **Recommendation**: Validate `JWT_SECRET`/`JWT_REFRESH_SECRET` tồn tại ngay ở bootstrap (`server.ts`), cùng cơ chế với `PORT`/`MONGO_URI`.
- **Confidence**: CONFIRMED.

### SEC-04 — JWT access token payload chứa `role`/`department` object dư thừa
- **Severity**: LOW
- **Category**: Authentication / Data Exposure
- **Evidence**: `generateAccessToken({id, role, department})` — role/department object đầy đủ (đã populate) được ký vào token dù comment code khẳng định "chỉ gồm `{id}`"; `authenticate` middleware chỉ dùng `decoded.id`, không dùng phần còn lại để authorize.
- **File**: `backend/src/shared/helpers/auth.helper.ts`, `backend/src/services/auth/auths.service.ts`
- **Impact**: JWT chỉ ký (sign), không mã hoá — ai có access token đều `base64-decode` được role name/department. Không ảnh hưởng authorization (không dùng để authorize), nhưng là rò rỉ thông tin dư thừa nếu token bị chặn giữa đường.
- **Recommendation**: Giảm payload về đúng `{id}` như comment mô tả, hoặc nếu cần role/department cho mục đích khác (hiển thị UI), ghi chú rõ và chấp nhận rủi ro có kiểm soát.
- **Confidence**: CONFIRMED (kế thừa Phase 07 §3.1/9.8).

### Điểm tốt đã xác nhận (Authentication)
- Chống account-enumeration + timing attack nhất quán ở `login`/`forgotPassword` (dummy `bcrypt.compare`/`countDocuments`).
- `bcrypt` cost factor 10, nhất quán ở mọi nơi hash password.
- Whitelist thuật toán JWT (`HS256` tường minh) ở cả access/refresh verify — chống algorithm confusion.
- `authenticate` load lại `User`/`isActive` mỗi request — vô hiệu hoá user có hiệu lực ngay, không phụ thuộc cache/token expiry.
- `DUMMY_PASSWORD_HASH` **không phải secret thật** — là 1 bcrypt hash công khai, vô hại, dùng đúng mục đích cân bằng thời gian phản hồi (không phải rò rỉ credential).

---

## 2. AUTHORIZATION

### SEC-05 — CRITICAL — Privilege escalation lên ADMIN qua `PUT /api/users/:id` — ✅ RESOLVED (2026-08-30)
- **Severity**: CRITICAL (trước fix)
- **Category**: Authorization / Access Control
- **Evidence (TRƯỚC FIX)**: hàm `update()` (được gọi bởi endpoint đang chạy thật) cho phép đổi `user.role` sang bất kỳ `roleId` nào (kể cả role `ADMIN`) mà KHÔNG có safeguard chặn, và KHÔNG gọi `clearPermissionCache()`. Hàm `assignRole()` (cùng file) CÓ đủ 2 safeguard (chặn gán ADMIN + clear cache) nhưng **là dead code, không được gắn vào bất kỳ route nào**.
- **File**: `backend/src/services/users/users.service.ts`
- **Function**: `update()` (đã fix) vs `assignRole()` (vẫn dead code, ngoài phạm vi fix này)
- **Impact (TRƯỚC FIX)**: Bất kỳ user nào có permission `USER_UPDATE` có thể tự thăng cấp mình (hoặc user khác) lên ADMIN, sau đó bypass hoàn toàn mọi `authorizePermission` check khác trong hệ thống (do ADMIN bypass string-match `role.name === "ADMIN"`). Đây là con đường leo thang đặc quyền nghiêm trọng nhất toàn hệ thống.
- **Fix đã áp dụng**: `update()` throw `ApiError.badRequest` nếu `role.name === "ADMIN"`, không có ngoại lệ. Chi tiết: `docs/tasks/TASK-001.md`.
- **Chưa xử lý (ngoài phạm vi fix)**: tách riêng endpoint "gán role" có kiểm soát chặt hơn/permission riêng (long-term recommendation, TASK-001 đề xuất để task khác); `create()` vẫn không chặn tạo user mới với role ADMIN trực tiếp.
- **Confidence**: CONFIRMED (kế thừa nguyên văn Phase 07 §9.2, xác nhận lại bằng diff thực tế 2026-08-30). Mức độ khai thác thực tế trong quá khứ (đã bị lợi dụng hay chưa) — **UNKNOWN**.

### SEC-06 — HIGH — `POST /api/documents/proposal` thiếu authorization check
- **Severity**: HIGH
- **Category**: Authorization / Broken Access Control
- **Evidence**: route chỉ có `authenticate`, dòng `authorizePermission("DOCUMENT_CREATE")` bị comment out.
- **File**: `backend/src/routes/documents/document.route.ts`
- **Function**: route `POST /proposal`
- **Impact**: Bất kỳ user đã đăng nhập nào (không phân biệt role/permission theo thiết kế RBAC) đều tạo được Document proposal — vi phạm nguyên tắc least-privilege, bất kể vai trò thực tế có được cấp `DOCUMENT_CREATE` hay không.
- **Recommendation**: Bỏ comment, kích hoạt lại `authorizePermission("DOCUMENT_CREATE")`.
- **Confidence**: CONFIRMED (kế thừa Phase 03/05/07).

### SEC-07 — HIGH — Tầng ABAC (Policy) hoàn toàn không thể kích hoạt ở runtime
- **Severity**: HIGH (đánh giá lại trong bối cảnh security tổng hợp — mất hẳn 1 tầng phòng thủ được quảng cáo trong thiết kế)
- **Category**: Authorization / Defense in Depth
- **Evidence**: toàn bộ 103 lệnh gọi `authorizePermission()` trong routes không truyền `options.enablePolicies`/`resource`/`action` — nhánh ABAC (bước 5 trong `authorizePermission.middleware.ts`) không bao giờ thực thi. `loadDocument.middleware.ts` (middleware duy nhất gán `req.resource`) không gắn vào route nào.
- **File**: `backend/src/middlewares/authorizePermission.middleware.ts`, toàn bộ `backend/src/routes/**/*.ts`
- **Impact**: Mọi kỳ vọng bảo vệ theo ngữ cảnh (resource-level authorization, IDOR protection, department-scoping tập trung) dựa trên ABAC **không có tác dụng thực tế** dù đã được xây dựng đầy đủ (Policy model, evaluator 319 dòng chống RCE, CRUD API). Việc kiểm soát phạm vi dữ liệu hiện chỉ tồn tại rải rác, thủ công ở 1 số service cụ thể (Phase 07 §9.4/9.7) — không đảm bảo bao phủ toàn diện.
- **Recommendation**: Hoặc (a) hoàn thiện việc gắn `enablePolicies`/`resource`/`action` + `loadDocument` (hoặc middleware tương đương) vào các route thực sự cần resource-level check, hoặc (b) nếu quyết định không dùng ABAC, cân nhắc gỡ bỏ để giảm bề mặt tấn công/nhiễu bảo trì, đồng thời rà soát thủ công đầy đủ các endpoint cần department-scoping/ownership check (Phase 07 §9.7 vẫn UNKNOWN toàn diện).
- **Confidence**: CONFIRMED (kế thừa Phase 07 §5.3, đây là phát hiện dead-code lớn nhất toàn dự án).

### SEC-08 — MEDIUM — Permission cache không invalidate khi đổi role qua endpoint đang chạy — ✅ RESOLVED (2026-08-30, fix chung với SEC-05/TASK-001)
- **Severity**: MEDIUM (trước fix)
- **Category**: Authorization / Cache Consistency
- **Evidence (TRƯỚC FIX)**: `update()` không gọi `clearPermissionCache()` sau khi đổi `role`.
- **File**: `backend/src/services/users/users.service.ts`
- **Impact (TRƯỚC FIX)**: Sau khi đổi role (bao gồm cả downgrade quyền, không chỉ escalate ở SEC-05), permission cache (TTL 5 phút) của user đó vẫn giữ quyền CŨ tối đa 5 phút — cửa sổ thời gian ngắn nơi quyền áp dụng không khớp dữ liệu thật.
- **Fix đã áp dụng**: `update()` gọi `clearPermissionCache(user._id.toString())` mỗi khi role thực sự thay đổi (so sánh `oldRoleId` trước khi ghi đè). Cùng 1 commit với fix SEC-05 (cùng hàm, cùng root cause). Chi tiết: `docs/tasks/TASK-001.md`.
- **Confidence**: CONFIRMED (kế thừa Phase 07 §9.3, xác nhận lại bằng diff thực tế).

### SEC-09 — LOW — RBAC/Permission "trên giấy" (`ROLE_PERMISSIONS`) không đồng bộ với DB thật
- **Severity**: LOW (rủi ro vận hành/audit hơn là lỗ hổng kỹ thuật trực tiếp)
- **Category**: Authorization / Configuration Drift
- **Evidence**: `rolePermission.map.ts` viết cho mục đích 1 script `seed-rbac.ts` đọc — script này không tồn tại, `ROLE_PERMISSIONS` không được import ở đâu khác.
- **File**: `backend/src/shared/constants/rolePermission.map.ts`
- **Impact**: Không có cách nào đối chiếu tự động giữa "ý đồ phân quyền" và dữ liệu Role/Permission thật trong MongoDB — rủi ro DB thật lệch khỏi thiết kế mà không ai biết, gây khó khăn khi audit quyền hạn.
- **Recommendation**: Viết script seed đọc `ROLE_PERMISSIONS` để đồng bộ, hoặc bổ sung 1 job/API đối chiếu định kỳ.
- **Confidence**: CONFIRMED (kế thừa Phase 07 §6.1).

### Điểm tốt đã xác nhận (Authorization)
- Công thức RBAC hiệu lực rõ ràng, có override `extraPermissions`/`denyPermissions`.
- `logout()` chỉ tự thu hồi token của chính mình (đã vá lỗ hổng cũ, có comment xác nhận).
- `updateDocumentService` có department-scoping + khoá sửa theo `workflowStatus` (Phase 08).
- Guard chống dangling reference khi xoá Role/Permission (check `User` đang dùng).

---

## 3. INPUT VALIDATION

### SEC-10 — MEDIUM — 11 route có `validateQuery` bị comment out, dẫn tới dữ liệu query không được coerce/validate
- **Severity**: MEDIUM
- **Category**: Input Validation
- **Evidence**: `GET /documents`, `/workflows/pending`, `/users`, `/rbac/permissions|roles|policies`, `/user-audits` (+`/export`,`/dashboard`), `/notifications`, `/assets`, `/assets/:id/assignment-history`, `/assets/asset-categories` — tất cả có dòng `validateQuery(...)` bị comment.
- **File**: 8 file route tương ứng (đã liệt kê Phase 05 §5.2)
- **Impact**: (a) Bug pagination xác nhận ở Documents/Users/Notifications (Phase 05 §4.4-4.6); (b) mở đường cho SEC-11/SEC-12 (injection/ReDoS) vì không còn lớp validate shape chặn giá trị bất thường (object thay vì string, ký tự lạ) trước khi vào Service.
- **Recommendation**: Khôi phục `validateQuery` ở toàn bộ 11 route, đảm bảo Zod schema ép kiểu primitive (string/number) và từ chối object lồng cho các field dùng làm filter.
- **Confidence**: CONFIRMED (kế thừa Phase 03/05).

### SEC-11 — LOW — Departments & 1 phần RBAC thiếu `validateParams`/`validateBody` hoàn toàn
- **Severity**: LOW
- **Category**: Input Validation
- **Evidence**: `departments/department.routes.ts` không có `validateBody`/`validateParams` ở bất kỳ route nào; `rbac.routes.ts` thiếu `validateParams(IdParamDTO)` ở toàn bộ route `PUT`/`DELETE` theo `:id` (chỉ có ở `GET /:id`).
- **File**: `backend/src/routes/departments/department.routes.ts`, `backend/src/routes/rbac/rbac.routes.ts`
- **Impact**: `:id` không hợp lệ sẽ rơi vào Mongoose `CastError` (được `error.middleware.ts` map về 400) thay vì bị chặn sớm và rõ ràng ở tầng route — không phải lỗ hổng nghiêm trọng nhưng làm giảm tính nhất quán/độ rõ ràng của lỗi trả về, và với `department` domain, KHÔNG có bất kỳ validate shape nào cho body (rủi ro dữ liệu bất thường lọt sâu hơn vào Service so với domain khác).
- **Recommendation**: Bổ sung `validateParams(IdParamDTO)` cho RBAC PUT/DELETE; bổ sung `validateBody`/`validateParams` đầy đủ cho Departments.
- **Confidence**: CONFIRMED (kế thừa Phase 05 §5.1, §11 mục 5-6).

### SEC-12 — LOW — `DELETE /api/documents/delete-by-month` không có `validateBody` cho `month`/`year`/filter
- **Severity**: LOW
- **Category**: Input Validation
- **Evidence**: route tự ghi comment "chưa xử lý validation ở đây".
- **File**: `backend/src/routes/documents/document.route.ts`
- **Impact**: Kết hợp với hard-delete thật (`deleteMany`, Phase 04 §12.1) — input không hợp lệ (vd `month`/`year` sai định dạng) có thể dẫn tới query phạm vi rộng hơn dự kiến, dù `buildDocumentFilter` vẫn whitelist field.
- **Recommendation**: Thêm Zod DTO validate `month`/`year` (kiểu số, khoảng hợp lệ) trước khi build query xoá hàng loạt.
- **Confidence**: CONFIRMED (kế thừa Phase 04 §12.1).

---

## 4. INJECTION RISKS

### SEC-13 — HIGH — Rủi ro NoSQL operator injection qua gán trực tiếp giá trị query string vào Mongo filter (MỚI, Phase 09)
- **Severity**: HIGH
- **Category**: Injection (NoSQL)
- **Evidence** (đọc trực tiếp source, không suy diễn):
  - `rbac.service.ts:getPermissionService` — `if (resource) filter.resource = resource;` / `if (action) filter.action = action;`
  - `rbac.service.ts:getPolicieService` — cùng pattern với `resource`/`action`.
  - `department.service.ts:getAllDepartmentsService` — filter xây từ `keyword`/`code`/`name` lấy trực tiếp từ query, không ép kiểu string.
  - `userAudits.service.ts:buildAuditFilter` — `if (performedBy) filter.performedBy = performedBy;` / `if (user) filter.user = user;` — dùng chung bởi `getAuditLogsService`, `exportAuditLogsExcel`, `exportAuditLogsCSV`.
  - **Không có bất kỳ middleware sanitize nào** trong toàn bộ dependencies/`src/` (`grep "mongo-sanitize\|sanitize"` không có kết quả) để chặn ký tự `$`/`.` trong key của object query.
  - Toàn bộ các route GET tương ứng (`/rbac/permissions|roles|policies`, `/departments`, `/user-audits*`) đều nằm trong danh sách route có `validateQuery` bị comment out (SEC-10) — nghĩa là KHÔNG có lớp nào ép các field này phải là `string` trước khi tới đoạn code trên.
- **File**: `backend/src/services/rbac/rbac.service.ts`, `backend/src/services/departments/*.ts`, `backend/src/services/users/userAudits.service.ts`
- **Function**: `getPermissionService`, `getPolicieService`, `getAllDepartmentsService`, `buildAuditFilter`
- **Impact**: Express (dùng `qs` làm query parser mặc định) hỗ trợ cú pháp bracket cho query string (`?performedBy[$ne]=null`), tự động dựng `req.query.performedBy` thành `{ $ne: null }` (object, không phải string). Vì code gán thẳng `filter.performedBy = performedBy` mà không kiểm tra `typeof === "string"`, object này sẽ được truyền thẳng vào Mongoose `.find(filter)` như 1 MongoDB operator hợp lệ (`$ne`, `$gt`, `$regex`, v.v.) — cho phép attacker thay đổi ngữ nghĩa truy vấn (vd bypass filter dự kiến, dò thông tin qua boolean/timing của kết quả trả về). Mức độ khai thác thực tế (đọc dữ liệu ngoài phạm vi dự kiến, không phải RCE) phụ thuộc field cụ thể và có bị dùng để lộ dữ liệu nhạy cảm hay không — **INFERRED** dựa trên pattern code, **chưa test runtime** (đúng nguyên tắc "không exploit hệ thống" của Phase 09).
- **Recommendation**: (a) Khôi phục `validateQuery` ở các route liên quan (SEC-10) với Zod schema ép `.string()` nghiêm ngặt cho từng field filter; (b) thêm kiểm tra `typeof value === "string"` trước khi gán vào filter ở tầng Service (defense in depth, giống cách `documents.mapper.ts:buildDocumentFilter` đã làm bằng whitelist); (c) cân nhắc thêm middleware sanitize tổng quát (vd `express-mongo-sanitize` hoặc tương đương tương thích Express 5) ở tầng `app.ts`.
- **Confidence**: CONFIRMED (code pattern), INFERRED (mức độ khai thác thực tế — cần test runtime, ngoài phạm vi Phase 09).

### SEC-14 — MEDIUM — Regular Expression injection / ReDoS tiềm năng qua `$regex` không escape (MỚI, Phase 09)
- **Severity**: MEDIUM
- **Category**: Injection (ReDoS / Regex)
- **Evidence**: `department.service.ts` và `rbac.service.ts` (`getPermissionService`, `getRoleService`, `getPolicieService`) đều dùng trực tiếp `keyword`/`resource`/`action`... vào `{ $regex: keyword, $options: "i" }` mà **KHÔNG qua escape** — khác hẳn `documents.mapper.ts:escapeRegex` (đã escape ký tự đặc biệt regex trước khi dùng trong filter, xem Phase 03 §6.2).
- **File**: `backend/src/services/departments/*.ts`, `backend/src/services/rbac/rbac.service.ts`
- **Function**: `getAllDepartmentsService`, `getRoleService`, `getPermissionService`, `getPolicieService`
- **Impact**: Client có thể gửi `keyword` chứa pattern regex phức tạp (vd catastrophic backtracking) khiến MongoDB tốn CPU cao khi evaluate — rủi ro ReDoS ở tầng database (không phải Node.js regex engine, nhưng MongoDB cũng dùng PCRE-like engine có thể bị ảnh hưởng tương tự với input đủ ác ý). Mức độ ảnh hưởng thực tế phụ thuộc kích thước collection và giới hạn tài nguyên MongoDB — **POTENTIAL RISK**, chưa benchmark.
- **Recommendation**: Áp dụng cùng hàm `escapeRegex` (đã có sẵn ở `documents.mapper.ts`) cho mọi nơi dùng `$regex` với input từ client, thay vì chỉ riêng domain Documents.
- **Confidence**: CONFIRMED (thiếu escape), POTENTIAL RISK (mức độ ảnh hưởng thực tế, chưa benchmark).

### SEC-15 — MEDIUM — CSV Export Formula Injection (Excel Injection) — `escapeCsvField` không neutralize ký tự kích hoạt công thức (MỚI, Phase 09)
- **Severity**: MEDIUM
- **Category**: Injection (CSV/Formula Injection)
- **Evidence**: `userAudits.service.ts:escapeCsvField` chỉ xử lý `"`, `,`, `\n`, `\r` (quoting chuẩn CSV) — **không kiểm tra/prefix** các ký tự kích hoạt công thức khi mở bằng Excel/LibreOffice: `=`, `+`, `-`, `@`, tab. Cột export bao gồm `note` (`UserAudit.note`, free-text String) — theo Phase 04, đây là field tự do, một số giá trị có thể chứa nội dung liên quan tới input do người dùng cung cấp gián tiếp (vd ghi chú thao tác).
- **File**: `backend/src/services/users/userAudits.service.ts`
- **Function**: `escapeCsvField`, `exportAuditLogsCSV`
- **Impact**: Nếu 1 giá trị field export bắt đầu bằng `=`/`+`/`-`/`@` (từ dữ liệu do người dùng nhập, dù gián tiếp qua `note`), khi người nhận mở file `.csv` bằng Excel, chuỗi đó có thể bị diễn giải thành công thức, dẫn tới các kịch bản Excel Formula Injection cổ điển (thực thi lệnh hệ thống qua `DDE`, rò rỉ dữ liệu qua công thức tham chiếu ngoài — tuỳ phiên bản Excel/thiết lập bảo mật của người mở file). Đây là rủi ro nhắm vào **người mở file export**, không phải server.
- **Recommendation**: Thêm bước neutralize trong `escapeCsvField`: nếu chuỗi bắt đầu bằng `=`, `+`, `-`, `@`, hoặc tab, prefix bằng `'` (single quote) hoặc khoảng trắng trước khi ghi ra CSV — áp dụng thống nhất cho mọi export CSV/Excel có chứa free-text field do người dùng cung cấp.
- **Confidence**: CONFIRMED (thiếu neutralize trong code), mức độ khai thác thực tế phụ thuộc dữ liệu `note` có bao giờ chứa input người dùng thô hay không — **UNKNOWN** (chưa xác minh toàn bộ nguồn ghi `note`).

### SEC-16 — LOW — File upload path traversal tiềm năng qua `file.originalname` không sanitize (MỚI, Phase 09)
- **Severity**: LOW–MEDIUM
- **Category**: Injection (Path Traversal) / File Upload
- **Evidence**: `services/upload/upload.middleware.ts:storage.filename` — `const uniqueName = \`${Date.now()}-${file.originalname}\`;` — dùng thẳng `file.originalname` (client-controlled, qua header `Content-Disposition` của multipart request) mà **không loại bỏ** ký tự path traversal (`../`, `..\\`) hay path separator.
- **File**: `backend/src/services/upload/upload.middleware.ts`
- **Function**: `storage.filename` (trong `multer.diskStorage`)
- **Impact**: Multer's `diskStorage` nối `destination` + `filename` (tương đương `path.join`) để tạo đường dẫn ghi file cuối cùng. Nếu `file.originalname` chứa chuỗi traversal (vd `../../../../tmp/evil.js`), tên file cuối cùng có nguy cơ escape khỏi thư mục `backend/uploads/` dự kiến, dẫn tới ghi file tại vị trí tuỳ ý trên filesystem server (tuỳ hành vi cụ thể của phiên bản Multer/OS — **INFERRED**, chưa test runtime theo đúng nguyên tắc Phase 09 "không exploit"). Route dùng cấu hình này: `POST /api/upload` (permission `UPLOAD_FILES`) và `POST /api/assets/medical-devices/:assetId/calibration-records` (`certificateUploader`, cùng factory `createUploader`).
- **Recommendation**: Sanitize `file.originalname` trước khi ghép filename — ít nhất dùng `path.basename(file.originalname)` để loại bỏ mọi thành phần thư mục, và/hoặc loại bỏ ký tự đặc biệt, sinh tên file hoàn toàn ngẫu nhiên (UUID) + giữ lại phần mở rộng (extension) đã whitelist riêng.
- **Confidence**: CONFIRMED (code không sanitize), INFERRED (khả năng khai thác thực tế phụ thuộc hành vi Multer/OS cụ thể — chưa test).

---

## 5. FILE UPLOAD

### SEC-17 — LOW — Kiểm tra loại file chỉ dựa vào MIME type client cung cấp (spoofable)
- **Severity**: LOW
- **Category**: File Upload
- **Evidence**: `createUploader` (`services/upload/upload.middleware.ts`) và `uploadExcel` (`middlewares/upload.middleware.ts`) đều check `file.mimetype` (Excel: check phần mở rộng qua `path.extname`, cũng client-controlled) — không có kiểm tra magic-byte/nội dung file thực tế.
- **File**: `backend/src/services/upload/upload.middleware.ts`, `backend/src/middlewares/upload.middleware.ts`
- **Impact**: Client có thể giả mạo `Content-Type`/tên file để upload file có nội dung khác loại được khai báo (vd file thực thi đội lốt `.pdf`). Vì file KHÔNG được serve qua HTTP trực tiếp (Phase 05 §5.4, không có `express.static`), rủi ro thực thi từ xa qua chính ứng dụng này THẤP — nhưng nếu có hệ thống khác (ngoài repo) đọc/serve thư mục `backend/uploads/`, rủi ro tăng lên tuỳ ngữ cảnh đó.
- **Recommendation**: Thêm kiểm tra magic-byte (vd thư viện `file-type`) cho các loại file quan trọng (chứng nhận kiểm định PDF/ảnh), đặc biệt vì các file này có khả năng được mở lại bởi người dùng khác trong tổ chức.
- **Confidence**: CONFIRMED.

### SEC-18 — INFO — File upload lưu local disk, không có cơ chế dọn file mồ côi triệt để (kế thừa + mở rộng Phase 08 MD4)
- **Severity**: INFO
- **Category**: File Upload
- **Evidence**: `calibrationRecord.service.ts` ghi file lên disk trước khi validate nghiệp vụ; có cơ chế dọn best-effort qua try/catch nhưng không đảm bảo 100% (vd process crash giữa chừng vẫn để lại rác). Domain Upload chung (`upload.service.ts:saveFilesToDB`) không thấy cơ chế dọn tương tự khi ghi DB thất bại sau khi Multer đã ghi file.
- **File**: `backend/src/services/assets/assetDevice/calibrationRecord.service.ts`, `backend/src/services/upload/*`
- **Impact**: Rủi ro tích luỹ rác đĩa theo thời gian (availability/operational, không phải lỗ hổng bảo mật trực tiếp).
- **Recommendation**: Thêm job dọn định kỳ file trên disk không có bản ghi `Upload`/`CalibrationRecord` tương ứng.
- **Confidence**: CONFIRMED (kế thừa Phase 08 Rule MD4), mở rộng nhận định sang domain Upload (INFERRED, chưa đọc toàn bộ `upload.service.ts`).

---

## 6. SECRETS

### SEC-19 — INFO — Không phát hiện secret thật hard-code trong source (kết quả tích cực)
- **Severity**: INFO
- **Category**: Secrets Management
- **Evidence**: `grep` toàn bộ `src/` cho pattern `(secret|password|apikey|token)\s*[:=]\s*['"][A-Za-z0-9]{8,}` không trả về kết quả nào. `.env.example` chỉ khai tên biến, không có giá trị thật (`JWT_SECRET =`, `MONGO_URI=`, v.v. đều để trống). `DUMMY_PASSWORD_HASH` trong `auths.service.ts` là 1 bcrypt hash cố định nhưng **không phải mật khẩu/secret thật của tài khoản nào** — dùng đúng mục đích chống timing attack (đã ghi ở SEC-đầu mục 1), không phải rò rỉ credential.
- **File**: toàn bộ `backend/src/`, `backend/.env.example`
- **Impact**: Không có.
- **Recommendation**: Duy trì thực hành hiện tại (không commit `.env` thật — cần xác nhận `.gitignore` có loại trừ `.env`, xem SEC-20).
- **Confidence**: CONFIRMED (trong phạm vi source đã grep — không loại trừ khả năng có secret dạng khác chưa được pattern match phát hiện, vd secret trong file binary/log — ngoài phạm vi phase này).

### SEC-20 — INFO — Xác nhận `.env` không được commit vào repo
- **Severity**: INFO
- **Category**: Secrets Management
- **Evidence**: Chỉ có `.env.example` (không giá trị thật) trong `backend/`; không tìm thấy file `.env` thật nào trong git history ở mức bề mặt (không chạy full `git log --all` scan mọi commit — ngoài phạm vi 1 phase, chỉ xác nhận working tree hiện tại).
- **File**: `backend/.gitignore` (nếu có loại trừ `.env`)
- **Impact**: Không có ở mức xác nhận được.
- **Recommendation**: Nếu chưa có, đảm bảo `backend/.gitignore` loại trừ `.env`; cân nhắc quét lịch sử git (`git log -p -- .env`) 1 lần để chắc chắn secret thật chưa từng bị commit rồi xoá (không hoàn toàn xoá khỏi lịch sử git).
- **Confidence**: INFERRED (chỉ xác nhận working tree hiện tại, chưa quét toàn bộ lịch sử git).

---

## 7. API SECURITY

### SEC-21 — LOW — CORS mặc định mở (`*`) nếu `CLIENT_URL` chưa cấu hình, kết hợp `credentials: true` (MỚI, Phase 09)
- **Severity**: LOW–MEDIUM
- **Category**: API Security / CORS Misconfiguration
- **Evidence**: `app.ts` — `cors({ origin: process.env.CLIENT_URL, credentials: true, ... })`. Thư viện `cors` khi `options.origin` là `undefined` (biến env chưa set) sẽ fallback về hành vi mặc định phản chiếu `Access-Control-Allow-Origin: *` (do điều kiện nội bộ `!options.origin` đúng khi `origin === undefined`).
- **File**: `backend/src/app.ts`
- **Function**: cấu hình `cors()` middleware
- **Impact**: Nếu biến môi trường `CLIENT_URL` bị thiếu ở 1 môi trường triển khai nào đó (dev/staging quên set), CORS sẽ cho phép MỌI origin gọi API — kết hợp `credentials: true` là cấu hình sai theo spec CORS (`Access-Control-Allow-Origin: *` + `Access-Control-Allow-Credentials: true` bị hầu hết trình duyệt từ chối, nên nhiều khả năng biểu hiện là LỖI CHỨC NĂNG (credentialed request bị browser chặn) hơn là lỗ hổng khai thác được ngay — nhưng vẫn là cấu hình không an toàn/không chủ đích, và với các client KHÔNG dùng credentials (vd gọi bằng token trong header `Authorization`, không dùng cookie — đúng thực tế hệ thống này, SEC không dùng cookie cho token), origin `*` vẫn cho phép bất kỳ website nào gọi API bằng token của victim nếu token bị lộ qua cách khác (giảm nhẹ vì token không nằm trong cookie tự động gửi kèm).
- **Recommendation**: Validate `CLIENT_URL` tồn tại lúc khởi động (tương tự `PORT`/`MONGO_URI`), hoặc set giá trị mặc định an toàn (chặn tất cả) thay vì để `undefined` fallback về mở.
- **Confidence**: CONFIRMED (hành vi thư viện `cors` với `origin: undefined`), mức độ ảnh hưởng thực tế phụ thuộc việc `CLIENT_URL` có luôn được set đúng ở mọi môi trường triển khai hay không — **UNKNOWN** (ngoài phạm vi source-code).

### SEC-22 — LOW — Không có `trust proxy`, ảnh hưởng độ chính xác rate-limit theo IP nếu triển khai sau reverse proxy (MỚI, Phase 09)
- **Severity**: LOW
- **Category**: API Security / Rate Limiting
- **Evidence**: `grep "trust proxy"` trong `app.ts` không có kết quả — Express mặc định `trust proxy: false`.
- **File**: `backend/src/app.ts`
- **Impact**: Nếu ứng dụng chạy sau reverse proxy/load balancer (Nginx, v.v. — kiến trúc phổ biến cho production Node.js), `req.ip` sẽ luôn là IP của proxy, không phải client thật — `express-rate-limit` (dùng IP làm key mặc định) sẽ áp giới hạn CHUNG cho toàn bộ traffic qua proxy đó thay vì per-client, làm giảm hiệu quả rate-limit chống brute-force ở `/api/auths/*` (vô tình có thể khoá nhầm mọi user sau 1 proxy khi 1 người vượt ngưỡng, hoặc ngược lại không giới hạn đúng theo từng client nếu proxy dùng nhiều IP nguồn).
- **Recommendation**: Set `app.set("trust proxy", 1)` (hoặc giá trị phù hợp hạ tầng thật) nếu triển khai sau reverse proxy; xác nhận cấu hình hạ tầng thực tế trước khi áp dụng (không có evidence hạ tầng triển khai thật trong repo — UNKNOWN).
- **Confidence**: CONFIRMED (thiếu cấu hình trong code), mức độ ảnh hưởng phụ thuộc hạ tầng triển khai thật — **UNKNOWN**.

### SEC-23 — LOW — Rò rỉ thông tin lỗi (error message) ra client ở 1 số nhánh lỗi không xác định
- **Severity**: LOW
- **Category**: API Security / Error Leakage
- **Evidence**:
  - `error.middleware.ts` (global handler): nhánh lỗi không xác định (`else`, không phải `ApiError`/`CastError`/`ValidationError`) trả `message: err.message || "Internal Server Error"` — dùng trực tiếp `err.message` gốc thay vì thông điệp chung, có thể lộ chi tiết nội bộ (vd message từ driver MongoDB, thư viện ngoài) nếu 1 lỗi không được bọc `ApiError` đúng cách lọt tới đây.
  - `upload.controller.ts:uploadFiles` — `catch (err:any) { res.status(500).json({ message: err.message }) }` — cùng pattern, riêng lẻ ở domain `upload` (không qua `errorHandler` tập trung).
- **File**: `backend/src/middlewares/error.middleware.ts`, `backend/src/controllers/upload/upload.controller.ts`
- **Impact**: Rủi ro rò rỉ chi tiết hạ tầng/thư viện nội bộ qua thông điệp lỗi (không phải stack trace — stack chỉ log server-side qua `logError()`, không trả về client) — mức độ rò rỉ thấp hơn so với để lộ `stack`, nhưng vẫn là thông tin dư thừa không cần thiết cho client trong trường hợp lỗi ngoài dự kiến.
- **Recommendation**: Với nhánh lỗi không xác định (status 500), trả về thông điệp generic cố định (vd "Đã có lỗi xảy ra") thay vì `err.message` gốc, log chi tiết đầy đủ chỉ ở server. Đồng bộ `upload.controller.ts` theo pattern `ApiError` + `catchAsync` chung của hệ thống (đã ghi nhận từ Phase 03).
- **Confidence**: CONFIRMED.

### SEC-24 — INFO — Rate limiting chỉ áp dụng cho `/api/auths/*`, không có ở các endpoint nhạy cảm khác
- **Severity**: INFO
- **Category**: API Security / Rate Limiting
- **Evidence**: `rateLimit` chỉ mount cho prefix `/api/auths` (`app.ts`) + `authRateLimiter` riêng cho `/login`,`/register`,`/refresh-token`. Không có rate-limit nào cho các endpoint khác (kể cả `PUT /api/users/:id` — liên quan SEC-05, hay các endpoint RBAC nhạy cảm).
- **File**: `backend/src/app.ts`
- **Impact**: Không giới hạn số lần thử với các endpoint khác — vd brute-force dò `roleId` hợp lệ để khai thác SEC-05 không bị chặn tốc độ; không giới hạn tốc độ gọi API nói chung (rủi ro DoS nhẹ, lạm dụng tài nguyên).
- **Recommendation**: Cân nhắc thêm rate-limit tổng quát (theo IP hoặc theo user) cho toàn bộ API, mức ngưỡng cao hơn `/auths` nhưng vẫn giới hạn.
- **Confidence**: CONFIRMED.

---

## 8. DATA SECURITY

### SEC-25 — LOW — Response shape Upload trả "mảng/object trần" — không nhất quán nhưng không có field nhạy cảm dư thừa
- **Severity**: LOW
- **Category**: Data Security / Response Consistency
- **Evidence**: `GET /api/upload`, `GET /api/upload/:id` trả trực tiếp document `Upload` (không wrapper `{success,data}`) — đã ghi nhận Phase 05 §6.2. Đối chiếu lại ở Phase 09: field trả về (`fileName`, `fileUrl`, `mimeType`, `fileSize`, `storage`, `uploadedBy`, `isUsed`, `isDeleted`) không chứa dữ liệu nhạy cảm trực tiếp (không có nội dung file, không có đường dẫn tuyệt đối hệ thống) — rủi ro chủ yếu là tính nhất quán API (đã ghi Phase 05), không phải rò rỉ dữ liệu nhạy cảm.
- **File**: `backend/src/controllers/upload/upload.controller.ts`
- **Confidence**: CONFIRMED (không có sensitive field mới phát hiện).

### SEC-26 — INFO — `User.password` được bảo vệ đúng cách (`select:false`)
- **Severity**: INFO (điểm tốt)
- **Category**: Data Security / Sensitive Fields
- **Evidence**: `password: { type:String, select:false }` trong `user.model.ts` — mọi query `User` mặc định KHÔNG trả field `password`; chỉ `login()` chủ động `.select("+password")` khi cần so sánh — đúng nơi, đúng mục đích duy nhất tìm thấy.
- **File**: `backend/src/models/users/user.model.ts`
- **Impact**: Giảm đáng kể rủi ro vô tình trả password hash ra API response ở các endpoint khác (list/detail user).
- **Confidence**: CONFIRMED.

### SEC-27 — LOW — `console.error`/log không có redaction cho payload nhạy cảm
- **Severity**: LOW
- **Category**: Data Security / Logging
- **Evidence**: `logError()` (`error.middleware.ts`) log `{method, path, status, errorCode, message, stack}` — không log `req.body` nên KHÔNG trực tiếp log password. Tuy nhiên `path`/`req.originalUrl` có thể chứa query string nhạy cảm nếu 1 endpoint nào đó (hiện chưa xác nhận có) truyền token/password qua query string thay vì body — chưa phát hiện trường hợp cụ thể nào trong routes đã đọc (positive, nhưng chưa rà soát 100% 116 endpoint ở mức "có query string nhạy cảm hay không").
- **File**: `backend/src/middlewares/error.middleware.ts`
- **Impact**: Thấp — không có evidence cụ thể về rò rỉ, chỉ là thiếu 1 lớp phòng thủ redaction chủ động nếu sau này có endpoint mới vô tình nhận dữ liệu nhạy cảm qua query string.
- **Recommendation**: Thêm redaction tường minh cho các pattern query string nhạy cảm (token, password) nếu phát sinh trong tương lai; giữ nguyên tắc hiện tại (không log `req.body`).
- **Confidence**: INFERRED (không có evidence vi phạm cụ thể, chỉ là khuyến nghị phòng ngừa).

---

## 9. Bảng tổng hợp Findings

| ID | Severity | Category | Tóm tắt | Confidence |
|---|---|---|---|---|
| SEC-05 | CRITICAL | Authorization | ~~Privilege escalation ADMIN qua `PUT /api/users/:id`~~ — **RESOLVED 2026-08-30** | CONFIRMED |
| SEC-06 | HIGH | Authorization | `POST /api/documents/proposal` thiếu authorization | CONFIRMED |
| SEC-07 | HIGH | Authorization | ABAC/Policy hoàn toàn dead ở runtime | CONFIRMED |
| SEC-13 | HIGH | Injection | NoSQL operator injection qua filter gán trực tiếp (RBAC/Departments/UserAudit) | CONFIRMED (code), INFERRED (khai thác) |
| SEC-01 | MEDIUM | Authentication | Refresh token không rotate + changePassword không revoke | CONFIRMED |
| SEC-08 | MEDIUM | Authorization | Cache permission không invalidate khi đổi role (endpoint thật) | CONFIRMED |
| SEC-14 | MEDIUM | Injection | ReDoS/regex injection không escape (Departments, RBAC) | CONFIRMED |
| SEC-15 | MEDIUM | Injection | CSV Formula/Excel Injection — thiếu neutralize | CONFIRMED (code), UNKNOWN (khai thác) |
| SEC-10 | MEDIUM | Input Validation | 11 route `validateQuery` bị comment out | CONFIRMED |
| SEC-16 | LOW–MEDIUM | File Upload/Path Traversal | `file.originalname` không sanitize trong disk storage | CONFIRMED (code), INFERRED (khai thác) |
| SEC-21 | LOW–MEDIUM | API Security | CORS mở `*` nếu thiếu `CLIENT_URL` + `credentials:true` | CONFIRMED, UNKNOWN (thực tế triển khai) |
| SEC-02 | LOW | Authentication | Password policy yếu (min 5) | CONFIRMED |
| SEC-03 | LOW | Authentication | JWT secret không fail-fast lúc khởi động | CONFIRMED |
| SEC-04 | LOW | Authentication | JWT payload dư thừa role/department | CONFIRMED |
| SEC-09 | LOW | Authorization | `ROLE_PERMISSIONS` không đồng bộ DB thật | CONFIRMED |
| SEC-11 | LOW | Input Validation | Departments/RBAC thiếu validateParams/Body | CONFIRMED |
| SEC-12 | LOW | Input Validation | `delete-by-month` thiếu validateBody | CONFIRMED |
| SEC-17 | LOW | File Upload | Type check chỉ dựa MIME/extension client cung cấp | CONFIRMED |
| SEC-22 | LOW | API Security | Thiếu `trust proxy` | CONFIRMED, UNKNOWN (hạ tầng) |
| SEC-23 | LOW | API Security | Rò rỉ `err.message` ở nhánh lỗi không xác định | CONFIRMED |
| SEC-25 | LOW | Data Security | Response Upload không nhất quán (không sensitive) | CONFIRMED |
| SEC-27 | LOW | Data Security | Log thiếu redaction chủ động (chưa có evidence vi phạm) | INFERRED |
| SEC-18 | INFO | File Upload | Rác file mồ côi tiềm năng | CONFIRMED/INFERRED |
| SEC-19 | INFO | Secrets | Không phát hiện secret hard-code (tích cực) | CONFIRMED |
| SEC-20 | INFO | Secrets | `.env` không commit (chỉ xác nhận working tree) | INFERRED |
| SEC-24 | INFO | API Security | Rate limit chỉ áp dụng `/api/auths/*` | CONFIRMED |
| SEC-26 | INFO | Data Security | `User.password` bảo vệ đúng cách (tích cực) | CONFIRMED |

---

## 10. Điểm thiết kế bảo mật tốt (đối trọng, để khách quan)

- Chống account enumeration + timing attack nhất quán ở `login`/`forgotPassword`.
- Whitelist thuật toán JWT (`HS256`) tường minh ở cả access/refresh verify.
- `authenticate` luôn load `isActive` mới nhất mỗi request — vô hiệu hoá user có hiệu lực ngay lập tức.
- `Policycondition.evaluator.ts` (dù dead ở runtime) tự viết tokenizer/parser, không dùng `eval`/`Function` — thiết kế đúng chống RCE nếu sau này được kích hoạt.
- `documents.mapper.ts:buildDocumentFilter` dùng whitelist field cứng — mẫu hình tốt nên nhân rộng sang RBAC/Departments/UserAudit (liên quan SEC-13).
- `documents.mapper.ts:escapeRegex` — mẫu hình tốt nên nhân rộng (liên quan SEC-14).
- `User.password` có `select:false` — chống lộ hash qua API mặc định.
- `.env.example` không chứa giá trị thật; không phát hiện secret hard-code trong source.
- Email template (`forgotPassword.ejs`) chỉ dùng `<%= %>` (escaped output), không dùng `<%- %>` — không có template injection/XSS qua email.
- `logout()` chỉ tự thu hồi token của chính mình (đã vá lỗ hổng revoke token người khác).
- Global error handler tách bạch: log đầy đủ (kể cả `stack`) chỉ ở server, không trả `stack` về client (chỉ còn gap nhỏ ở `err.message`, xem SEC-23).

---

## 11. Unknowns (chuyển sang phase sau / cần xác minh thêm)

- Mức độ khai thác thực tế của SEC-13 (NoSQL operator injection) — cần test runtime với `qs`/Express thực tế (ngoài phạm vi "không exploit" của Phase 09).
- Dữ liệu Role/Permission thật trong MongoDB — role nào thực sự có `USER_UPDATE` (ảnh hưởng trực tiếp mức độ nghiêm trọng thực tế của SEC-05) — carry-over Phase 07.
- `CLIENT_URL` có luôn được set đúng ở mọi môi trường triển khai thật hay không (SEC-21) — ngoài phạm vi source code.
- Cấu hình hạ tầng triển khai thật (có đứng sau reverse proxy hay không — SEC-22; MongoDB có phải replica set hay không — carry-over Phase 02/04/08).
- `note` field trong `UserAudit` có bao giờ chứa input người dùng thô (ảnh hưởng mức độ SEC-15) hay chỉ luôn là chuỗi hệ thống tạo sẵn — chưa rà soát toàn bộ nơi ghi `UserAudit.note`.
- Toàn bộ lịch sử git có từng chứa `.env` thật đã bị xoá hay chưa (SEC-20) — chưa quét.
- Nội dung `mongodb-transaction-setup-guide.md`, `DANH-GIA-TONG-THE.md`, `luong-du-lieu-DMS.html` — vẫn UNKNOWN xuyên suốt từ Phase 01, ngoài phạm vi Phase 09.

---

**PHASE 09 COMPLETED**
