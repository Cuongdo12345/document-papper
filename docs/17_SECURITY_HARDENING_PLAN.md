# Phase 17 — Security Hardening Plan

> Ngày: 2026-08-31. Source-code-based security review + hardening plan. KHÔNG exploit hệ thống, KHÔNG penetration testing, KHÔNG sửa source trong phase này.
>
> **Nguồn đã đọc**: `CLAUDE.md`, `SKILL.md`, `docs/00_PROJECT_MEMORY.md`, `docs/09_SECURITY_ANALYSIS.md` (toàn văn, Phase 09 gốc — 27 finding SEC-01→27), `docs/07_AUTH_RBAC_ANALYSIS.md` (toàn văn, Phase 07 gốc), `docs/12_ISSUES_AND_RISKS.md` (TOP 10 + risk matrix, đã đọc ở Phase 14), `docs/14_ANALYSIS_AUDIT.md` (toàn văn, tự viết trước đó). Không đọc lại `05_API_ANALYSIS.md`/`03_BACKEND_ANALYSIS.md` toàn văn (đã đọc đầy đủ ở Phase 15, nội dung liên quan security đã có trong `docs/20_GLOBAL_SECURITY_REVIEW.md`).
>
> **Quan hệ với `docs/20_GLOBAL_SECURITY_REVIEW.md`** (đã có sẵn, viết 2026-08-31 trước phase này): tài liệu đó là bản TỔNG HỢP toàn bộ security finding từ 16 module review, tổ chức theo severity + mục lục chéo theo trọng tâm nghiệp vụ. Phase 17 này VIẾT LẠI theo đúng cấu trúc 18-mục được yêu cầu (theo trục kỹ thuật: Authentication/Authorization/RBAC/Input/API/File/Data/Secret/Audit), dùng format finding CHUẨN MỚI (`SEC-XXX` kèm field `Attack Preconditions`), và bổ sung 1 số finding hoàn thiện hoá format so với `20_GLOBAL_SECURITY_REVIEW.md`. Không tạo trùng lặp nội dung — finding trùng dùng LẠI ID gốc từ Phase 09 (`SEC-01→27`); finding chỉ có ID `RVxx-yy` ở nguồn cũ được CẤP ID MỚI chính thức (`SEC-28→42`) trong tài liệu này.

---

## 1. Objective

Rà soát bảo mật dựa trên source code hiện tại theo 9 trục: Authentication, Authorization, RBAC, Input Validation, API Security, File Security, Data Security, Secret Management, Audit Logging — xác nhận lại toàn bộ finding đã CONFIRMED trước đó, KHÔNG tạo finding trùng lặp, và biên soạn thành 1 kế hoạch hardening có thứ tự ưu tiên rõ ràng (severity + attack preconditions), phục vụ làm input cho việc lên TASK sửa lỗi sau này (KHÔNG sửa trong phase này).

---

## 2. Security Architecture

Không đổi so với Phase 02/07/09, xác nhận lại ở `14_ANALYSIS_AUDIT.md` Mục 9-10:

```
Request → helmet() → cors() → express.json(10mb) → cookieParser() [wired nhưng KHÔNG dùng — mục 3.5]
  → rateLimit (chỉ /api/auths) → performanceMiddleware
  → Route → authenticate (JWT verify, load User mới nhất từ DB mỗi request)
    → authorizePermission (Super-Admin string-bypass → RBAC cache → ABAC fallback [DEAD — mục 5])
      → validateBody/Params/Query (Zod, KHÔNG áp dụng đồng đều — mục 6)
        → Controller → Service (business rule + department-scoping RẢI RÁC, không tập trung)
          → Model → MongoDB
```

**Đặc điểm bảo mật cốt lõi**: JWT stateless (không session server-side, không cookie cho token — `cookieParser()` là dead middleware); `bcrypt` cost 10 nhất quán; whitelist thuật toán JWT (`HS256`) tường minh; RBAC hoạt động đầy đủ nhưng ABAC (thiết kế cho resource-level/department-scoping authorization) **chết hoàn toàn ở runtime** — đây là root cause của phần lớn finding Authorization/RBAC trong tài liệu này.

---

## 3. Authentication Review

Trace: `Request → Authentication → User → Token → Middleware` (theo đúng yêu cầu Bước 2).

| Hạng mục | Trạng thái | Evidence |
|---|---|---|
| Login | Chống enumeration + timing attack nhất quán (dummy `bcrypt.compare` khi user không tồn tại) | `07_AUTH_RBAC_ANALYSIS.md` Mục 2, `09_SECURITY_ANALYSIS.md` §1 (đối trọng tích cực) |
| Password hashing | `bcrypt` cost 10, nhất quán ở register/changePassword/resetPassword | Mục 1 |
| JWT access token | `HS256` whitelist, exp 8h, payload dư thừa (`role`/`department` object dù `authenticate` không đọc) | `07_AUTH_RBAC_ANALYSIS.md` §3.1 → `SEC-04` |
| JWT refresh token | `HS256` whitelist, exp 7 ngày, lưu bản ghi DB (revocable) nhưng **KHÔNG rotate** | §3.2 → `SEC-01` |
| Token expiration | Access token: JWT stateless, không blacklist — vẫn hợp lệ tới hết hạn dù logout/disable (chuẩn JWT, không phải lỗ hổng riêng vì `authenticate` luôn re-check `isActive` từ DB) | §3.3 |
| Token rotation | KHÔNG có — refresh token dùng lại tới khi hết hạn/bị revoke | §3.2 → `SEC-01` |
| Logout | Chỉ tự revoke token của chính mình (đã vá lỗ hổng revoke-hộ) | §3.3 (đối trọng tích cực) |
| Password reset | Thiết kế TỐT — hash token SHA-256, TTL index, rate-limit DB-based, chống enumeration | `09_SECURITY_ANALYSIS.md` §1 |
| Session handling | Không session server-side, stateless JWT chuẩn | §3.4 |

**Finding chính** (chi tiết đầy đủ ở Mục 12-15): `SEC-01` (refresh không rotate + `changePassword` không revoke), `SEC-02` (password policy yếu `min(5)`), `SEC-03` (JWT secret không fail-fast), `SEC-04` (JWT payload dư thừa). Không phát hiện finding MỚI ở Authentication so với Phase 07/09 — 4 finding trên vẫn CONFIRMED, không đổi (`14_ANALYSIS_AUDIT.md` Mục 9).

---

## 4. Authorization Review

Trace: `User → Role → Permission → Resource → Authorization → Controller → Service`.

**Nguyên tắc đã kiểm chứng**: KHÔNG mặc định Authenticated = Authorized — xác nhận `authorizePermission` LUÔN chạy sau `authenticate` ở 103/116 endpoint; 13 endpoint còn lại là `authenticated-only` có chủ đích (vd `/notifications/*` — ownership theo `recipient` enforce ở service, không phải thiếu sót) hoặc `public` (5 route `/auths/*`).

### 4.1 Privilege Escalation

| Finding | Trạng thái |
|---|---|
| `PUT /api/users/:id` → gán role ADMIN | ✅ **RESOLVED** (TASK-001, `SEC-05`) |
| `resetPassword()` (Users, admin reset hộ) thiếu safeguard chặn ADMIN | **OPEN** — `SEC-29` (Mục 13) |
| Rename Role thành `"ADMIN"` → backdoor persistence | **OPEN, CRITICAL** — `SEC-28` (Mục 12) |

### 4.2 Missing/Incorrect Permission

| Finding | Trạng thái |
|---|---|
| `POST /documents/proposal` thiếu `authorizePermission` | **OPEN** — `SEC-06` |
| `GET /performances/dashboard` không có bất kỳ authorization nào (Phase 05 gốc ghi SAI là có check `role===ADMIN` — đã đính chính ở `14_ANALYSIS_AUDIT.md` Mục 19.1) | **OPEN, MỚI FORMALIZE** — `SEC-37` (Mục 13) |
| 3 route dùng permission string KHÔNG tồn tại trong catalog (`USER_READ`, `USER_DETAIL`, `DOCUMENT_DETAIL`) | **OPEN** — `SEC-38` (Mục 14) |

### 4.3 Admin-only endpoint

Chỉ 1 vị trí check `role.name==="ADMIN"` cứng trong controller thay vì qua `authorizePermission` (`GET /performances/dashboard` — Phase 05 gốc ghi SAI, thực tế KHÔNG CÓ check nào — xem `SEC-37`); `POST /export/export-documents-excel` cũng check cứng nhưng CHỈ để quyết định phạm vi filter department, không phải chặn truy cập (đúng thiết kế, không phải finding).

### 4.4 Department access / Resource ownership / IDOR-BOLA

Đây là nhóm finding LỚN NHẤT về Authorization, root cause chung: **ABAC dead** (Mục 5) khiến mỗi domain tự làm scoping khác nhau:

| Domain | Trạng thái scoping |
|---|---|
| Documents | Update CÓ check `callerDepartment`; Read (List/Detail) KHÔNG có → bất đối xứng | `SEC-34` (=`RV05-04`, Mục 13) |
| Assets | KHÔNG có scoping ở BẤT KỲ đâu (Read lẫn Assignment) — UNKNOWN có phải chủ đích "quản lý tập trung" | `RV06-04` (Mục 14, MEDIUM — POTENTIAL RISK) |
| Dashboard | 11/12 endpoint không scoping, chỉ `admin-summary` có check nghiêm ngặt | `RV07-01` (Mục 14) |
| **Upload** | Chuỗi IDOR đầy đủ — không owner, không ownership check ở Read/Delete | `SEC-30→33` (Mục 13, HIGH×4) |

### 4.5 Frontend guard vs backend authorization

**N/A** — không có frontend trong repo (xác nhận `06_FRONTEND_ANALYSIS.md` không tồn tại, `14_ANALYSIS_AUDIT.md` Mục 8). Toàn bộ authorization thực thi CHỈ ở backend — không có rủi ro "chỉ ẩn UI mà không chặn API" vì không có UI nào để kiểm tra.

---

## 5. RBAC Review

- **Công thức hiệu lực CONFIRMED đúng**: `finalPermissions = (role.permissions ∪ extraPermissions) − denyPermissions`.
- **`denyPermissions` vô tác dụng với ADMIN** — bypass chạy TRƯỚC khi đọc deny list (`RV02-02`, MEDIUM — inconsistency, không phải bug mới nhưng chưa từng ghi cụ thể trước REVIEW-02).
- **2 lớp nguồn permission không đồng bộ**: `permission.constant.ts` (code) vs `Permission` collection (DB thật) — không cầu nối tự động; `ROLE_PERMISSIONS`/`rolePermission.map.ts` viết cho 1 script seed KHÔNG TỒN TẠI (`SEC-09`).
- **ABAC/Policy — CHẾT HOÀN TOÀN Ở RUNTIME** (`SEC-07`/ISS-03): 103/103 lệnh gọi `authorizePermission()` không truyền `enablePolicies`/`resource`/`action`; `loadDocument.middleware.ts` (middleware DUY NHẤT gán `req.resource`) không gắn route nào. Đây là **dead-code lớn nhất toàn dự án** — cả 1 tầng kiến trúc hoàn chỉnh (Policy model + evaluator 319 dòng chống RCE + CRUD API) không có đường vào thực thi. Vẫn có bề mặt tấn công SỐNG dù dead: `Policy.find({resource,action})` bị NoSQL injection risk nếu ABAC được bật nhầm trong tương lai mà không sửa `RV02-03` trước (Mục 14).
- **Rename Role thành "ADMIN"** — `SEC-28` (Mục 12, CRITICAL) — lỗ hổng RBAC nghiêm trọng nhất hiện còn mở.

---

## 6. Input Validation

- **11-13 route có `validateQuery` bị comment** (Documents, Workflow pending, Users, RBAC×3, UserAudit×3, Notifications, Assets×2, AssetCategory) — `SEC-10`. Hệ quả: (a) bug pagination 3 domain (Documents/Users/Notifications), (b) mở đường cho `SEC-13`/`SEC-14`.
- **NoSQL operator injection** (`SEC-13`, ISS-04) — gán thẳng query string vào Mongo filter không ép kiểu `string`, không middleware sanitize (`express-mongo-sanitize` không tồn tại trong dependencies) — RBAC/Departments/UserAudit/Users list.
- **ReDoS/regex injection** (`SEC-14`) — `$regex` không escape ở Departments/RBAC — MỞ RỘNG PHẠM VI: `RV06-02` xác nhận cùng vấn đề ở Asset/AssetCategory (bề mặt rộng hơn vì chỉ cần `ASSET_VIEW`).
- **Mass assignment**: KHÔNG phát hiện — mọi domain đã review dùng whitelist tường minh (`buildDocumentFilter`, `ASSET_UPDATE_WHITELIST`, `DOCUMENT_UPDATE_WHITELIST`) trừ 1 ngoại lệ đã biết: `SEC-35` (`RV06-01`, `isActive` lọt qua whitelist Asset — Mục 13).
- **Departments — thiếu validate hoàn toàn** (`SEC-11`) — không `validateBody`/`validateParams` ở bất kỳ route nào.
- **Path traversal** — `SEC-16` (`file.originalname` không sanitize trong disk storage).
- **XSS/HTML injection** — không áp dụng trực tiếp cho API JSON responses (không render HTML phía server cho client thông thường), NHƯNG có 2 vị trí email template không escape: `SEC-39` (`RV10-02`, notification email) và `SEC-40` (`13_SHARED` #3, password-reset email) — Mục 14.

---

## 7. API Security

- **CORS**: `SEC-21` — fallback `*` khi thiếu `CLIENT_URL`, kết hợp `credentials:true`.
- **Authentication/Authorization**: xem Mục 4.
- **Rate limiting**: chỉ `/api/auths/*` (`SEC-24`, INFO); `SEC-22` — thiếu `trust proxy`, ảnh hưởng độ chính xác rate-limit sau reverse proxy.
- **Error leakage**: `SEC-23` — `err.message` thô ở nhánh 500 không xác định (`error.middleware.ts` + `upload.controller.ts` độc lập).
- **Sensitive response**: `SEC-25` (Upload response shape không nhất quán, không có field nhạy cảm thật); `SEC-26` (positive — `password: select:false`).
- **Status codes**: đa số nhất quán qua `ApiError`; ngoại lệ `upload.controller.ts` tự viết status thủ công.
- **So sánh với OpenAPI**: `15_API_CONTRACT_REVIEW.md` xác nhận 100% khớp path/method/auth-type, nhưng phát hiện `SEC-38` (3 permission string sai) chỉ lộ ra khi đối chiếu chéo route code với `permission.constant.ts` — không phải mismatch giữa OpenAPI và route (cả 2 CÙNG SAI).

---

## 8. File Security

Trace: Upload → Download → Import → Export.

| Hạng mục | `/api/upload` (domain chung) | Excel Import/Export | Medical Device Certificate |
|---|---|---|---|
| MIME/extension validation | **KHÔNG CÓ** (`allowedTypes` không truyền — `SEC-30`) | Có (`.xlsx`/`.xls`, memory storage) | Có (PDF/JPEG/PNG whitelist) |
| File size | Không giới hạn riêng ở `/api/upload` (UNKNOWN giới hạn mặc định `createUploader`) | 5MB | ≤10MB |
| Filename | `${Date.now()}-${originalname}` — KHÔNG sanitize (`SEC-16`, path traversal tiềm năng) | N/A (memory, không ghi tên gốc ra disk) | Cùng pattern `SEC-16` |
| Storage | Local disk `backend/uploads/` | Memory (không ghi disk) | Local disk |
| Access control (ownership) | **KHÔNG CÓ** — chuỗi `SEC-31→33` | N/A | N/A (chỉ 1 chủ sở hữu logic — device) |
| Cleanup (file mồ côi) | Không có job dọn định kỳ (`SEC-18`, INFO) | N/A | Có cơ chế `committed` flag tinh vi (positive, `RV06-09`) |
| Streaming | N/A (nhận file nhỏ) | Export dùng `exportDocumentsExcelPRO` streaming tốt | N/A |
| Memory usage | Disk storage — không giữ RAM lâu | Memory storage — giới hạn 5MB hợp lý | Disk storage |
| **Truy cập qua HTTP** | **KHÔNG CÓ `express.static`** — file lưu nhưng không serve được (`SEC-16`/`RV00-01`, giảm nhẹ tác động IDOR nhưng phụ thuộc hạ tầng ngoài repo — UNKNOWN) | N/A | Cùng vấn đề |

**Kết luận Mục 8**: domain `/api/upload` là bề mặt tấn công YẾU NHẤT hệ thống về File Security — 4 finding HIGH liên kết chuỗi nhân-quả (`SEC-30→33`, chi tiết Mục 13).

---

## 9. Data Security

- `User.password` có `select:false` — không lộ hash qua API mặc định (`SEC-26`, positive).
- Response Upload không có field nhạy cảm thật (`SEC-25`).
- CSV Export Formula Injection (`SEC-15`) — `escapeCsvField` không neutralize `=`/`+`/`-`/`@`.
- Không phát hiện response nào trả `password`/secret thật ở bất kỳ endpoint đã review.
- `MedicalDeviceProfile`/`CalibrationRecord` mồ côi vĩnh viễn khi hard-delete Asset (`RV16-01`, Mục 14 — MEDIUM, data-integrity, không phải rò rỉ dữ liệu nhưng là mất khả năng kiểm soát dữ liệu lịch sử thiết bị y tế).

---

## 10. Secret Management

- **Không phát hiện secret hard-code** trong source (`SEC-19`, grep pattern chuẩn không có kết quả).
- `.env` không commit vào repo (`SEC-20`, chỉ xác nhận working-tree hiện tại, chưa quét toàn bộ lịch sử git).
- `DUMMY_PASSWORD_HASH` — bcrypt hash công khai vô hại dùng chống timing attack, KHÔNG phải secret rò rỉ.
- `JWT_SECRET`/`JWT_REFRESH_SECRET` không validate tồn tại lúc bootstrap (`SEC-03`) — không phải rò rỉ, nhưng là configuration risk.
- **Refresh token lưu PLAINTEXT trong DB** (`RV01-02`, MEDIUM-HIGH, Mục 14) — khác `PasswordResetToken` đã hash SHA-256 — nếu DB bị lộ, token dùng được ngay không cần crack.
- Không có evidence secret bị log ra console/error response (`SEC-27`, INFO — chỉ khuyến nghị phòng ngừa, chưa có vi phạm cụ thể).

---

## 11. Audit Logging

| Hành động | Có audit log? |
|---|---|
| User changes (create/update/disable/restore) | CÓ (`UserAudit`, action enum đầy đủ) |
| Permission changes | Gián tiếp qua `UserAudit` khi đổi role user; KHÔNG có audit riêng cho thay đổi `Role.permissions`/`Permission` CRUD |
| Document changes | CÓ (`UserAudit` dùng chung, không tách riêng theo entity — `RV04-06` MEDIUM về khả năng truy vết) |
| Delete actions | Document (soft-delete có audit); Asset/Department — CHƯA xác nhận đầy đủ có audit riêng hay không (ngoài phạm vi rà soát sâu ở phase này) |
| Security-sensitive operations (ADMIN bypass) | CÓ, best-effort qua `UserAudit.create`, action tái dùng `AUDIT_DASHBOARD_VIEW` thay vì action riêng `ADMIN_BYPASS` dù enum đã định nghĩa field này (`07_AUTH_RBAC_ANALYSIS.md` §5.2 — gap nhỏ, không ảnh hưởng bảo mật trực tiếp, chỉ ảnh hưởng khả năng lọc log theo đúng loại sự kiện) |
| Login/Logout | CÓ (action `LOGIN` — chưa xác nhận có action `LOGOUT` tương ứng ghi log, ngoài phạm vi rà soát sâu ở phase này — **UNKNOWN**, cần xác nhận riêng nếu cần) |

**Nhận xét chung**: hệ thống audit dựa hoàn toàn vào 1 model dùng chung (`UserAudit`) cho MỌI loại hành động (không chỉ User) — thiết kế "polymorphic nhẹ" (field `note` free-text mang thông tin domain khác) làm giảm khả năng truy vấn có cấu trúc theo entity bị tác động (đã ghi nhận `RV04-06`, không phải lỗ hổng bảo mật mà là hạn chế observability).

---

## 12. Critical Findings

### SEC-28 — Rename Role thành `"ADMIN"` tạo backdoor persistence toàn quyền

- **Severity**: CRITICAL
- **Category**: Authorization / RBAC / Privilege Escalation
- **File**: `backend/src/services/rbac/rbac.service.ts`
- **Function/Class**: `updateRoleService()`
- **Observed Behavior**: Không có bất kỳ guard nào chặn đổi `Role.name` thành/khỏi chuỗi `"ADMIN"`.
- **Evidence**: `docs/module-reviews/02_RBAC_CODE_REVIEW.md` (`RV02-01`) — cơ chế Super-Admin bypass ở `authorizePermission.middleware.ts` chỉ so khớp CHUỖI `role.name === "ADMIN"`, không so `_id`/cờ hệ thống riêng; unique index trên `name` không chặn được thao tác đổi tên tuần tự (đổi role ADMIN gốc sang tên khác, rồi đổi 1 role khác thành "ADMIN").
- **Impact**: Backdoor persistence — kể cả sau khi tài khoản ADMIN gốc bị thu hồi quyền, role "ADMIN" bí mật tạo ra vẫn cấp bypass đầy đủ vĩnh viễn cho bất kỳ user nào được gán role đó.
- **Attack Preconditions**: Kẻ tấn công (hoặc insider) cần có permission `ROLE_UPDATE`. Xác minh read-only trên DB dev: hiện chỉ Role `ADMIN` giữ `ROLE_UPDATE` (precondition KHÓ đạt được trên DB đã kiểm tra) — **KHÔNG xác nhận được cho production** (UNKNOWN).
- **Recommendation**: Tách cơ chế bypass khỏi so khớp chuỗi `name` — dùng cờ hệ thống bất biến (`isSystemRole`, không expose qua `UpdateRoleDTO`) hoặc `_id` cố định; chặn `updateRoleService()` đổi tên role hệ thống hoặc đổi tên role khác thành `"ADMIN"`. Kế hoạch chi tiết: `docs/16_REFACTORING_PLAN.md` REF-001.
- **Confidence**: HIGH (evidence code trực tiếp, xác minh 2 lần độc lập qua REVIEW-02 và Global Security Review).

---

## 13. High Findings

### SEC-29 — `resetPassword()` (Users, admin reset hộ) thiếu safeguard chặn ADMIN

- **Severity**: HIGH (impact CRITICAL nếu bị khai thác)
- **Category**: Authorization / Account Takeover
- **File**: `backend/src/services/users/users.service.ts`
- **Function/Class**: `resetPassword()` (admin reset mật khẩu hộ user khác — KHÁC `AuthService.resetPassword` self-service qua email)
- **Observed Behavior**: Docstring hàm mô tả rõ "Nếu role là ADMIN => không cho reset password" nhưng code không có dòng nào thực hiện check này — khác `disable()` cùng file (CÓ check tương đương).
- **Evidence**: `docs/module-reviews/03_USERS_CODE_REVIEW.md` (`RV03-01`).
- **Impact**: Nếu `USER_RESET_PASSWORD` được cấp cho role không phải ADMIN (kịch bản phổ biến — IT/helpdesk), người đó đặt lại mật khẩu ADMIN rồi đăng nhập — account takeover hoàn chỉnh.
- **Attack Preconditions**: Cần permission `USER_RESET_PASSWORD`. Xác minh DB dev: hiện chỉ ADMIN giữ quyền này (an toàn tạm thời trên DB đã kiểm tra) — **UNKNOWN cho production**.
- **Recommendation**: Bổ sung check `role.name === "ADMIN"` → throw, đúng docstring. Kế hoạch: `16_REFACTORING_PLAN.md` REF-005.
- **Confidence**: HIGH.

### SEC-30 — `POST /api/upload` chấp nhận MỌI loại file (không giới hạn type)

- **Severity**: HIGH
- **Category**: File Security / Upload
- **File**: `backend/src/services/upload/upload.middleware.ts` (call site `createUploader()`)
- **Function/Class**: route factory `createUploader()` được gọi KHÔNG truyền `allowedTypes`
- **Observed Behavior**: `certificateUploader` (Calibration, domain khác) gọi ĐÚNG với `allowedTypes` tường minh — chứng minh `createUploader` bản thân không có vấn đề, chỉ route `/api/upload` quên truyền tham số.
- **Evidence**: `docs/module-reviews/09_UPLOAD_CODE_REVIEW.md` (`RV09-01`).
- **Impact**: Client upload được file thực thi/script đội lốt bất kỳ extension nào — rủi ro tăng cao nếu kết hợp với hạ tầng serve tĩnh `backend/uploads/` (UNKNOWN, ngoài phạm vi source).
- **Attack Preconditions**: Chỉ cần permission `UPLOAD_FILES` (phổ biến, không phải quyền admin).
- **Recommendation**: Truyền `allowedTypes` tường minh cho `/api/upload`, cùng chuẩn `certificateUploader`.
- **Confidence**: HIGH.

### SEC-31 — File upload qua `/api/upload` không có chủ sở hữu (`uploadedBy` không bao giờ được set)

- **Severity**: HIGH
- **Category**: File Security / Data Integrity
- **File**: `backend/src/services/upload/upload.service.ts`
- **Function/Class**: `saveFilesToDB`
- **Observed Behavior**: Model `Upload` có field `uploadedBy` nhưng `saveFilesToDB` không bao giờ set giá trị này dù `req.user` sẵn có ở controller.
- **Evidence**: `RV09-02`.
- **Impact**: Tiền đề trực tiếp của `SEC-32`/`SEC-33` — không thể phân biệt file thuộc về ai, không thể enforce ownership.
- **Attack Preconditions**: Không cần điều kiện đặc biệt — xảy ra với MỌI lần upload.
- **Recommendation**: `saveFilesToDB` nhận và lưu `uploadedBy` từ `req.user._id`.
- **Confidence**: HIGH.

### SEC-32 — `GET /api/upload` trả về TOÀN BỘ file mọi user, không filter, không phân trang

- **Severity**: HIGH
- **Category**: File Security / IDOR-BOLA
- **File**: `backend/src/services/upload/upload.service.ts`, `backend/src/controllers/upload/upload.controller.ts`
- **Function/Class**: `getFiles`
- **Observed Behavior**: Không filter theo `uploadedBy`, không phân trang.
- **Evidence**: `RV09-03`.
- **Impact**: Bất kỳ user có `VIEW_FILES` liệt kê được toàn bộ file trong hệ thống (metadata: tên file, kích thước, người upload nếu `SEC-31` được fix, thời gian).
- **Attack Preconditions**: Chỉ cần permission `VIEW_FILES`.
- **Recommendation**: Filter theo `uploadedBy` (trừ Admin) + phân trang.
- **Confidence**: HIGH.

### SEC-33 — `GET/DELETE /api/upload/:id` — IDOR đầy đủ, không check ownership

- **Severity**: HIGH
- **Category**: File Security / IDOR-BOLA
- **File**: `backend/src/services/upload/upload.service.ts`
- **Function/Class**: `getFileDetail`, `deleteFile`
- **Observed Behavior**: Không có so sánh `uploadedBy` với `req.user._id` trước khi trả chi tiết/xoá.
- **Evidence**: `RV09-04`.
- **Impact**: User có `DELETE_FILE` xoá được file của BẤT KỲ ai khác, không cần liên quan gì tới file đó.
- **Attack Preconditions**: Cần biết/đoán được `:id` (ObjectId — không dễ đoán ngẫu nhiên nhưng có thể lộ qua `SEC-32`) + có permission `DELETE_FILE`/`VIEW_FILE_DETAIL`.
- **Recommendation**: Check `upload.uploadedBy.toString() === req.user._id.toString()` (trừ Admin) trước khi trả/xoá.
- **Confidence**: HIGH.

### SEC-34 — Không có department-scoping khi ĐỌC Document (List/Detail), dù CÓ khi SỬA

- **Severity**: HIGH
- **Category**: Authorization / IDOR-BOLA / Data Exposure
- **File**: `backend/src/services/documents/document.service.ts`
- **Function/Class**: `getAllDocumentsService`, `getDocumentDetailService` (đối chứng `updateDocumentService` — CÓ check `callerDepartment`)
- **Observed Behavior**: 2 hàm Read không nhận/so sánh `callerDepartment`/`isAdmin` từ caller.
- **Evidence**: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` (`RV05-04`).
- **Impact**: User có `DOCUMENT_VIEW`/`DOCUMENT_VIEW_DETAIL` (permission cấp hệ thống) xem được TOÀN BỘ document mọi phòng ban — rò rỉ dữ liệu liên phòng ban (đề xuất mua sắm, biên bản hư hỏng, `actualCost`).
- **Attack Preconditions**: Chỉ cần `DOCUMENT_VIEW`/`DOCUMENT_VIEW_DETAIL` — permission phổ biến, không phân biệt phòng ban theo thiết kế RBAC hiện tại.
- **Recommendation**: Xác nhận chủ đích nghiệp vụ (UNKNOWN — có thể là "xem toàn hệ thống, chỉ chặn sửa theo phòng ban" hợp lý); nếu không, bổ sung filter theo `callerDepartment` khi user không phải Admin.
- **Confidence**: HIGH (evidence code), INFERRED (có phải bug theo ý định ban đầu hay không).

### SEC-35 — `PUT /assets/:id` bỏ qua guard soft-delete qua field `isActive` lọt whitelist

- **Severity**: HIGH
- **Category**: Authorization / Business Logic Bypass
- **File**: `backend/src/dto/assets/assets.dto.ts`, `backend/src/services/assets/assets.constants.ts`, `backend/src/services/assets/assetDevice/asset.service.ts`
- **Function/Class**: `UpdateAssetDTO`, `ASSET_UPDATE_WHITELIST`, `updateAssetService`
- **Observed Behavior**: `isActive` KHÔNG bị loại trừ khỏi DTO/whitelist (khác `status`/`assignedTo`/`department` — bị loại trừ đúng chủ đích) — `PUT /assets/:id` (chỉ cần `ASSET_UPDATE`) set `isActive:false` trực tiếp, bỏ qua guard trạng thái của `deleteAssetService` và permission riêng `ASSET_DELETE`.
- **Evidence**: `docs/module-reviews/06_ASSETS_CODE_REVIEW.md` (`RV06-01`).
- **Impact**: 1 user chỉ có `ASSET_UPDATE` (không cần `ASSET_DELETE`) vô hiệu hoá được Asset đang `IN_USE`/`UNDER_MAINTENANCE` — bỏ qua đúng điều kiện `deleteAssetService` cố tình chặn; dữ liệu audit không nhất quán (`deletedAt`/`deletedBy` không được set).
- **Attack Preconditions**: Chỉ cần `ASSET_UPDATE` (không cần `ASSET_DELETE`).
- **Recommendation**: Loại `isActive` khỏi `ASSET_UPDATE_WHITELIST`/`UpdateAssetDTO`.
- **Confidence**: HIGH.

### SEC-36 — Regex injection/ReDoS không escape ở nhiều domain (Departments, RBAC, Assets)

- **Severity**: HIGH (mở rộng phạm vi từ `SEC-14` gốc MEDIUM — nâng vì bề mặt tấn công Asset rộng hơn dự kiến)
- **Category**: Injection (ReDoS)
- **File**: `backend/src/services/departments/departments.service.ts`, `backend/src/services/rbac/rbac.service.ts`, `backend/src/services/assets/assetDevice/asset.service.ts`, `backend/src/services/assets/assetDevice/assetCategory.service.ts`
- **Function/Class**: `getAllDepartmentsService`, `getRoleService`/`getPermissionService`/`getPolicieService`, `getAllAssetsService`, `getAllAssetCategoriesService`
- **Observed Behavior**: `$regex: keyword` không qua `escapeRegex` — khác domain Documents (đã có `escapeRegex` ở `documents.mapper.ts`).
- **Evidence**: `09_SECURITY_ANALYSIS.md` SEC-14, mở rộng bởi `docs/module-reviews/06_ASSETS_CODE_REVIEW.md` (`RV06-02`).
- **Impact**: Client gửi pattern catastrophic-backtracking gây CPU cao khi MongoDB evaluate.
- **Attack Preconditions**: Domain Asset chỉ cần `ASSET_VIEW` (permission phổ biến nhất trong nhóm bị ảnh hưởng) — bề mặt tấn công rộng hơn Departments/RBAC.
- **Recommendation**: Áp dụng `escapeRegex` (đã có sẵn) cho mọi nơi dùng `$regex` với input client.
- **Confidence**: HIGH.

### SEC-37 — `GET /api/performances/dashboard` không có bất kỳ authorization check nào (đính chính từ Phase 05)

- **Severity**: HIGH
- **Category**: Authorization / Sensitive Data
- **File**: route + controller performance dashboard
- **Function/Class**: performance dashboard handler
- **Observed Behavior**: Chỉ `authenticate`, KHÔNG `authorizePermission`. Permission `PERFORMANCE_VIEW` được nhắc trong comment nhưng CHƯA TỪNG định nghĩa trong `permission.constant.ts`.
- **Evidence**: `docs/module-reviews/11_PERFORMANCE_CODE_REVIEW.md` (`RV11-01`) — **ĐÍNH CHÍNH quan trọng**: `docs/05_API_ANALYSIS.md` (Phase 05, lịch sử) từng ghi SAI rằng endpoint này "check `role.name===ADMIN` cứng trong controller" — source hiện tại KHÔNG CÓ check này (xác nhận `14_ANALYSIS_AUDIT.md` Mục 19.1, OLD/NEW/REASON).
- **Impact**: Bất kỳ user đăng nhập nào cũng xem được dashboard hiệu năng toàn hệ thống (endpoint/status/thời gian phản hồi — thông tin nội bộ hệ thống, không nên public cho mọi user).
- **Attack Preconditions**: Chỉ cần đăng nhập (bất kỳ role nào).
- **Recommendation**: Định nghĩa `PERFORMANCE_VIEW` trong `permission.constant.ts`, gắn `authorizePermission("PERFORMANCE_VIEW")`.
- **Confidence**: HIGH.

---

## 14. Medium Findings

### SEC-38 — 3 chuỗi permission dùng ở route KHÔNG tồn tại trong catalog thật

- **Severity**: MEDIUM (RBAC misconfiguration — fail-closed nên KHÔNG mở rộng quyền, nhưng phá vỡ thiết kế phân quyền dự kiến)
- **Category**: RBAC / Authorization
- **File**: routes dùng `"USER_READ"` (`GET /api/users`), `"USER_DETAIL"` (`GET /api/users/{id}`), `"DOCUMENT_DETAIL"` (`GET /api/documents/{id}`)
- **Observed Behavior**: 3 chuỗi này KHÔNG tồn tại trong `permission.constant.ts` — `seed-rbac.ts` chỉ seed theo `Object.values(PERMISSIONS)`, nên không Permission document nào mang 3 tên này từng tồn tại. Role `IT` ĐÃ được gán đúng `DOCUMENT_VIEW_DETAIL` nhưng vô dụng vì route kiểm tra sai tên.
- **Evidence**: `docs/module-reviews/15_API_CONTRACT_REVIEW.md` §6.1.
- **Impact**: 3 endpoint chỉ ADMIN gọi được (qua bypass string-match, không đọc permission) dù thiết kế "trên giấy" nói role khác cũng có quyền — không phải lỗ hổng mở rộng, nhưng cho thấy KHÔNG có type-safety nào chặn drift permission string ở tầng route.
- **Attack Preconditions**: Không áp dụng theo nghĩa tấn công — đây là misconfiguration làm GIẢM quyền truy cập hợp pháp, không mở rộng quyền.
- **Recommendation**: Sửa 3 chuỗi cho khớp catalog thật (`USER_VIEW`, `USER_VIEW_DETAIL`, `DOCUMENT_VIEW_DETAIL`); cân nhắc ràng buộc kiểu cho tham số `authorizePermission()` (xem `16_REFACTORING_PLAN.md` REF-017).
- **Confidence**: HIGH.

### SEC-39 — Email notification nhúng free-text vào HTML không escape

- **Severity**: MEDIUM
- **Category**: Injection (HTML/Email)
- **File**: `backend/src/services/notifications/notification.service.ts`
- **Function/Class**: `sendEmailForNotification`
- **Observed Behavior**: `title`/`message` (free-text, bắt nguồn từ `Document.title` do người dùng nhập) nhúng thẳng vào HTML email không escape.
- **Evidence**: `docs/module-reviews/10_NOTIFICATION_CODE_REVIEW.md` (`RV10-02`).
- **Impact**: HTML/email injection cho người NHẬN email; nếu FE (ngoài repo) render `notification.message` bằng cách không escape, có thể là stored XSS thật — UNKNOWN (FE không tồn tại trong repo).
- **Attack Preconditions**: Cần khả năng đặt `Document.title` (hoặc trường tương tự) chứa HTML — bất kỳ user có quyền tạo Document.
- **Recommendation**: Escape HTML cho free-text field trước khi nội suy vào template email.
- **Confidence**: CONFIRMED (code), UNKNOWN (khai thác thực tế qua FE).

### SEC-40 — Email reset-password nhúng `fullName` vào HTML không escape

- **Severity**: MEDIUM
- **Category**: Injection (HTML/Email)
- **File**: `passwordReset.template.ts` (thư mục email templates, dưới `shared/`)
- **Observed Behavior**: `fullName` nội suy trực tiếp vào HTML email không escape — cùng lớp lỗ hổng với `SEC-39`, phạm vi hẹp hơn (chỉ field `fullName`).
- **Evidence**: `docs/module-reviews/13_SHARED_CODE_REVIEW.md` #3 (tóm tắt trong `00_PROJECT_MEMORY.md`).
- **Impact**: Tương tự `SEC-39`.
- **Attack Preconditions**: Cần khả năng đặt `fullName` chứa HTML (khi tạo/sửa user) + kích hoạt luồng reset password cho user đó.
- **Recommendation**: Escape HTML cho `fullName` trước khi nội suy.
- **Confidence**: CONFIRMED (code), UNKNOWN (khai thác thực tế).

### SEC-41 — Lỗi Multer không được nhận diện riêng trong `error.middleware.ts`

- **Severity**: MEDIUM
- **Category**: Error Handling / Information Leakage
- **File**: `backend/src/middlewares/error.middleware.ts`
- **Observed Behavior**: Không có nhánh `MulterError` — lỗi sai định dạng file/vượt kích thước rơi vào nhánh 500 "lỗi không xác định" (liên hệ `SEC-23`) thay vì 400 rõ ràng.
- **Evidence**: `docs/module-reviews/08_IMPORT_EXPORT_CODE_REVIEW.md` (`RV08-01`) — áp dụng cho MỌI route dùng `uploadExcel` (Document import, Department sync, Asset import).
- **Impact**: Client nhận 500 kèm message lỗi thư viện thay vì 400 thân thiện; dễ tái hiện (chỉ cần gửi sai file).
- **Attack Preconditions**: Không cần điều kiện đặc biệt — bất kỳ user có quyền import.
- **Recommendation**: Thêm nhánh bắt riêng `MulterError` trong `error.middleware.ts`, map về 400.
- **Confidence**: HIGH.

### SEC-42 — Hard-delete Asset để lại `MedicalDeviceProfile`/`CalibrationRecord` mồ côi vĩnh viễn

- **Severity**: MEDIUM (Data Integrity, không phải rò rỉ dữ liệu — liên quan File/Asset access theo yêu cầu phạm vi Bước 5)
- **Category**: Data Security / Asset Access
- **File**: `backend/src/services/assets/assetDevice/asset.service.ts`
- **Function/Class**: `hardDeleteAssetService`
- **Observed Behavior**: Không check `MedicalDeviceProfile.exists({asset:id})` trước khi xoá — và KHÔNG CÓ service delete nào tồn tại cho `MedicalDeviceProfile` trong toàn bộ codebase (không đường dọn kể cả thủ công qua API).
- **Evidence**: `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md` (`RV16-01`).
- **Impact**: Dữ liệu kiểm định thiết bị y tế (`CalibrationRecord`) mất khả năng truy vết về Asset gốc vĩnh viễn — ảnh hưởng compliance/audit trail cho thiết bị y tế (lĩnh vực thường có yêu cầu lưu vết nghiêm ngặt).
- **Attack Preconditions**: Cần permission `ASSET_DELETE_PERMANENT` (permission riêng, không phổ biến) — không phải lỗ hổng dễ khai thác, nhưng hậu quả khi xảy ra (kể cả vô tình) là KHÔNG THỂ KHÔI PHỤC.
- **Recommendation**: Thêm check `MedicalDeviceProfile.exists({asset:id})` trước hard-delete; xem `16_REFACTORING_PLAN.md` REF-009.
- **Confidence**: HIGH.

---

## 15. Low Findings

> Đã có evidence đầy đủ ở Phase 09 gốc — liệt kê tóm tắt, không lặp lại toàn văn field (xem `09_SECURITY_ANALYSIS.md` cho chi tiết đầy đủ từng finding).

| ID | Category | Tóm tắt | Attack Preconditions |
|---|---|---|---|
| `SEC-02` | Authentication | Password policy yếu (`min(5)`, không bắt buộc độ phức tạp) | Không áp dụng — làm giảm hiệu quả chống brute-force offline nếu hash bị lộ theo cách khác |
| `SEC-03` | Authentication/Config | `JWT_SECRET` không fail-fast lúc khởi động | Cần lỗi cấu hình triển khai (thiếu env var) |
| `SEC-04` | Authentication/Data | JWT payload chứa `role`/`department` dư thừa | Cần chặn được token giữa đường (không giải mã được nội dung ký, chỉ đọc payload không mã hoá) |
| `SEC-09` | RBAC | `ROLE_PERMISSIONS` không đồng bộ DB thật | Không áp dụng — rủi ro vận hành/audit |
| `SEC-11` | Input Validation | Departments/RBAC thiếu `validateParams`/`validateBody` | Không cần điều kiện đặc biệt |
| `SEC-12` | Input Validation | `delete-by-month` thiếu `validateBody` | Cần permission `DOCUMENT_DELETE` |
| `SEC-17` | File Security | Type check chỉ dựa MIME/extension client cung cấp | Cần quyền upload tương ứng |
| `SEC-22` | API Security | Thiếu `trust proxy` | Cần hạ tầng triển khai sau reverse proxy (UNKNOWN) |
| `SEC-23` | API Security | Rò rỉ `err.message` ở nhánh 500 không xác định | Cần trigger được lỗi runtime không xác định |
| `RV02-02` | RBAC | `denyPermissions` vô tác dụng với ADMIN | Không áp dụng — chỉ ảnh hưởng ADMIN tự giới hạn quyền mình (hiếm) |
| `RV06-08` | Asset/Concurrency | Không bắt riêng `VersionError` khi assign/transfer/return đồng thời | Cần 2 request đồng thời trên cùng 1 Asset |
| `RV16-03` | Asset/User | `disable()` User không đồng bộ `Asset.assignedTo` | Không áp dụng — data consistency, không phải lỗ hổng khai thác được |

---

## 16. Recommended Security Tasks

Ưu tiên theo severity + effort (đối chiếu `16_REFACTORING_PLAN.md` cho chi tiết đầy đủ):

| # | Task | Finding | Effort |
|---|---|---|---|
| 1 | Đóng backdoor rename Role→"ADMIN" | `SEC-28` | SMALL (REF-001) |
| 2 | Thêm safeguard ADMIN cho `resetPassword()` Users | `SEC-29` | SMALL (REF-005) |
| 3 | Bật lại `authorizePermission("DOCUMENT_CREATE")` | `SEC-06` | SMALL, cần audit RBAC data trước (REF-004) |
| 4 | Định nghĩa + gắn `PERFORMANCE_VIEW` | `SEC-37` | SMALL |
| 5 | Domain Upload: `allowedTypes` + `uploadedBy` + ownership check + phân trang | `SEC-30→33` | MEDIUM, breaking change (REF-008) |
| 6 | Sửa 3 permission string sai + cân nhắc type-safety | `SEC-38` | MEDIUM (REF-017) |
| 7 | Loại `isActive` khỏi Asset update whitelist | `SEC-35` | SMALL |
| 8 | Khôi phục `validateQuery` 11-13 route + whitelist/ép kiểu filter (NoSQL injection) | `SEC-10`/`SEC-13` | MEDIUM (REF-006+011) |
| 9 | Escape regex ở Departments/RBAC/Assets | `SEC-14`/`SEC-36` | SMALL |
| 10 | Escape HTML trong 2 email template | `SEC-39`/`SEC-40` | SMALL |
| 11 | Check `MedicalDeviceProfile` trước hard-delete Asset | `SEC-42` | SMALL (REF-009) |
| 12 | Nhánh `MulterError` trong error handler | `SEC-41` | SMALL |
| 13 | Hash refresh token (SHA-256, giống PasswordResetToken) | (`RV01-02`, Mục 10) | MEDIUM, cần kế hoạch invalidate session (REF-012) |
| 14 | Neutralize CSV formula injection | `SEC-15` | SMALL |
| 15 | Validate `CLIENT_URL`/`JWT_SECRET` fail-fast | `SEC-03`/`SEC-21` | SMALL |
| 16 | Quyết định kiến trúc: hoàn thiện ABAC hay gỡ bỏ | `SEC-07` (root cause `SEC-34` và nhóm scoping) | LARGE, cần approval riêng (REF-010) |

---

## 17. Verification Strategy

Dự án **CHƯA CÓ Jest hoạt động** (ISS-07, xác nhận lại không đổi qua toàn bộ audit). Verification cho MỌI security fix trong kế hoạch này PHẢI:

1. `npx tsc --noEmit` sau mỗi thay đổi.
2. Test thủ công qua HTTP client thật (Postman/curl) — KHÔNG coi "đã test" nếu chỉ đọc code lại (CLAUDE.md §28).
3. Với finding CRITICAL/HIGH liên quan authorization (`SEC-28`, `SEC-29`, `SEC-34`, `SEC-35`, `SEC-37`, `SEC-38`) — test tối thiểu 2 case: (a) user KHÔNG có quyền → đúng 403/400; (b) user CÓ quyền → vẫn hoạt động bình thường (không regressions).
4. Với `SEC-30→33` (Upload) — test ownership bằng 2 tài khoản khác nhau thật, không chỉ đọc code.
5. **KHÔNG thực hiện penetration testing/exploit thật** trong bất kỳ bước verification nào — chỉ xác nhận qua request hợp lệ mô phỏng đúng/sai quyền, không dò tấn công chủ động (đúng nguyên tắc CLAUDE.md §23/SKILL.md §14).
6. `git diff` review đầy đủ trước khi đánh dấu DONE.

---

## 18. Security Risks

| Risk | Liên quan | Mức độ nếu không xử lý |
|---|---|---|
| Backdoor persistence (rename Role→ADMIN) tồn tại song song với ISS-01 đã fix — false sense of security nếu chỉ coi ISS-01 đã đóng hoàn toàn vấn đề privilege escalation | `SEC-28` | **CRITICAL** |
| Domain Upload là bề mặt tấn công yếu nhất — kết hợp với hạ tầng thật (nếu có reverse proxy serve `/uploads`) có thể biến IDOR thành khai thác trực tiếp qua URL không cần đăng nhập | `SEC-30→33`, liên hệ `SEC-16` | HIGH (mức độ phụ thuộc hạ tầng chưa xác minh) |
| 3 đường account-takeover ADMIN độc lập (1 đã fix, 2 còn mở: `SEC-28`, `SEC-29`) — mỗi đường cần fix RIÊNG, không có 1 fix chung nào đóng cả 3 | `SEC-28`, `SEC-29` | CRITICAL/HIGH |
| Thiếu scoping tập trung (ABAC dead) là root cause của nhiều finding rải rác — vá từng finding riêng lẻ (`SEC-34` và tương tự) không giải quyết root cause, rủi ro finding tương tự tiếp tục xuất hiện ở domain mới | `SEC-07`, `SEC-34` | MEDIUM-HIGH (dài hạn) |
| Không có test tự động cho auth/RBAC — mọi fix trong kế hoạch này dựa hoàn toàn vào test thủ công, rủi ro regression không bị phát hiện khi sửa nhiều finding cùng lúc | ISS-07 | MEDIUM-HIGH |
| Dữ liệu Role/Permission thật ở **production** chưa được xác minh (chỉ đã audit DB dev) — mức độ nghiêm trọng thực tế của toàn bộ finding Authorization/RBAC phụ thuộc trực tiếp vào việc này | Toàn bộ Mục 4/5 | UNKNOWN — cần xác minh trước khi đánh giá lại priority thực tế |

---

**PHASE 17 COMPLETED — không thực hiện Phase 18.**
