# 23 — FINAL CODE REVIEW ROADMAP

> Loại: Tổng hợp CUỐI CÙNG xuyên toàn bộ code review (KHÔNG phải 1 phase/review mới, KHÔNG đọc lại toàn bộ source) | Ngày: 2026-08-31 | KHÔNG sửa code.
>
> **Nguồn đã đọc**: `CLAUDE.md`, `docs/00_PROJECT_MEMORY.md`, toàn bộ `docs/module-reviews/*.md` (17 file — dùng trực tiếp cho finding ID gốc `RVxx-yy`, không đọc lại toàn văn những gì đã được `docs/20/21/22` tổng hợp đầy đủ kèm evidence, đúng SKILL.md Rule 04/07), `docs/20_GLOBAL_SECURITY_REVIEW.md` (toàn văn), `docs/21_GLOBAL_ARCHITECTURE_REVIEW.md` (toàn văn, bản đã hợp nhất `ARCH-01→35`), `docs/22_GLOBAL_TESTING_REVIEW.md` (toàn văn). Tham chiếu thêm `docs/16_REFACTORING_PLAN.md`, `docs/17_SECURITY_HARDENING_PLAN.md`, `docs/19_IMPROVEMENT_ROADMAP.md` để giữ nhất quán ID/priority đã có, không lặp lại nội dung.
>
> **Nguyên tắc dedup**: 1 lỗ hổng/vấn đề thật chỉ xuất hiện 1 lần trong bảng Critical/High/Medium/Low chính — dùng ID xuất hiện SỚM NHẤT làm ID chính (`SEC-xx`/`ARCH-xx` ưu tiên hơn `RVxx-yy` khi đã dedup ở `docs/20`/`docs/21`), các nguồn khác ghi ở cột "Xác nhận/mở rộng bởi". Không tạo finding mới nếu không có evidence trực tiếp trong 1 trong các tài liệu đã đọc.
>
> **Phân loại P0-P3 dùng trong tài liệu này**: P0=CRITICAL, P1=HIGH, P2=MEDIUM, P3=LOW — theo đúng severity đã gán ở `docs/20`/`docs/21` (dựa trên impact bảo mật/data-integrity/kiến trúc, KHÔNG dựa trên effort thực thi — effort/risk/dependency được xử lý riêng ở Mục 13 "Suggested Order").

---

## 1. Executive Summary

Sau 23 tài liệu (13-phase baseline + 17 module review + 6 tài liệu tổng hợp: Global Security/Architecture/Testing Review, Phase 14-19), dự án có bức tranh đầy đủ, nhất quán, không còn finding CRITICAL/HIGH nào chưa được đối chiếu evidence. Tổng kết:

- **2 finding CRITICAL** (P0) — 1 đã RESOLVED (`SEC-05`), 1 vẫn OPEN (`SEC-28`/`RV02-01` — backdoor rename Role→ADMIN) + **1 vấn đề business-logic mức CRITICAL riêng biệt** (`RV05-01`/`ARCH-12` — bug CONFIRM_STATUS đang chạy sai lặng lẽ, không phải lỗ hổng bảo mật nhưng cùng mức độ nghiêm trọng).
- **14 finding HIGH** (P1): 10 security + 4 architecture (`ARCH-04/05/06/27`), dẫn đầu bởi chuỗi IDOR domain Upload (4 finding liên kết) và thiếu authorization/scoping tập trung.
- **~28 finding MEDIUM** (P2), **~27 finding LOW** (P3) — chi tiết Mục 5-6.
- **Testing**: 0 test khả dụng (toolchain bị gỡ khỏi git), 11/14 domain nghiệp vụ hoàn toàn không có test — đây là ĐIỀU KIỆN TIÊN QUYẾT phải xử lý trước khi sửa bất kỳ finding CRITICAL/HIGH nào ở trên một cách an toàn.
- **Kiến trúc**: không circular dependency (xác nhận 4 lần độc lập), nhưng 5 vấn đề hệ thống lặp lại ≥3 domain (thiếu scoping tập trung, referential integrity 1 chiều, ranh giới Route↔Service không type-safe, kỷ luật dọn dead-code không đều, data-access layer không nhất quán).

**Kết luận điều hành**: dự án ở trạng thái đã phân tích đầy đủ, hành động thực thi = 0. Rủi ro lớn nhất không phải "còn sót lỗ hổng chưa biết" mà là **khoảng cách giữa biết và làm** — cụ thể nhất là **3 đường account-takeover ADMIN độc lập** (chỉ 1 đã đóng) và **1 bug business-rule đang chạy sai không ai phát hiện vì không throw lỗi nào**.

## 2. Module Review Status

| ID | Module | Status | Output |
|---|---|---|---|
| REVIEW-00 | Foundation/Cross-cutting | ✅ DONE | `00_FOUNDATION_CODE_REVIEW.md` |
| REVIEW-01 | Authentication | ✅ DONE | `01_AUTH_CODE_REVIEW.md` |
| REVIEW-02 | RBAC | ✅ DONE | `02_RBAC_CODE_REVIEW.md` |
| REVIEW-03 | Users & UserAudit | ✅ DONE | `03_USERS_CODE_REVIEW.md` |
| REVIEW-04 | Departments | ✅ DONE | `04_DEPARTMENTS_CODE_REVIEW.md` |
| REVIEW-05 | Documents + Workflow | ✅ DONE | `05_DOCUMENTS_CODE_REVIEW.md` |
| REVIEW-06 | Assets (toàn bộ) | ✅ DONE | `06_ASSETS_CODE_REVIEW.md` |
| REVIEW-07 | Dashboard | ✅ DONE | `07_DASHBOARD_CODE_REVIEW.md` |
| REVIEW-08 | Excel Import/Export | ✅ DONE | `08_IMPORT_EXPORT_CODE_REVIEW.md` |
| REVIEW-09 | Upload | ✅ DONE | `09_UPLOAD_CODE_REVIEW.md` |
| REVIEW-10 | Notifications | ✅ DONE | `10_NOTIFICATION_CODE_REVIEW.md` |
| REVIEW-11 | Performance monitoring | ✅ DONE | `11_PERFORMANCE_CODE_REVIEW.md` |
| REVIEW-12 | Database cross-domain | ✅ DONE | `16_DATABASE_CROSS_DOMAIN_REVIEW.md` (tên file lệch, xem `CODE_REVIEW_INDEX.md`) |
| REVIEW-13 | API contract/OpenAPI | ✅ DONE | `15_API_CONTRACT_REVIEW.md` (tên file lệch) |
| REVIEW-14 | Config/Dependencies/Build | ✅ DONE | `14_CONFIG_CODE_REVIEW.md` |
| REVIEW-15 (ad-hoc) | Cron/Background Jobs | ✅ DONE | `12_CRON_CODE_REVIEW.md` |
| REVIEW-16 (ad-hoc) | Shared library | ✅ DONE | `13_SHARED_CODE_REVIEW.md` |

**17/17 module review DONE (100%)**. 3 tài liệu tổng hợp global (Security/Architecture/Testing) + Phase 14→19 cũng đã hoàn thành — không còn phase/review nào TODO. Tài liệu này là bước tổng hợp CUỐI CÙNG trước khi chuyển hẳn sang TASK-BASED DEVELOPMENT.

## 3. Critical Findings (P0)

### C-01 — Rename Role thành `"ADMIN"` → backdoor persistence toàn quyền
- **Finding**: `SEC-28` (= `RV02-01`, = `CRITICAL-01` trong `docs/20_GLOBAL_SECURITY_REVIEW.md`)
- **File**: `backend/src/services/rbac/rbac.service.ts`
- **Function/Class**: `updateRoleService()`; nhánh Super-Admin bypass trong `backend/src/middlewares/authorizePermission.middleware.ts`
- **Evidence**: `docs/module-reviews/02_RBAC_CODE_REVIEW.md` (`RV02-01`) — không có guard nào chặn đổi `Role.name` thành/khỏi chuỗi `"ADMIN"`; cơ chế bypass chỉ so khớp CHUỖI `role.name==="ADMIN"`, không so `_id`/cờ hệ thống.
- **Impact**: Backdoor persistence — độc lập hoàn toàn với `SEC-05`/ISS-01 đã fix (TASK-001/002 không hề đụng tới đường tấn công này).
- **Recommendation**: Tách bypass khỏi so khớp chuỗi (cờ `isSystemRole` bất biến hoặc `_id` cố định) + chặn `updateRoleService()` đổi tên role hệ thống/đổi tên role khác thành "ADMIN". Kế hoạch: `docs/16_REFACTORING_PLAN.md` REF-001.

### C-02 — Business rule `CONFIRM_STATUS` không bao giờ đồng bộ Asset đúng (đang chạy sai lặng lẽ)
- **Finding**: `RV05-01` (= `ARCH-12` trong `docs/21_GLOBAL_ARCHITECTURE_REVIEW.md`)
- **File**: `backend/src/shared/constants/documentRules.ts`, `backend/src/services/documents/workflow.service.ts`
- **Function/Class**: `syncAssetOnDocumentApproved()`
- **Evidence**: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` — `documentRules.ts` khai `CONFIRM_STATUS.referenceSubType=PROPOSE_INK`, nhưng `syncAssetOnDocumentApproved` hard-code tìm `subType:PROPOSE_REPAIR`; củng cố bởi 2 bằng chứng độc lập khác (`RV07-05` Dashboard KPI, `RV08-06` Excel import/export) đều đồng thuận `CONFIRM_STATUS↔PROPOSE_INK` đúng.
- **Impact**: Asset kẹt vĩnh viễn `UNDER_MAINTENANCE` sau khi duyệt xong 1 nhánh nghiệp vụ cụ thể — KHÔNG throw lỗi nào (try/catch im lặng), workflow báo "approved" bình thường; Dashboard KPI hiển thị số liệu sai theo.
- **Recommendation**: `syncAssetOnDocumentApproved` đọc `referenceSubType` từ `documentRules.ts` (single source of truth) — **BẮT BUỘC xác nhận nghiệp vụ thật + rà soát dữ liệu Asset đang kẹt trước khi sửa** (CLAUDE.md §19). Kế hoạch: REF-002.

### C-02b — (đã RESOLVED, ghi nhận để đối chiếu) Privilege escalation `PUT /api/users/:id`
- **Finding**: `SEC-05` (= ISS-01) — ✅ RESOLVED 2026-08-30 (TASK-001/002)
- **Ghi chú**: Không tính vào số P0 đang OPEN, nhưng PHẢI nêu ở đây vì dễ gây "false sense of security" — nhiều người đọc tưởng nhầm C-01 cũng đã đóng theo. 2 finding là 2 con đường ĐỘC LẬP tới cùng hậu quả.

## 4. High Findings (P1)

| ID | Finding gốc | File/Function | Evidence tóm tắt | Impact | Recommendation |
|---|---|---|---|---|---|
| H-01 | `SEC-29`/`RV03-01` | `users.service.ts:resetPassword()` | Docstring nói chặn ADMIN, code không có check | Account-takeover ADMIN đường thứ 3 | Thêm `role.name==="ADMIN"` guard (REF-005) |
| H-02 | `SEC-06`/`RV05-02`/ISS-09 | `document.route.ts` `POST /proposal` | `authorizePermission("DOCUMENT_CREATE")` bị comment, xác nhận 3 lần độc lập | Bất kỳ user login nào tạo được proposal | Bỏ comment, audit RBAC data trước (REF-004) |
| H-03 | `SEC-07`/ISS-03 | `authorizePermission.middleware.ts`, `loadDocument.middleware.ts`, `Policy.model.ts` | 103/103 lệnh gọi không truyền `enablePolicies`/`resource`/`action`; `loadDocument` không gắn route nào | Mất hoàn toàn tầng resource-level authorization | Quyết định Activate/Remove ABAC (REF-010, cần spike riêng) |
| H-04 | `SEC-13`/ISS-04 | `rbac.service.ts`, `departments.service.ts`, `userAudits.service.ts`, `users.service.ts:getList` | Gán thẳng query string vào Mongo filter, không ép kiểu | NoSQL operator injection tiềm năng | Khôi phục `validateQuery` + whitelist field (REF-006+011) |
| H-05 | `SEC-34`/`RV05-04` | `document.service.ts:getAllDocumentsService/getDocumentDetailService` | Không nhận/so `callerDepartment` (khác `updateDocumentService` CÓ check) | Rò rỉ dữ liệu Document liên phòng ban | Xác nhận chủ đích nghiệp vụ, bổ sung filter nếu cần |
| H-06 | ISS-02/`RV05-05` | `document.service.ts:deleteDocumentsByMonthService` | `deleteMany` không check `WorkflowInstance`/`referenceTo`/`Notification` | Dangling reference vĩnh viễn, Critical Risk (Phase 12) | Check tham chiếu trước xoá hoặc soft-delete (REF-003) |
| H-07 | `SEC-35`/`RV06-01` | `assets.dto.ts`, `ASSET_UPDATE_WHITELIST`, `updateAssetService` | `isActive` không bị loại trừ khỏi whitelist (khác `status`/`assignedTo`) | Bypass guard soft-delete chỉ cần `ASSET_UPDATE` | Loại `isActive` khỏi whitelist (quick fix) |
| H-08 | `SEC-36`/`RV06-02` | `departments.service.ts`, `rbac.service.ts`, `asset.service.ts`, `assetCategory.service.ts` | `$regex` không qua `escapeRegex` (khác Documents đã có) | ReDoS, bề mặt rộng nhất ở Asset (chỉ cần `ASSET_VIEW`) | Áp dụng `escapeRegex` sẵn có |
| H-09 | `SEC-30→33`/`RV09-01→04` | `upload.middleware.ts`, `upload.service.ts`, `upload.controller.ts` | Chuỗi 4 finding: không giới hạn type, không `uploadedBy`, không filter, không ownership check | IDOR đầy đủ, domain File Security yếu nhất hệ thống | REF-008 (4 sub-task, breaking change) |
| H-10 | `SEC-37`/`RV11-01` | performance dashboard route+controller | Chỉ `authenticate`, không `authorizePermission`; đính chính Phase 05 ghi sai | Dashboard hiệu năng toàn hệ thống public cho mọi user login | Định nghĩa + gắn `PERFORMANCE_VIEW` |
| H-11 | `ARCH-04` | Cụm Documents↔Assets↔Notifications↔RBAC | Coupling sâu nhất hệ thống, không event bus/abstraction trung gian | 1 thay đổi enum/rule phải đồng bộ tay ≥4 điểm — root cause cho phép C-02 tồn tại | Không refactor cấu trúc vội — ghi nhận kiến trúc, ưu tiên xử lý C-02 trước |
| H-12 | `ARCH-05` | ≥4 vị trí độc lập (Document/Asset/Department/User) | Referential integrity chỉ validate chiều "tạo", không có chiều "huỷ" | Data-integrity risk hệ thống, không phải lỗi cục bộ | Pattern sửa thống nhất: `Model.exists({ref})` trước xoá/disable (REF-003/009/014) |
| H-13 | `ARCH-06` | Documents/Assets/Dashboard scoping | Không có cơ chế authorization/scoping tập trung (root cause = ABAC dead) | Enforcement không nhất quán 3 domain độc lập | Cùng quyết định với H-03 (REF-010) |
| H-14 | `ARCH-27` | `document.service.ts`, `users.service.ts:getList`, `notification.controller.ts` | Service ngầm phụ thuộc coercion Middleware không type-safe | Root cause bug pagination 3 domain, đã XẢY RA THẬT | Khôi phục `validateQuery` + Service tự parse an toàn (REF-006) |

## 5. Medium Findings (P2)

**Nhóm Security** (từ `docs/20` Mục 3, giữ nguyên ID, không lặp evidence đầy đủ — xem file gốc):

`MEDIUM-01` (`SEC-10`, 11-13 route `validateQuery` comment), `MEDIUM-02` (`RV04-01`, Department delete refs), `MEDIUM-03` (`RV16-01`/`SEC-42`, MedicalDeviceProfile orphan vĩnh viễn — data integrity KHÔNG THỂ KHÔI PHỤC), `MEDIUM-04` (3 permission string sai catalog), `MEDIUM-05` (`RV01-02`, refresh token plaintext), `MEDIUM-06` (`RV01-01`, `jwt.verify` không try/catch), `MEDIUM-07` (`SEC-15`, CSV formula injection), `MEDIUM-08` (`SEC-16`, path traversal filename), `MEDIUM-09` (`SEC-21`, CORS fallback `*`), `MEDIUM-10` (`RV10-02`/`SEC-39/40`, HTML injection email), `MEDIUM-11` (`RV05-06`, soft-delete Document không chặn WorkflowInstance pending), `MEDIUM-12` (`RV16-02`, Department validate skip), `MEDIUM-13` (`RV08-01`/`SEC-41`, MulterError không nhận diện riêng).

**Nhóm Architecture bổ sung** (từ `docs/21`, chưa trùng danh sách trên):

| ID | File/Function | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| `ARCH-01` | `assetDashboard.service.ts`/`medicalDeviceDashboard.service.ts` | Import thẳng Model domain khác, bỏ qua Service | Layer violation, rủi ro thấp (chỉ đọc) | Không cấp thiết, ghi nhận |
| `ARCH-07` | `excel.service.ts` (996 dòng) | Đa domain trong 1 file | Cohesion thấp, khó bảo trì | Tách theo domain khi có dịp refactor |
| `ARCH-10` | `workflow.service.ts` | Không tách `.validator/.mapper/.query.ts` như `document.service.ts` | Bất nhất quán trong cùng domain | Áp dụng lại pattern Documents khi refactor có kiểm soát |
| `ARCH-14` | `permission.descriptors.ts` | Duplicate data-definition RBAC, dữ liệu SAI | Rủi ro nếu bị import nhầm (sẽ crash) | Dọn dead-code (REF-018) |
| `ARCH-18` | `workflow.service.ts` | Side-effect (Notification/Asset sync) ngoài transaction, CHỦ ĐÍCH | Cộng dồn rủi ro với C-02 khi lỗi thật xảy ra | Giám sát/log rõ khi side-effect lỗi |
| `ARCH-20` | `excel.service.ts` (import Document) | N+1 transaction/dòng, CHỦ ĐÍCH | Ranh giới transaction không khớp ranh giới nghiệp vụ | Điều tra trước khi đổi (REF-016) |
| `ARCH-22` | Toàn hệ thống | `.query.ts` chỉ có ở domain `documents` | 2 biến thể kiến trúc song song không tài liệu hoá | Không refactor vội, ghi nhận cho domain mới |
| `ARCH-24` | 11-13 route | `validateQuery` bị comment không đồng đều | Tiền đề H-04/H-08 | REF-006 |
| `ARCH-25` | `authorizePermission.middleware.ts` | Permission string không ràng buộc kiểu | Cho phép drift (đã xảy ra — MEDIUM-04) | REF-017 |
| `ARCH-28` | `.env.example` | Desync với biến thực dùng (`MONGO_MAX_POOL_SIZE` thiếu, `CLIENT_URL` trùng) | Rủi ro cấu hình sai khi deploy môi trường mới | Chuẩn hoá lại (REF-019) |
| `ARCH-29` | `rbac.routes.ts`, `department.routes.ts` | `validateParams(IdParamDTO)` thiếu nhất quán | Đường đi lỗi không đoán trước được | REF-013 |
| `ARCH-33` | `services/upload/` | Cohesion thấp validate/business/middleware | Domain Upload lệch nhiều convention nhất | Đồng bộ khi làm REF-008 |

## 6. Low Findings (P3)

**Security**: `SEC-01/02/03/04/09/11/12/17/22/23`, `RV02-02` (denyPermissions vô tác dụng ADMIN), `RV06-08` (VersionError concurrency), `RV16-03` (disable User không sync Asset.assignedTo).

**Architecture**: `ARCH-02/03/08/11/13/17/21/23/26/30/31/34/35` (dead-code tích luỹ, cache nhân đôi, rate-limiter/Multer trùng cấu hình, structured logger thiếu, field naming lệch — xem `docs/21` Mục 11 để tra cứu đầy đủ).

**INFO/đối trọng tích cực** (không phải finding, ghi nhận để khách quan): `SEC-19/20/24/26`, `RV02-04`, `RV09-09`, `ARCH-16/19/32`, không circular dependency (xác nhận 4 lần độc lập), 87/116 endpoint khớp OpenAPI tuyệt đối, Asset domain xử lý pagination đúng duy nhất.

## 7. Security Priorities

Theo đúng thứ tự đã chốt ở `docs/17_SECURITY_HARDENING_PLAN.md` Mục 16 (không đổi): (1) `SEC-28` — đóng backdoor Role rename; (2) `SEC-29` — safeguard resetPassword; (3) `SEC-06` — bật lại proposal auth; (4) `SEC-37` — gắn PERFORMANCE_VIEW; (5) `SEC-30→33` — Upload IDOR chain; (6) `MEDIUM-04` — sửa 3 permission string; (7) `SEC-35` — Asset whitelist; (8) `SEC-10`/`SEC-13` — validateQuery + NoSQL injection; (9) `SEC-36`/`SEC-14` — escape regex; (10) `MEDIUM-10` — HTML email; (11) `MEDIUM-03`/`RV16-01` — MedicalDeviceProfile guard; (12) `MEDIUM-13` — MulterError; (13) `MEDIUM-05` — hash refresh token; (14) `MEDIUM-07` — CSV injection; (15) config fail-fast; (16) quyết định ABAC (H-03/H-13, LARGE, cần approval riêng).

## 8. Architecture Priorities

Theo `docs/21_GLOBAL_ARCHITECTURE_REVIEW.md` Mục 0 + `docs/15_ARCHITECTURE_REVIEW.md` Mục 17: (1) ràng buộc kiểu `authorizePermission()` (`ARCH-25`, REF-017); (2) cắt coupling ngầm Route↔Service (`ARCH-27`, REF-006 — root cause bug ĐANG XẢY RA); (3) **quyết định số phận ABAC** (`ARCH-06`/H-03/H-13 — quyết định kiến trúc lớn nhất còn treo, KHÔNG được để "vừa không dùng vừa không gỡ" kéo dài); (4) chuẩn hoá `.env.example` (`ARCH-28`); (5) structured logger nếu có kế hoạch scale (`ARCH-30`); (6) nhân rộng pattern `.validator/.mapper/.query.ts` cho `workflow.service.ts` khi có dịp refactor có kiểm soát (`ARCH-10`, liên hệ `ARCH-04`).

## 9. Performance Priorities

| Finding | File/Function | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| ISS-05/`RV05-08` | `workflowInstance.model.ts` | Không index ngoài `_id`, `$expr` COLLSCAN ở `GET /workflows/pending` (tần suất cao) | High Risk hiệu năng, endpoint dùng nhiều | Thêm `{status:1}` index (REF-007, SMALL/LOW risk — nên làm ngay) |
| PERF-03/`RV07-02` | `document.model.ts`, `asset.model.ts` | Thiếu index `isActive` — ảnh hưởng cả Document (đã biết) VÀ Asset (mở rộng phạm vi mới) | Aggregate Dashboard chậm khi dữ liệu lớn | Compound index `{isActive,deletedAt,createdAt}` (REF-021) |
| `RV11-02` | `apiPerformance.model.ts`/middleware | `endpoint` ghi theo `req.route.path` KHÔNG gồm `req.baseUrl` — gộp lẫn nhiều domain vào cùng nhóm thống kê | Bug TÍNH ĐÚNG của chính dashboard hiệu năng | Sửa cách ghi `endpoint` để bao gồm `baseUrl` |
| `ARCH-13` | `dashboard.service.ts` | `runPaginatedAggregate` cài đặt riêng thay vì dùng bản chung | Sửa logic `$facet` chung cần sửa 3 nơi | REF-021 (dọn khi có capacity) |
| `ARCH-20`/`RV08-*` | `excel.service.ts` (import Document) | N+1 transaction/dòng, ĐÁNH ĐỔI CÓ CHỦ ĐÍCH | Không phải bug, nhưng effort cao nếu đổi | REF-016 — điều tra + benchmark trước khi đổi, KHÔNG vội |
| `RV06-07` | Cron alert jobs | N+1 Role/User query | Có thể chậm khi số lượng User/Role lớn | Ghi nhận, chưa cấp thiết (LOW) |

## 10. Testing Priorities

Theo `docs/22_GLOBAL_TESTING_REVIEW.md` (đầy đủ nhất về domain coverage) + `docs/18_TESTING_STRATEGY.md` (đầy đủ nhất về roadmap kỹ thuật):

- **Blocker tuyệt đối**: toolchain Jest không cài đặt được (`jest.config.js` bị xoá khỏi git ở `5b58fb1`) — PHẢI khôi phục trước khi viết bất kỳ test nào (`TASK-006`/`TEST-001/002`).
- **6/14 domain P0** (Auth, RBAC, Users, Documents, Workflow, Upload) — gắn trực tiếp C-01/C-02/H-01/H-02/H-05/H-06/H-09 ở trên.
- **4 bộ test đã từng viết** (`dist/*.test.js`, mồ côi, chưa commit git) — nguy cơ mất vĩnh viễn, ưu tiên cứu ngay lập tức song song lúc khôi phục toolchain.
- **3 domain P1** (Departments, Assets, Medical Device) — 0 test hiện tại.
- **5 domain P2** (Assignment, Import, Export, Dashboard, Notification) — 0 test hiện tại, rủi ro thấp hơn nhưng vẫn CONFIRMED.

## 11. Refactoring Priorities

Toàn bộ `docs/16_REFACTORING_PLAN.md` (24 candidate REF-001→024, 8 đợt thực hiện) GIỮ NGUYÊN GIÁ TRỊ — không lặp lại chi tiết. Mapping nhanh P0-P1 ở trên → REF: C-01→REF-001, C-02→REF-002, H-01→REF-005, H-02→REF-004, H-06→REF-003, H-09→REF-008, H-03/H-13→REF-010 (LỚN NHẤT, cần spike riêng), H-14→REF-006, H-04→REF-006+011, H-07→(quick fix, chưa có REF riêng, gộp vào REF cùng nhóm Asset), H-08→(escape regex, quick fix), `MEDIUM-02`→REF-014, `MEDIUM-03`→REF-009.

## 12. Recommended Tasks

Kế thừa nguyên vẹn `docs/19_IMPROVEMENT_ROADMAP.md` Mục 16 (`TASK-003→010`), bổ sung việc gắn tường minh finding Architecture mới hợp nhất (`H-11→H-14`) vào đúng TASK đã có (không tạo TASK mới trùng lặp):

| TASK | Finding đóng | Priority | Effort | Risk |
|---|---|---|---|---|
| TASK-003 | C-01 (`SEC-28`) | P0 | SMALL | LOW |
| TASK-004 | H-01 (`SEC-29`) | P0 | SMALL | LOW |
| TASK-005 | H-02 (`SEC-06`) | P0 | SMALL | LOW (cần audit RBAC data) |
| TASK-006 | Toolchain test + cứu 4 suite mồ côi | P0 — BLOCKER | SMALL | LOW |
| TASK-007 | C-02 (`RV05-01`) | P0 | SMALL (code) + MEDIUM (điều tra) | MEDIUM |
| TASK-008 | H-06 (ISS-02) | P0 | MEDIUM | MEDIUM |
| TASK-009 | H-09 (`SEC-30→33`) + gộp `ARCH-33` | P1 | MEDIUM | MEDIUM-HIGH (breaking) |
| TASK-010 | H-14 (`ARCH-27`) + H-04 (`SEC-13`) | P1 | MEDIUM | MEDIUM (breaking pagination) |
| TASK-011 (MỚI) | H-03/H-13 (ABAC — `SEC-07`/`ARCH-06`) | P1 | LARGE | **HIGH**, cần spike/approval riêng (TASK-C0) trước |
| TASK-012 (MỚI) | H-07 (`SEC-35`), H-08 (`SEC-36`) | P1 | SMALL mỗi việc | LOW |

Các REF/SEC còn lại (P2/P3) đủ nhỏ để làm task đơn lẻ khi được yêu cầu cụ thể — không liệt kê hết ở đây (xem Mục 16 `docs/19_IMPROVEMENT_ROADMAP.md`).

## 13. Suggested Order

```
BƯỚC 0 (bắt buộc trước mọi thứ): TASK-006 — khôi phục toolchain Jest + cứu 4 test suite, commit ngay

STAGE 1 — P0 Critical (Security + Data Integrity):
  TASK-003 (C-01) → TASK-004 (H-01) → TASK-005 (H-02, sau audit RBAC data)
  → TASK-008 (H-06, sau quyết định chặn/soft-delete)
  → TASK-007 (C-02, SAU CÙNG trong stage này — cần điều tra nhiều nhất, xác nhận nghiệp vụ trước)

STAGE 2 — P1 High, nhóm quick-fix trước (risk thấp):
  TASK-012 (H-07, H-08 — SMALL/LOW, làm ngay)
  → H-10 (SEC-37, PERFORMANCE_VIEW)
  → REF-007 (ISS-05, WorkflowInstance index — an toàn tuyệt đối)
  → REF-009/REF-014 (H-12/ARCH-05, referential integrity sweep)

STAGE 3 — P1 High, nhóm breaking-change (cần điều tra/audit trước):
  TASK-010 (H-14+H-04, Route↔Service boundary — rà soát consumer pagination trước)
  → TASK-009 (H-09, Upload overhaul — quyết định xử lý data cũ trước)

STAGE 4 — Quyết định kiến trúc lớn (độc lập, không chặn Stage 1-3):
  TASK-011 (H-03/H-13, ABAC — spike/approval TRƯỚC bất kỳ dòng code nào)

STAGE 5 — P2 Medium: theo nhóm liên quan (RBAC misconfig → Data integrity → Injection/Email → Performance index)

STAGE 6 — P3 Low + Maintainability: dọn dead-code, chuẩn hoá config, structured logger — không deadline, xen kẽ theo capacity
```

## 14. Risk Matrix

| Finding | Likelihood khai thác | Impact nếu xảy ra | Mức độ tổng hợp |
|---|---|---|---|
| C-01 (`SEC-28`) | THẤP trên DB dev hiện tại (chỉ ADMIN giữ `ROLE_UPDATE`), **UNKNOWN cho production** | CRITICAL (full bypass vĩnh viễn) | **CRITICAL** |
| C-02 (`RV05-01`) | CHẮC CHẮN (100% — bất kỳ CONFIRM_STATUS nào cũng trigger) | HIGH (data integrity, KPI sai, không tự phát hiện) | **CRITICAL** |
| H-01 (`SEC-29`) | THẤP trên DB dev, **UNKNOWN production** | CRITICAL (account-takeover ADMIN) | **HIGH-CRITICAL** |
| H-09 (Upload IDOR) | TRUNG BÌNH (chỉ cần permission phổ biến `UPLOAD_FILES`/`VIEW_FILES`) | HIGH (rò rỉ + xoá file người khác), phụ thuộc hạ tầng serve tĩnh (UNKNOWN) | **HIGH** |
| H-06 (hard-delete Document) | TRUNG BÌNH (cần `DOCUMENT_DELETE` + thao tác xoá theo tháng — ít dùng nhưng có sẵn) | HIGH (mất dữ liệu vĩnh viễn, dangling reference) | **HIGH** |
| `MEDIUM-03` (MedicalDeviceProfile orphan) | THẤP (cần `ASSET_DELETE_PERMANENT`, permission hiếm) | **KHÔNG THỂ KHÔI PHỤC** khi xảy ra | **HIGH** (dù likelihood thấp, impact tối đa) |
| Testing gap (toàn bộ) | CHẮC CHẮN (đang xảy ra, không phải rủi ro tương lai) | Khuếch đại MỌI risk khác — không có lưới an toàn khi sửa | **HIGH** (multiplier risk) |
| H-03/H-13 (ABAC dead) | Không tự nó là lỗ hổng — là ĐIỀU KIỆN cho phép H-05/RV06-04/RV07-01 tồn tại | MEDIUM-HIGH dài hạn nếu không quyết định | **MEDIUM-HIGH** |

## 15. Development Roadmap

Trình tự tổng quát (không lặp chi tiết — xem Mục 13): **TASK-006 (nền tảng test)** → **Stage 1 (5 task P0 Critical)** → **Stage 2 (P1 quick-fix)** chạy song song **Stage 3 (P1 breaking-change, cần rà soát trước)** → **Stage 4 (quyết định ABAC, độc lập)** → **Stage 5-6 (P2/P3, theo capacity)**.

Đây là bản tổng hợp CUỐI CÙNG của toàn bộ quá trình review (13-phase + 17 module review + 6 tài liệu global/phase 14-19). Không có finding mới nào được tạo ra trong tài liệu này ngoài việc dedup/tổ chức lại — mọi ID đều truy được gốc về 1 trong các tài liệu đã đọc. Không có code nào được sửa.

---

**FINAL CODE REVIEW ROADMAP COMPLETED.**
