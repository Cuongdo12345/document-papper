# Phase 19 — Improvement Roadmap

> Ngày: 2026-08-31. Phase TỔNG HỢP — không phân tích lại repository, không refactor, không implement, không tạo code, không cài dependency. Nguồn: `docs/14_ANALYSIS_AUDIT.md`, `docs/15_ARCHITECTURE_REVIEW.md`, `docs/16_REFACTORING_PLAN.md`, `docs/17_SECURITY_HARDENING_PLAN.md`, `docs/18_TESTING_STRATEGY.md` (đọc toàn văn cả 5 file), tham chiếu `docs/00_PROJECT_MEMORY.md`. Không đọc lại `11_TECHNICAL_DEBT.md`/`12_ISSUES_AND_RISKS.md`/`13_FINAL_PROJECT_REPORT.md` toàn văn — nội dung liên quan đã có đầy đủ trong Phase 14-16 (đúng SKILL.md Rule 04/07).

---

## 1. Executive Summary

Sau 19 phase (13 phase baseline lịch sử + 16 module review + 2 Global Review + Phase 14→19), dự án có bức tranh đầy đủ và nhất quán: kiến trúc monolith layered theo domain, không circular dependency, chất lượng đồng bộ API/OpenAPI cao bất thường — NHƯNG mang **3 vấn đề CRITICAL độc lập** (2 backdoor account-takeover ADMIN còn mở, 1 bug business-rule khiến Asset không đồng bộ sau duyệt) cùng **0 lưới an toàn test tự động khả dụng**. Roadmap này không tạo finding mới — nó sắp xếp lại toàn bộ finding đã CONFIRMED thành trình tự thực thi an toàn, tách rõ Quick Win (làm ngay) khỏi Large Initiative (cần quyết định/điều tra trước).

## 2. Current Project Health

| Trục | Trạng thái | Nguồn |
|---|---|---|
| Kiến trúc | Ổn định, không circular dependency (xác nhận 3 lần độc lập), 1 điểm yếu cấu trúc mới (ARCH-27 — Service/Middleware boundary không type-safe) | Phase 15 |
| Bảo mật | 1 CRITICAL + 9 HIGH còn OPEN, đã hardening 1 phần (ISS-01/SEC-05 RESOLVED) | Phase 17 |
| Business logic | 1 bug CRITICAL đang chạy sai lặng lẽ (không throw lỗi nào), củng cố bởi 3 bằng chứng độc lập | Phase 14 Mục 11 |
| Database | Referential integrity chỉ validate chiều "tạo", không có chiều "huỷ" — pattern lặp ≥3 domain | Phase 15 Mục 6 |
| Testing | Toolchain KHÔNG cài đặt được (jest thiếu khỏi `devDependencies`), 4 bộ test có giá trị đang mồ côi trong `dist/` gitignored | Phase 18 |
| Tài liệu | API/OpenAPI khớp tuyệt đối 116/116 operation — điểm mạnh hiếm có | Phase 15 Mục 14 |
| Technical debt | Tích luỹ nhưng đã có kế hoạch refactor đầy đủ (24 candidate, REF-001→024) | Phase 16 |

**Kết luận sức khoẻ tổng thể**: dự án ở trạng thái **"biết rõ vấn đề, chưa hành động"** — không phải thiếu phân tích, mà là khoảng cách giữa phân tích và thực thi. Rủi ro lớn nhất KHÔNG phải kỹ thuật mà là **false sense of security**: 1 lỗ hổng ADMIN đã fix (ISS-01) dễ khiến người đọc tưởng nhầm toàn bộ vấn đề privilege-escalation đã đóng, trong khi 2 đường khác vẫn mở nguyên.

## 3. Confirmed Problems

(Đã gộp theo root-cause, loại bỏ duplicate — không liệt lại toàn bộ evidence, tham chiếu ID gốc)

1. **3 đường account-takeover ADMIN độc lập** (1 RESOLVED, 2 OPEN): `SEC-28`/`RV02-01` (rename Role) + `SEC-29`/`RV03-01` (resetPassword) — root cause chung: bypass dựa trên so khớp CHUỖI `role.name==="ADMIN"`, không phải cờ hệ thống bất biến.
2. **Bug business rule CONFIRM_STATUS↔PROPOSE_INK/REPAIR** (`RV05-01`/`ARCH-12`) — 2 nguồn định nghĩa rule không đồng bộ, khiến Asset kẹt vĩnh viễn `UNDER_MAINTENANCE` sau khi duyệt xong 1 nhánh nghiệp vụ cụ thể — root cause kiến trúc: thiếu single-source-of-truth cho business rule.
3. **Referential integrity chỉ 1 chiều** (`ARCH-05`, HIGH) — lặp lại độc lập ở ≥3 domain (Document hard-delete/month — ISS-02; Asset hard-delete→MedicalDeviceProfile — RV16-01/SEC-42; Department delete→Asset/AssetAssignmentHistory — RV04-01).
4. **Authorization/scoping không tập trung** (`ARCH-06`, HIGH) — root cause: ABAC dead runtime (`SEC-07`/ISS-03), hệ quả: department-scoping rải rác không nhất quán ở Documents (`SEC-34`)/Assets (`RV06-04`)/Dashboard (`RV07-01`).
5. **Domain Upload là bề mặt tấn công yếu nhất** — chuỗi 4 finding HIGH liên kết nhân-quả (`SEC-30→33`) chưa từng có trong baseline gốc (Phase 11/12 không đào sâu domain này).
6. **Ranh giới Route↔Service không type-safe** (`ARCH-27`, HIGH, MỚI Phase 15) — root cause thật của bug pagination 3 domain (`ISS-08`, `RV10-01`) VÀ 1 phần bề mặt NoSQL injection (`SEC-13`/ISS-04).
7. **Zero test coverage khả dụng** (`ISS-07`, cập nhật Phase 18: tệ hơn baseline ghi — toolchain hiện không cài được, không chỉ "thiếu file") — làm TĂNG rủi ro của TẤT CẢ 6 mục trên vì không có lưới an toàn khi sửa.
8. **1 finding INCORRECT đã đính chính**: `GET /performances/dashboard` — Phase 05 ghi sai có check ADMIN, thực tế 0 authorization (`SEC-37`/`RV11-01`).

## 4. Critical Priorities (P0)

| ID | Finding gốc | Vấn đề | Effort | Risk |
|---|---|---|---|---|
| REF-001 | `SEC-28`/`RV02-01` | Đóng backdoor rename Role→ADMIN | SMALL | LOW |
| REF-005 | `SEC-29`/`RV03-01` | Safeguard ADMIN cho `resetPassword()` Users | SMALL | LOW |
| REF-004 | `SEC-06`/ISS-09 | Bật lại `authorizePermission("DOCUMENT_CREATE")` cho proposal | SMALL | LOW (cần audit RBAC data trước) |
| REF-002 | `RV05-01`/ARCH-12 | Sửa business rule CONFIRM_STATUS↔PROPOSE_INK | SMALL (code) + điều tra data | **MEDIUM** |
| REF-003 | ISS-02/TD-02 | Hard-delete Document/tháng không check tham chiếu | MEDIUM | MEDIUM |
| TEST-001/002 | Phase 18 Mục 18.1-18.2 | Khôi phục toolchain Jest + cứu 4 bộ test mồ côi | SMALL | LOW (blocker để verify an toàn các mục trên) |

**Lý do P0**: 3 mục đầu đóng account-takeover ADMIN hoàn toàn (đóng cả 3 đường, không chỉ 1). REF-002/REF-003 là data-integrity CRITICAL đã tồn tại xuyên suốt nhiều phase không xử lý. TEST-001/002 là ĐIỀU KIỆN TIÊN QUYẾT — sửa 5 mục security/business trên mà không có lưới an toàn nào là rủi ro tự thân.

## 5. High Priorities (P1)

| ID | Finding gốc | Vấn đề | Effort |
|---|---|---|---|
| REF-006+011 | `ARCH-27`, `SEC-10`/`SEC-13`/ISS-08 | Khôi phục `validateQuery` (11-13 route) + chặn NoSQL injection | MEDIUM |
| REF-008 | `SEC-30→33` | Domain Upload: allowedTypes + uploadedBy + ownership + phân trang | MEDIUM (breaking) |
| REF-009 | `SEC-42`/`RV16-01` | Chặn hard-delete Asset khi còn `MedicalDeviceProfile` | SMALL-MEDIUM |
| REF-007 | ISS-05/`RV05-08` | Index cho `WorkflowInstance` (chống COLLSCAN) | SMALL |
| — | `SEC-37`/`RV11-01` | Định nghĩa + gắn `PERFORMANCE_VIEW` | SMALL |
| — | `SEC-35`/`RV06-01` | Loại `isActive` khỏi Asset update whitelist | SMALL |
| — | `SEC-36`/`RV06-02` | Escape regex (Departments/RBAC/Assets, chống ReDoS) | SMALL |
| TEST-006→011 | Phase 18 Mục 15 | Test case cho toàn bộ mục P1 ở trên | Theo từng REF/SEC |

## 6. Medium Priorities (P2)

REF-012 (RefreshToken index+hash), REF-013 (validateParams RBAC/Departments), REF-014 (Department delete refs), REF-015 (chuẩn hoá response format auth/upload — breaking), REF-016 (Excel batch transaction — cần điều tra lý do gốc trước), REF-017 (type-safety permission string), `SEC-38` (3 permission string sai), `SEC-39`/`SEC-40` (HTML injection email), `SEC-41` (MulterError handling), `ARCH-28` (`.env.example` desync), `ARCH-30` (structured logger — chỉ cấp thiết khi có kế hoạch scale). Test tương ứng: TEST-012→016 (Phase 18 Mục 16).

## 7. Low Priorities (P3)

REF-018→024 (dead-code cleanup, `.env.example` sync, hợp nhất rate-limiter/Multer, index `.lean()`, field naming `totalPages`/`totalPage`, fail-fast env validation, structured logger) — toàn bộ LOW risk/SMALL effort theo `docs/16_REFACTORING_PLAN.md` Mục 7. `SEC-02/03/09/11/12/17/22/23`, `RV02-02`, `RV06-08`, `RV16-03` (Phase 17 Mục 15). Test tương ứng: TEST-017→019.

## 8. Security Roadmap

Theo đúng `docs/17_SECURITY_HARDENING_PLAN.md` Mục 16 (16 task đã xếp hạng) — 3 mục đầu = P0 Mục 4 ở trên (REF-001/004/005). Tiếp theo: `SEC-37` (dashboard auth) → `SEC-30→33` (Upload, REF-008) → `SEC-38` (permission string) → `SEC-35` (Asset whitelist) → REF-006+011 (validateQuery + NoSQL injection) → `SEC-36` (ReDoS) → `SEC-39/40` (email HTML) → `SEC-42` (Asset orphan, REF-009) → `SEC-41` (Multer) → hash refresh token (REF-012) → CSV formula injection (`SEC-15`) → fail-fast config (`SEC-03/21`) → **quyết định ABAC** (`SEC-07`, REF-010 — LARGE, cần approval riêng, không vội).

## 9. Testing Roadmap

Theo `docs/18_TESTING_STRATEGY.md` Mục 18-19: **Bước 0 bắt buộc trước mọi thứ khác** — khôi phục toolchain Jest + cứu 4 bộ test đã mất khỏi git (auth, RBAC middleware, workflow, permission cache), commit ngay lần này. Sau đó viết test song song với từng REF/SEC theo đúng 8 đợt của `16_REFACTORING_PLAN.md` Mục 11 (không viết test cho code sắp bị refactor lớn — REF-010 — cho tới khi kiến trúc được quyết định). Tỷ lệ đề xuất: Unit ~55-60%, Integration ~25-30%, API ~10-15%, E2E 0% (không có frontend).

## 10. Architecture Roadmap

Theo `docs/15_ARCHITECTURE_REVIEW.md` Mục 17: (1) ràng buộc kiểu cho `authorizePermission(...)` (REF-017); (2) cắt coupling ngầm Route↔Service (REF-006, root-cause ARCH-27); (3) **quyết định số phận ABAC** (REF-010 — Activate hay Remove, KHÔNG được để "vừa không dùng vừa không gỡ" kéo dài) — đây là quyết định kiến trúc lớn nhất còn treo; (4) chuẩn hoá `.env.example` (ARCH-28); (5) cân nhắc structured logger nếu có kế hoạch scale (ARCH-30); (6) nhân rộng pattern `.validator/.mapper/.query.ts` của domain `documents` cho `workflow.service.ts` khi có dịp refactor có kiểm soát (ARCH-10).

## 11. Refactoring Roadmap

Toàn bộ `docs/16_REFACTORING_PLAN.md` (24 candidate, 8 đợt thực hiện) VẪN GIỮ NGUYÊN GIÁ TRỊ — roadmap này không thay thế mà TỔNG HỢP nó vào chung 1 trình tự với Security/Testing (xem Mục 17 Recommended Execution Order). Không lặp lại chi tiết từng REF ở đây.

## 12. Performance Roadmap

Không phải trọng tâm P0/P1 (không có finding performance CRITICAL đang OPEN gây outage) nhưng có 2 mục đáng chú ý nếu có capacity: REF-007 (WorkflowInstance index — SMALL, impact rõ, nên làm cùng đợt REF-001/005 vì risk=0) và REF-021 (`.lean()` + compound index Document/Asset — LOW priority nhưng effort thấp). REF-016 (Excel batch transaction) là đánh đổi CÓ CHỦ ĐÍCH đã document — không refactor cho tới khi có benchmark thật với file lớn.

## 13. Maintainability Roadmap

REF-018 (dọn dead-code tích luỹ — 10 file, xác nhận CONFIRMED dead qua nhiều phase độc lập), REF-019/020 (config/factory hợp nhất), REF-022 (field naming nhất quán), REF-024 (structured logger, dài hạn). Đây là nhóm "làm khi có capacity dư", KHÔNG có deadline áp lực nào — nhưng nên làm SONG SONG với các REF liên quan cùng file (vd dọn `documents.validator.ts` cùng lúc review REF-002) để tránh review 2 lần cùng 1 vùng code.

## 14. Quick Wins

(nhỏ, ít risk, tác động rõ — SMALL effort + LOW risk, không cần điều tra/quyết định nghiệp vụ trước)

| ID | Việc | Impact |
|---|---|---|
| REF-001 | Đóng backdoor rename Role→ADMIN | Đóng CRITICAL |
| REF-005 | Safeguard ADMIN resetPassword | Đóng 1/3 đường account-takeover |
| REF-004 | Bật `authorizePermission` cho proposal (sau audit RBAC data) | Đóng Critical Risk ISS-09 |
| REF-007 | Index WorkflowInstance | Xoá COLLSCAN endpoint tần suất cao |
| REF-009 | Check MedicalDeviceProfile trước hard-delete Asset | Ngăn mất dữ liệu vĩnh viễn |
| REF-014 | Check Asset/AssetAssignmentHistory trước xoá Department | Ngăn dangling reference |
| — | Định nghĩa + gắn `PERFORMANCE_VIEW` (`SEC-37`) | Đóng data exposure |
| — | Loại `isActive` khỏi Asset whitelist (`SEC-35`) | Đóng business-logic bypass |
| — | Escape regex 3 domain (`SEC-36`) | Chống ReDoS |
| — | Escape HTML 2 email template (`SEC-39/40`) | Chống HTML injection |
| — | Nhánh MulterError trong error handler (`SEC-41`) | UX lỗi rõ ràng hơn |
| — | Sửa 3 permission string sai (`SEC-38`) | Khớp thiết kế phân quyền dự kiến |
| TEST-001/002 | Khôi phục toolchain + cứu 4 test suite | Nền tảng an toàn cho MỌI quick win khác |

## 15. Large Initiatives

(nhiều file, nhiều dependency, API/DB impact, cần nhiều test/điều tra/quyết định trước)

| ID | Việc | Lý do LỚN |
|---|---|---|
| REF-002 | Sửa business rule CONFIRM_STATUS | Cần xác nhận nghiệp vụ THẬT trước + rà soát dữ liệu Asset đang kẹt |
| REF-003 | Hard-delete Document/tháng | Cần quyết định chặn cứng hay chuyển soft-delete — breaking API tiềm năng |
| REF-006+011 | Route↔Service boundary (11-13 route) | Breaking change tiềm năng cho pagination đang "hoạt động sai nhưng ổn định" |
| REF-008 | Domain Upload overhaul | Breaking response shape + quyết định xử lý data cũ (`uploadedBy=undefined`) |
| REF-010 | Quyết định ABAC (Activate/Remove) | **LỚN NHẤT toàn kế hoạch** — ảnh hưởng ~103 lệnh gọi `authorizePermission` nếu Activate, cần spike/approval riêng (TASK-C0) trước bất kỳ dòng code nào |
| REF-012 | Hash refresh token | Invalidate toàn bộ session đang hoạt động — cần kế hoạch riêng |
| REF-015 | Chuẩn hoá response format auth/upload | Breaking change cho consumer hiện có (nếu có) |
| REF-016 | Excel batch transaction | Cần hiểu lý do gốc thiết kế cũ + benchmark trước khi đổi |

## 16. Task Candidates

> Số TASK tiếp nối `TASK-001`/`TASK-002` đã có. Chỉ TẠO CANDIDATE ở đây — không tạo file `docs/tasks/TASK-XXX.md` thật trong phase này.

### TASK-003 — Đóng backdoor rename Role→ADMIN
- **Source Finding**: `SEC-28`/`RV02-01`/REF-001
- **Objective**: Tách cơ chế Super-Admin bypass khỏi so khớp chuỗi `role.name`
- **Scope**: `role.model.ts` (thêm field `isSystemRole`), `rbac.service.ts:updateRoleService`, `authorizePermission.middleware.ts`, `seed-rbac.ts`
- **Affected Area**: RBAC / Authorization
- **Priority**: P0 — **Priority**: CRITICAL
- **Risk**: LOW
- **Effort**: SMALL
- **Dependencies**: Không
- **Testing**: TEST-002 (P0, Phase 18) — 4 test case đã định nghĩa sẵn
- **Prerequisites**: Không

### TASK-004 — Safeguard ADMIN cho resetPassword() Users
- **Source Finding**: `SEC-29`/`RV03-01`/REF-005
- **Objective**: Thêm check `role.name==="ADMIN"` đúng docstring đã ghi
- **Scope**: `services/users/users.service.ts:resetPassword`
- **Affected Area**: Users / Authorization
- **Priority**: P0 — CRITICAL
- **Risk**: LOW
- **Effort**: SMALL
- **Dependencies**: Không
- **Testing**: TEST-005 (P0, Phase 18)
- **Prerequisites**: Không

### TASK-005 — Bật lại authorization cho POST /documents/proposal
- **Source Finding**: `SEC-06`/ISS-09/REF-004
- **Objective**: Bỏ comment `authorizePermission("DOCUMENT_CREATE")`
- **Scope**: `routes/documents/document.route.ts`
- **Affected Area**: Documents / Authorization
- **Priority**: P0 — CRITICAL
- **Risk**: LOW (có điều kiện)
- **Effort**: SMALL
- **Dependencies**: Không
- **Testing**: user có/không có `DOCUMENT_CREATE`
- **Prerequisites**: **Audit RBAC data thật** — xác nhận role dự kiến tạo proposal đã được gán `DOCUMENT_CREATE`

### TASK-006 — Khôi phục toolchain Jest + cứu 4 bộ test mồ côi
- **Source Finding**: Phase 18 Mục 18.1-18.2 (ISS-07 cập nhật)
- **Objective**: Cài lại `jest`/`ts-jest`/`@types/jest`, tạo lại `jest.config.js`, thêm script `test`, chuyển 4 file `dist/*.test.js` thành `.test.ts` nguồn, chạy xanh, **commit vào git**
- **Scope**: `package.json`, `jest.config.js` (mới), 4 `__tests__/*.test.ts`
- **Affected Area**: Toàn hệ thống (nền tảng testing)
- **Priority**: P0 — BLOCKER
- **Risk**: LOW
- **Effort**: SMALL
- **Dependencies**: Không — nên làm TRƯỚC hoặc SONG SONG TASK-003/004/005
- **Testing**: Tự thân (chạy `jest` xanh là tiêu chí)
- **Prerequisites**: Không

### TASK-007 — Sửa business rule CONFIRM_STATUS↔PROPOSE_INK
- **Source Finding**: `RV05-01`/ARCH-12/REF-002
- **Objective**: `syncAssetOnDocumentApproved` đọc `referenceSubType` từ `documentRules.ts` thay vì hard-code
- **Scope**: `services/documents/workflow.service.ts`, `shared/constants/documentRules.ts`
- **Affected Area**: Documents / Assets / Business Logic
- **Priority**: P0 — CRITICAL
- **Risk**: MEDIUM
- **Effort**: SMALL (code) + MEDIUM (điều tra dữ liệu)
- **Dependencies**: TASK-006 nên hoàn thành trước (cần test bảo vệ thay đổi business rule đang chạy)
- **Testing**: TEST-003 (P0, Phase 18)
- **Prerequisites**: **BẮT BUỘC xác nhận ý định nghiệp vụ thật với chủ dự án** + rà soát Asset đang kẹt `UNDER_MAINTENANCE` trong dữ liệu hiện có

### TASK-008 — Hard-delete Document/tháng: check tham chiếu ngược
- **Source Finding**: ISS-02/TD-02/REF-003
- **Objective**: Chặn/cảnh báo khi Document còn `WorkflowInstance`/`referenceTo`/`Notification` tham chiếu
- **Scope**: `services/documents/document.service.ts:deleteDocumentsByMonthService`
- **Affected Area**: Documents / Database
- **Priority**: P0 — CRITICAL
- **Risk**: MEDIUM
- **Effort**: MEDIUM
- **Dependencies**: Không
- **Testing**: Document có/không có tham chiếu khi xoá theo tháng
- **Prerequisites**: Quyết định nghiệp vụ: chặn cứng hay soft-delete hàng loạt

### TASK-009 — Domain Upload: khắc phục chuỗi IDOR (4 sub-task B1→B4)
- **Source Finding**: `SEC-30→33`/REF-008
- **Objective**: allowedTypes tường minh, set uploadedBy, filter+phân trang GET, ownership check GET/DELETE
- **Scope**: `services/upload/*`, `controllers/upload/upload.controller.ts`
- **Affected Area**: Upload / File Security
- **Priority**: P1 — HIGH
- **Risk**: MEDIUM-HIGH (breaking response shape)
- **Effort**: MEDIUM
- **Dependencies**: Nên gộp REF-015 (response format) cùng đợt
- **Testing**: TEST-004 (P0 theo Phase 18 — ưu tiên cao dù REF gốc xếp HIGH, vì là red-test trước khi fix)
- **Prerequisites**: Quyết định xử lý record cũ `uploadedBy=undefined`

### TASK-010→TASK-0xx — Nhóm P1/P2/P3 còn lại
Ánh xạ trực tiếp 1-1 theo `docs/16_REFACTORING_PLAN.md` (REF-006→REF-024, trừ các REF đã lên TASK-003→009 ở trên) và các mục Phase 17 Mục 16 chưa gắn REF. Không liệt lại toàn bộ trường chi tiết ở đây — tham chiếu trực tiếp tài liệu gốc theo ID, tạo file `docs/tasks/TASK-0xx.md` CHỈ khi được yêu cầu triển khai cụ thể.

## 17. Recommended Execution Order

```
BƯỚC 0 (điều kiện tiên quyết, làm TRƯỚC MỌI THỨ):
  TASK-006 — Khôi phục toolchain Jest + cứu 4 test suite, commit ngay

STAGE 1 — Critical Security / Data Integrity (P0, Mục 4):
  TASK-003 (REF-001) → TASK-004 (REF-005) → TASK-005 (REF-004, sau audit RBAC data)
  → TASK-008 (REF-003, sau quyết định chặn/soft-delete)
  → TASK-007 (REF-002, sau xác nhận nghiệp vụ + rà soát dữ liệu — làm SAU CÙNG trong Stage 1
    vì cần điều tra nhiều nhất, KHÔNG để việc điều tra này chặn 4 mục nhanh hơn ở trên)

STAGE 2 — Critical Tests / Regression Protection:
  TEST-002, TEST-005 (song song TASK-003/004) → TEST-003 (song song TASK-007)
  → khôi phục TEST-011 (3 bộ test còn lại từ TASK-006)

STAGE 3 — High Priority Functional Issues (P1, Mục 5):
  REF-009 (Asset orphan) → REF-007 (WorkflowInstance index) → SEC-37/SEC-35/SEC-36 (quick wins còn lại)
  → TASK-009/REF-008 (Upload overhaul, sau khi quyết định data cũ)
  → REF-006+011 (Route↔Service boundary, sau rà soát consumer pagination)

STAGE 4 — Architecture / Refactoring (Mục 10-11):
  REF-017 (permission type-safety, sau REF-006 ổn định) → REF-013 (validateParams)
  → REF-014 (Department refs, gộp đợt với REF-009)

STAGE 5 — Performance (Mục 12):
  REF-021 (.lean()+index bổ sung) — xen kẽ bất kỳ lúc nào, risk=0

STAGE 6 — Maintainability (Mục 13):
  REF-018→020 (dead code + config + factory hợp nhất) — làm khi có capacity dư

STAGE 7 — Low Priority Improvements (Mục 7):
  REF-022→024 — không deadline, xen kẽ theo capacity

RIÊNG BIỆT, KHÔNG THUỘC STAGE NÀO (cần quyết định kiến trúc trước khi lên lịch):
  REF-010 (ABAC) — TASK-C0 spike/approval TRƯỚC — có thể xảy ra bất kỳ lúc nào chủ dự án sẵn sàng quyết định,
  KHÔNG phụ thuộc thứ tự Stage 1-7 ở trên
  REF-016 (Excel batch transaction) — cần điều tra + benchmark riêng, độc lập với các Stage khác
```

## 18. Dependencies Between Tasks

```
TASK-006 (test toolchain) ──→ TIỀN ĐỀ AN TOÀN cho TASK-003, 004, 005, 007, 008, 009
                                (không BLOCK về mặt kỹ thuật, nhưng khuyến nghị mạnh làm trước)

TASK-005 (REF-004) ──requires──→ audit RBAC data (role nào giữ DOCUMENT_CREATE)
TASK-007 (REF-002) ──requires──→ xác nhận nghiệp vụ + rà soát dữ liệu Asset kẹt
TASK-008 (REF-003) ──requires──→ quyết định chặn cứng/soft-delete

REF-006 ──┬── REF-011 (cùng route/file, làm chung)
          └── REF-022 (field name, làm SAU REF-006)

REF-009 ──cùng nhóm── REF-014 ("referential integrity sweep", 2 PR riêng nhưng 1 đợt)

REF-008 ──cùng nhóm── REF-015 (đụng cùng file controller/service Upload)

REF-010 (ABAC) ──BLOCKS──→ REF-018 phần loadDocument/permission.descriptors.ts
                            (không dọn dead-code này cho tới khi quyết định Activate/Remove)

REF-012 phần INDEX ──độc lập──; REF-012 phần HASH ──requires──→ kế hoạch invalidate session riêng

REF-017 ──nên làm SAU── REF-006 ổn định (cùng loại "API boundary hardening", không cùng file)
```

## 19. Risks

| Risk | Liên quan | Mức độ |
|---|---|---|
| False sense of security — tưởng ISS-01 đã đóng hết vấn đề privilege-escalation trong khi 2 đường khác (`SEC-28`, `SEC-29`) vẫn mở | Mục 3.1 | **CRITICAL** |
| Sửa REF-002 mà không rà soát dữ liệu Asset đang kẹt trước → sửa nửa vời, dữ liệu cũ vẫn sai dù rule mới đúng | TASK-007 | MEDIUM |
| Bật lại authorization (REF-004/REF-006) mà không audit RBAC data thật trước → chặn nhầm luồng nghiệp vụ đang hoạt động | TASK-005, REF-006 | MEDIUM-HIGH |
| REF-008/REF-015 đổi response shape không xác nhận consumer thật → breaking change không kiểm soát phạm vi | TASK-009, REF-015 | MEDIUM |
| REF-010 triển khai vội, không qua approval + rollout từng phần → rủi ro cao nhất toàn roadmap | REF-010 | **HIGH** nếu làm sai quy trình |
| Không có test tự động (trước TASK-006) xuyên suốt → mọi fix P0/P1 dựa hoàn toàn vào test thủ công, rủi ro bỏ sót case biên tăng theo số lượng task chạy song song | Toàn bộ Stage 1-3 | MEDIUM-HIGH cho tới khi TASK-006 hoàn thành |
| Dữ liệu Role/Permission THẬT ở production chưa xác minh (chỉ audit DB dev) — mức độ nghiêm trọng thực tế của `SEC-28`/`SEC-29`/`SEC-06` phụ thuộc trực tiếp | Toàn bộ Stage 1 | UNKNOWN — cần xác minh trước khi đánh giá lại priority thực tế |

## 20. Final Roadmap

**Trình tự tổng quát** (không lặp chi tiết, xem Mục 17): `TASK-006 (nền tảng test)` → `Stage 1 (5 task Critical)` chạy song song `Stage 2 (test bảo vệ)` → `Stage 3 (High, Upload + API boundary)` → `Stage 4-6 (Architecture/Performance/Maintainability, capacity cho phép)` → `Stage 7 (Low, không deadline)`, với `REF-010 (ABAC)` và `REF-016 (Excel batch)` là 2 nhánh RIÊNG cần quyết định/điều tra độc lập, không chặn các Stage khác.

**Không có task nào được implement trong Phase 19** — đây thuần là bản đồ tổng hợp, chờ chỉ định cụ thể theo từng TASK-ID.

---

**PHASE 19 COMPLETED — không tự động chuyển sang TASK-BASED DEVELOPMENT.**
