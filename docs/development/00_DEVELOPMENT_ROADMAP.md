# 00 — DEVELOPMENT ROADMAP

> Loại: Chuyển giao từ POST-ANALYSIS sang DEVELOPMENT STAGE (KHÔNG phải review mới, KHÔNG implement) | Ngày: 2026-08-31.
>
> **Nguồn đã đọc**: `CLAUDE.md`, `docs/00_PROJECT_MEMORY.md`, `docs/23_CODE_REVIEW_ROADMAP.md` (toàn văn — bản tổng hợp CUỐI CÙNG xuyên toàn bộ 17 module review + `docs/20/21/22` đã dedup sẵn), `docs/19_IMPROVEMENT_ROADMAP.md` (đối chiếu task candidate đã có, không lặp). Không đọc lại toàn bộ 17 module review, không đọc lại `docs/20/21/22` toàn văn (đã dùng qua bản dedup ở `docs/23`, đúng SKILL.md Rule 04/07). Không đọc lại repository, không chạy lại Phase 01→13.
>
> **Ghi chú cấu trúc thư mục**: yêu cầu gốc nói "kiểm tra `docs/reviews/`" — thư mục này **KHÔNG TỒN TẠI** trong repo; cấu trúc thực tế là `docs/module-reviews/` (17 file review) + `docs/review-index/` (chỉ mục). Đã dùng đúng đường dẫn thực tế.
>
> **KHÔNG implement bất kỳ thay đổi nào trong tài liệu này.**

---

## 1. Phương pháp tổng hợp

`docs/23_CODE_REVIEW_ROADMAP.md` đã thực hiện dedup đầy đủ (2 CRITICAL, 14 HIGH, ~25 MEDIUM, ~26 LOW, cộng 1 CRITICAL đã RESOLVED) từ toàn bộ 17 module review + `docs/20/21/22`. Tài liệu này KHÔNG lặp lại evidence chi tiết — chỉ tổ chức lại các finding đó thành **improvement item** (`IMP-XXX`) theo template yêu cầu, rồi gom thành **development task** (`DEV-XXX`) theo đúng thứ tự ưu tiên: **Security > Data integrity > Critical business logic > API stability > Performance > Testing > Maintainability > Refactoring > Cosmetic**.

Đã loại bỏ khi tổng hợp:
- **Duplicate**: mọi finding trùng gốc (`RVxx-yy` = `SEC-xx`/`ARCH-xx`) chỉ giữ 1 ID chính (đã dedup từ `docs/23`).
- **Đã fix**: `SEC-05`/ISS-01 (privilege escalation `PUT /users/:id`) — RESOLVED 2026-08-30, không đưa vào danh sách active, chỉ ghi chú tham chiếu.
- **Không còn phù hợp**: không phát hiện finding nào bị INCORRECT/OUTDATED chưa xử lý (finding INCORRECT duy nhất — dashboard performance authorization — đã được đính chính thành `IMP-016`/`H-10` ở đây, không loại bỏ).
- **Recommendation không có evidence**: không đưa các "Unknowns" (vd dữ liệu Role/Permission production thật, hạ tầng serve tĩnh `/uploads`) vào danh sách improvement — đây là điều kiện cần xác minh, không phải finding có thể lên task ngay (ghi ở Mục 7 "Ghi chú UNKNOWN").

## 2. Improvement Items — P0 (Critical)

### IMP-001
- **Title**: Đóng backdoor rename Role thành "ADMIN"
- **Area**: Security / RBAC
- **Source Finding**: `docs/23_CODE_REVIEW_ROADMAP.md` C-01 (= `SEC-28` = `RV02-01`)
- **Evidence**: `docs/module-reviews/02_RBAC_CODE_REVIEW.md` — `updateRoleService()` không guard đổi `Role.name` thành/khỏi `"ADMIN"`; bypass chỉ so khớp CHUỖI `role.name==="ADMIN"`.
- **Problem**: Không có ràng buộc nào ngăn 1 user có `ROLE_UPDATE` tạo 1 role "ADMIN" thứ hai bằng cách đổi tên.
- **Impact**: Backdoor persistence toàn quyền, độc lập hoàn toàn với fix `SEC-05` đã có.
- **Priority**: P0
- **Estimated Effort**: SMALL
- **Affected Module**: RBAC (`rbac.service.ts`, `role.model.ts`, `authorizePermission.middleware.ts`, `seed-rbac.ts`)
- **Dependencies**: Không
- **Risk**: LOW
- **Recommended Task**: DEV-001

### IMP-002
- **Title**: Safeguard ADMIN cho `resetPassword()` (Users, admin reset hộ)
- **Area**: Security / Authorization
- **Source Finding**: H-01 (= `SEC-29` = `RV03-01`)
- **Evidence**: `docs/module-reviews/03_USERS_CODE_REVIEW.md` — docstring mô tả chặn ADMIN, code không có check tương ứng (khác `disable()` cùng file).
- **Problem**: Thiếu 1 dòng kiểm tra `role.name==="ADMIN"`.
- **Impact**: Account-takeover ADMIN đường thứ 3 nếu `USER_RESET_PASSWORD` từng được cấp cho role khác.
- **Priority**: P0
- **Estimated Effort**: SMALL
- **Affected Module**: Users (`users.service.ts:resetPassword`)
- **Dependencies**: Không
- **Risk**: LOW
- **Recommended Task**: DEV-002

### IMP-003
- **Title**: Bật lại authorization cho `POST /documents/proposal`
- **Area**: Security / Authorization
- **Source Finding**: H-02 (= `SEC-06` = `RV05-02` = ISS-09)
- **Evidence**: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md`, xác nhận 3 nguồn độc lập — `authorizePermission("DOCUMENT_CREATE")` bị comment ở route.
- **Problem**: Bất kỳ user đăng nhập nào cũng tạo được Document proposal.
- **Impact**: Critical Risk theo risk register (Phase 12), vi phạm least-privilege.
- **Priority**: P0
- **Estimated Effort**: SMALL (cần audit RBAC data trước khi bật)
- **Affected Module**: Documents (`document.route.ts`)
- **Dependencies**: Audit dữ liệu RBAC thật — xác nhận role dự kiến tạo proposal đã giữ `DOCUMENT_CREATE`
- **Risk**: LOW-MEDIUM
- **Recommended Task**: DEV-003

### IMP-004
- **Title**: Khôi phục toolchain test + cứu 4 bộ test mồ côi
- **Area**: Testing (điều kiện tiên quyết cho toàn bộ P0 còn lại)
- **Source Finding**: `docs/22_GLOBAL_TESTING_REVIEW.md` Mục 2, `docs/18_TESTING_STRATEGY.md` Mục 18.1-18.2
- **Evidence**: `backend/package.json` không có `jest`/`ts-jest`/`@types/jest`, không script `test`; `jest.config.js` bị xoá khỏi git ở commit `5b58fb1`; 4 file `dist/src/**/__tests__/*.test.js` (gitignored) là bằng chứng 4 bộ test đã từng viết/chạy được nhưng chưa từng commit source `.test.ts`.
- **Problem**: Không có lưới an toàn hồi quy cho bất kỳ fix P0 nào ở trên.
- **Impact**: Rủi ro regression không phát hiện được khi sửa các finding Security/Business-logic; 4 bộ test có nguy cơ mất vĩnh viễn nếu `dist/` bị build lại.
- **Priority**: P0 — BLOCKER
- **Estimated Effort**: SMALL
- **Affected Module**: Toàn hệ thống (nền tảng)
- **Dependencies**: Không — nên làm TRƯỚC hoặc SONG SONG DEV-001/002/003
- **Risk**: LOW
- **Recommended Task**: DEV-004

### IMP-005
- **Title**: Sửa business rule `CONFIRM_STATUS` khiến Asset không bao giờ đồng bộ
- **Area**: Critical Business Logic / Data Integrity
- **Source Finding**: C-02 (= `RV05-01` = `ARCH-12`)
- **Evidence**: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` — `documentRules.ts` khai `CONFIRM_STATUS.referenceSubType=PROPOSE_INK`, `workflow.service.ts:syncAssetOnDocumentApproved` hard-code `PROPOSE_REPAIR`; củng cố bởi `RV07-05` (Dashboard KPI) và `RV08-06` (Excel import/export).
- **Problem**: 2 nguồn định nghĩa cùng 1 rule nghiệp vụ không khớp nhau, không có single-source-of-truth.
- **Impact**: Asset kẹt vĩnh viễn `UNDER_MAINTENANCE` sau khi duyệt xong CONFIRM_STATUS — không throw lỗi, không ai phát hiện; Dashboard KPI hiển thị sai theo.
- **Priority**: P0
- **Estimated Effort**: SMALL (code) + MEDIUM (điều tra dữ liệu Asset đang kẹt)
- **Affected Module**: Documents/Workflow/Assets (`workflow.service.ts`, `documentRules.ts`)
- **Dependencies**: **BẮT BUỘC xác nhận nghiệp vụ thật với chủ dự án + rà soát dữ liệu Asset hiện có TRƯỚC KHI CODE**
- **Risk**: MEDIUM
- **Recommended Task**: DEV-005

### IMP-006
- **Title**: Hard-delete Document theo tháng — kiểm tra tham chiếu ngược
- **Area**: Data Integrity
- **Source Finding**: H-06 (= ISS-02 = `RV05-05`)
- **Evidence**: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md`, `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md` §C.1 — `deleteDocumentsByMonthService` gọi `deleteMany` không transaction, không check `WorkflowInstance`/`referenceTo`/`Notification`.
- **Problem**: Xoá hàng loạt không kiểm tra tham chiếu.
- **Impact**: Dangling reference vĩnh viễn trên 3 model khác — Critical Risk theo Phase 12, tồn tại xuyên suốt nhiều phase chưa xử lý.
- **Priority**: P0
- **Estimated Effort**: MEDIUM
- **Affected Module**: Documents (`document.service.ts:deleteDocumentsByMonthService`)
- **Dependencies**: Quyết định nghiệp vụ: chặn cứng hay chuyển soft-delete hàng loạt
- **Risk**: MEDIUM (thay đổi hành vi API hiện có)
- **Recommended Task**: DEV-006

## 3. Improvement Items — P1 (High)

| ID | Title | Source Finding | File/Module | Problem/Impact (tóm tắt) | Effort | Risk | Task |
|---|---|---|---|---|---|---|---|
| IMP-007 | `POST /api/upload`: giới hạn loại file | H-09a (`SEC-30`/`RV09-01`) | Upload (`upload.middleware.ts`) | `createUploader()` không truyền `allowedTypes` → nhận mọi loại file | SMALL | LOW | DEV-007 |
| IMP-008 | Gắn `uploadedBy` khi lưu file | H-09b (`SEC-31`/`RV09-02`) | Upload (`upload.service.ts:saveFilesToDB`) | File "vô chủ" — tiền đề trực tiếp IMP-009/010 | SMALL | LOW | DEV-007 |
| IMP-009 | Filter + phân trang `GET /api/upload` | H-09c (`SEC-32`/`RV09-03`) | Upload (`upload.service.ts:getFiles`) | Trả TOÀN BỘ file mọi user, không phân trang | MEDIUM (breaking) | MEDIUM | DEV-007 |
| IMP-010 | Ownership check `GET/DELETE /api/upload/:id` | H-09d (`SEC-33`/`RV09-04`) | Upload (`getFileDetail`/`deleteFile`) | IDOR đầy đủ — xoá được file người khác | MEDIUM | MEDIUM | DEV-007 |
| IMP-011 | Khôi phục `validateQuery` 11-13 route | H-14+H-04 (`ARCH-27`, `SEC-13`/ISS-04, `SEC-10`) | Documents/Users/RBAC/UserAudit/Notifications/Assets/AssetCategory | Root cause bug pagination 3 domain ĐANG XẢY RA + NoSQL injection | MEDIUM (breaking pagination) | MEDIUM | DEV-008 |
| IMP-012 | Whitelist field + ép kiểu filter (NoSQL injection) | H-04 (`SEC-13`) | RBAC/Departments/UserAudit/Users | Gán thẳng query string vào Mongo filter | MEDIUM | LOW | DEV-008 (gộp IMP-011) |
| IMP-013 | Quyết định kiến trúc ABAC (Activate/Remove) | H-03+H-13 (`SEC-07`/ISS-03, `ARCH-06`) | RBAC/Documents/Assets/Dashboard | Tầng ABAC dead runtime, root cause thiếu scoping tập trung ở 3 domain | **LARGE** | **HIGH** | DEV-009 (spike, KHÔNG code ngay) |
| IMP-014 | Loại `isActive` khỏi Asset update whitelist | H-07 (`SEC-35`/`RV06-01`) | Assets (`assets.dto.ts`, `ASSET_UPDATE_WHITELIST`) | Bypass guard soft-delete chỉ cần `ASSET_UPDATE` thay vì `ASSET_DELETE` | SMALL | LOW | DEV-010 |
| IMP-015 | Escape regex 3 domain (chống ReDoS) | H-08 (`SEC-36`/`RV06-02`) | Departments/RBAC/Assets | `$regex` không qua `escapeRegex` sẵn có | SMALL | LOW | DEV-010 |
| IMP-016 | Định nghĩa + gắn `PERFORMANCE_VIEW` | H-10 (`SEC-37`/`RV11-01`) | Performance dashboard | 0 authorization — bất kỳ user login nào xem được | SMALL | LOW | DEV-011 |
| IMP-017 | Check Asset/AssetAssignmentHistory trước xoá Department | H-12a (`ARCH-05`, `RV04-01`) | Departments (`deleteDepartmentService`) | Orphan reference khi xoá Department | SMALL | LOW-MEDIUM | DEV-012 |
| IMP-018 | Check MedicalDeviceProfile trước hard-delete Asset | H-12b (`ARCH-05`, `MEDIUM-03`/`RV16-01`) | Assets (`hardDeleteAssetService`) | Mất dữ liệu kiểm định thiết bị y tế KHÔNG THỂ KHÔI PHỤC | SMALL-MEDIUM | LOW-MEDIUM | DEV-012 |

## 4. Improvement Items — P2 (Medium) — nhóm gọn theo chủ đề

| Nhóm | ID gộp | Source Finding | Vấn đề chính | Task |
|---|---|---|---|---|
| RBAC/API hygiene | IMP-019 | `MEDIUM-04` (3 permission string sai catalog), `ARCH-25` (type-safety `authorizePermission`), `ARCH-29` (`validateParams` thiếu nhất quán) | Drift permission string không bị bắt ở compile-time | DEV-013 |
| Auth hardening | IMP-020 | `MEDIUM-05` (refresh token plaintext), `MEDIUM-06` (`jwt.verify` không try/catch), `MEDIUM-09` (CORS fallback `*`) | Thiếu phòng thủ lớp 2 cho token/config | DEV-014 |
| Injection/output hardening | IMP-021 | `MEDIUM-07` (CSV formula injection), `MEDIUM-08` (path traversal filename), `MEDIUM-10` (HTML injection email ×2) | Output không neutralize input người dùng | DEV-015 |
| Data integrity còn lại | IMP-022 | `MEDIUM-11` (soft-delete Document không chặn WorkflowInstance pending), `MEDIUM-12` (`RV16-02`, Department validate skip), `RV16-03` (disable User không sync Asset.assignedTo, LOW nhưng gộp chung nhóm) | Ràng buộc dữ liệu chưa đầy đủ khi update/disable | DEV-016 |
| Error handling | IMP-023 | `MEDIUM-13` (`RV08-01`, MulterError không nhận diện riêng) | Lỗi 500 thay vì 400 khi sai định dạng file import | DEV-017 |
| Performance (index) | IMP-024 | ISS-05/`RV05-08` (WorkflowInstance COLLSCAN), PERF-03/`RV07-02` (thiếu index Document+Asset) | Endpoint tần suất cao chạy COLLSCAN | DEV-018 |
| Performance (metrics đúng) | IMP-025 | `RV11-02` (endpoint ghi thiếu `baseUrl`, gộp nhầm domain) | Dashboard hiệu năng tự nó sai số liệu | DEV-018 |
| Config hygiene | IMP-026 | `ARCH-28` (`.env.example` desync) | Rủi ro cấu hình sai khi deploy môi trường mới | DEV-019 |
| Excel transaction (điều tra trước) | IMP-027 | `ARCH-20` (N+1 transaction/dòng, CHỦ ĐÍCH) | Cần hiểu lý do gốc + benchmark trước khi đổi | DEV-020 (KHÔNG code ngay) |

## 5. Improvement Items — P3 (Low) — nhóm gọn theo chủ đề

| Nhóm | Source Finding | Vấn đề chính | Task |
|---|---|---|---|
| Password/token policy | `SEC-01/02/03/04` | Refresh không rotate, password policy yếu, JWT secret không fail-fast, JWT payload dư thừa | DEV-021 |
| Input validation còn thiếu | `SEC-09/11/12/17/22/23` | Departments/RBAC thiếu validate, MIME check yếu, thiếu `trust proxy`, rò rỉ `err.message` | DEV-021 |
| RBAC edge-case | `RV02-02` (denyPermissions vô tác dụng ADMIN), `RV06-08` (VersionError concurrency) | Inconsistency nhỏ, không phải lỗ hổng mở rộng quyền | DEV-022 |
| Dead code tích luỹ | `ARCH-02/03/08/11/13/15/34` | Kỷ luật dọn không đều, code chết ở `workflow.service.ts`/`assetAssignment.service.ts`/`excel.service.ts`/`documents.validator.ts` | DEV-023 |
| Duplicate config | `ARCH-14` (permission.descriptors.ts sai), `ARCH-26` (2 rate-limiter), `ARCH-35` (2 Multer config) | Nhiều nguồn cấu hình cho cùng 1 concern | DEV-023 |
| Observability | `ARCH-30` (không structured logger) | Hạn chế debug production, chỉ cấp thiết khi có kế hoạch scale | DEV-024 |
| API response consistency | `ARCH-17` (type permissions không phản ánh vòng đời), `ARCH-21` (TOCTOU import), `ARCH-23` (Upload response shape), `ARCH-31` (field naming `totalPages`/`totalPage`) | Cosmetic/inconsistency, không phải bug | DEV-025 |

## 6. Development Tasks (DEV-XXX) — chưa tạo file `docs/development/tasks/DEV-XXX.md`

> Mỗi task có 1 mục tiêu rõ ràng, không mega-task. Thứ tự trình bày theo đúng ưu tiên yêu cầu (Security > Data integrity > Critical business logic > API stability > Performance > Testing > Maintainability > Refactoring > Cosmetic) — **KHÔNG phải thứ tự thực thi** (xem Mục 8 cho thứ tự thực thi thật, có tính tới dependency/effort).

| DEV | Mục tiêu | Improvement Items | Priority | Category |
|---|---|---|---|---|
| DEV-001 | Đóng backdoor rename Role→ADMIN | IMP-001 | P0 | Security |
| DEV-002 | Safeguard ADMIN cho resetPassword() Users | IMP-002 | P0 | Security |
| DEV-003 | Bật lại authorization cho proposal creation | IMP-003 | P0 | Security |
| DEV-007 | Domain Upload: khắc phục chuỗi IDOR (4 sub-item, có thể chia TASK-B1→B4 khi triển khai) | IMP-007→010 | P1 | Security |
| DEV-009 | Spike quyết định kiến trúc ABAC (Activate/Remove) — KHÔNG code, chỉ đề xuất + trình duyệt | IMP-013 | P1 | Security (Architecture decision) |
| DEV-010 | Asset business-logic bypass fixes (whitelist + regex escape) | IMP-014, IMP-015 | P1 | Security |
| DEV-011 | Định nghĩa + gắn quyền cho Performance Dashboard | IMP-016 | P1 | Security |
| DEV-014 | Auth hardening lớp 2 (hash refresh token, try/catch jwt.verify, CORS fail-fast) | IMP-020 | P2 | Security |
| DEV-015 | Injection/output hardening (CSV, path traversal, HTML email) | IMP-021 | P2 | Security |
| DEV-021 | Password/token policy + input validation còn thiếu (nhóm LOW) | (LOW nhóm 1-2) | P3 | Security |
| DEV-022 | RBAC edge-case cleanup | (LOW nhóm 3) | P3 | Security |
| DEV-006 | Hard-delete Document/tháng — kiểm tra tham chiếu ngược | IMP-006 | P0 | Data Integrity |
| DEV-012 | Referential integrity sweep (Department xoá, Asset hard-delete → MedicalDeviceProfile) | IMP-017, IMP-018 | P1 | Data Integrity |
| DEV-016 | Data integrity còn lại (soft-delete Document vs Workflow, Department validate, disable User↔Asset sync) | IMP-022 | P2 | Data Integrity |
| DEV-005 | Sửa business rule CONFIRM_STATUS↔PROPOSE_INK (đồng bộ Asset) | IMP-005 | P0 | Critical Business Logic |
| DEV-008 | Khôi phục ranh giới Route↔Service (validateQuery + NoSQL injection filter) | IMP-011, IMP-012 | P1 | API Stability |
| DEV-013 | RBAC/API contract hygiene (permission string, type-safety, validateParams) | IMP-019 | P2 | API Stability |
| DEV-025 | API response consistency (field naming, Upload response shape, type permissions) | (LOW nhóm cuối) | P3 | API Stability (Cosmetic) |
| DEV-018 | Performance: index WorkflowInstance/Document/Asset + sửa metric endpoint sai | IMP-024, IMP-025 | P2 | Performance |
| DEV-020 | Điều tra + benchmark Excel batch transaction (KHÔNG đổi code cho tới khi có kết luận) | IMP-027 | P2 | Performance |
| DEV-004 | Khôi phục toolchain Jest + cứu 4 bộ test mồ côi | IMP-004 | P0 | Testing (blocker) |
| DEV-017 | Nhận diện riêng lỗi Multer trong error handler | IMP-023 | P2 | Maintainability |
| DEV-019 | Chuẩn hoá `.env.example` khớp biến thực dùng | IMP-026 | P2 | Maintainability |
| DEV-024 | Cân nhắc structured logger (chỉ khi có kế hoạch scale) | (LOW — Observability) | P3 | Maintainability |
| DEV-023 | Dọn dead code tích luỹ + hợp nhất duplicate config (rate-limiter/Multer/permission.descriptors) | (LOW nhóm 4-5) | P3 | Refactoring |

**Tổng: 25 development task** (DEV-001→DEV-025), bao phủ toàn bộ 27 improvement item đã liệt kê chi tiết (IMP-001→027) + 7 nhóm LOW gộp gọn (Mục 5).

## 7. Ghi chú UNKNOWN (không lên task — cần xác minh trước khi đánh giá lại priority)

- Dữ liệu Role/Permission THẬT ở **production** (chỉ đã audit DB dev) — ảnh hưởng trực tiếp mức độ nghiêm trọng thực tế của DEV-001/002/003.
- Hạ tầng triển khai thật có reverse proxy serve tĩnh `backend/uploads/` hay không — ảnh hưởng mức độ nghiêm trọng thực tế của DEV-007.
- MongoDB production có phải replica set hay không — điều kiện bắt buộc cho `withTransaction()` hoạt động đúng trên toàn bộ DEV-005/006/012.

## 8. Suggested Execution Order (có tính effort/dependency, khác thứ tự trình bày Mục 6)

```
BƯỚC 0: DEV-004 (khôi phục test toolchain — điều kiện tiên quyết)

STAGE 1 — P0 Critical:
  DEV-001 → DEV-002 → DEV-003 (sau audit RBAC data) → DEV-006 (sau quyết định chặn/soft-delete)
  → DEV-005 (SAU CÙNG stage này — cần xác nhận nghiệp vụ + rà soát dữ liệu trước)

STAGE 2 — P1 quick-fix (risk thấp, không cần điều tra):
  DEV-010 → DEV-011 → DEV-012

STAGE 3 — P1 breaking-change (cần rà soát consumer/data cũ trước):
  DEV-008 → DEV-007

STAGE 4 — Quyết định kiến trúc lớn (độc lập, không chặn stage khác):
  DEV-009 (spike TRƯỚC bất kỳ code nào)

STAGE 5 — P2 Medium (theo capacity, không deadline áp lực):
  DEV-013 → DEV-014 → DEV-015 → DEV-016 → DEV-017 → DEV-018 → DEV-019 → DEV-020 (điều tra trước)

STAGE 6 — P3 Low + Maintainability/Refactoring/Cosmetic (xen kẽ theo capacity):
  DEV-021 → DEV-022 → DEV-023 → DEV-024 → DEV-025
```

---

**Không có DEV-XXX.md nào được tạo ở bước này — chỉ có roadmap. Không có code nào được sửa.**
