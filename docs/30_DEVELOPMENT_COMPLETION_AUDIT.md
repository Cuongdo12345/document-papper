# Development Completion Audit

> Loại: FINAL AUDIT sau DEVELOPMENT STAGE (KHÔNG implement, KHÔNG sửa code, KHÔNG tạo DEV-026+) | Ngày: 2026-09-03.
> Phạm vi đọc: `CLAUDE.md`, `docs/SESSION_HANDOFF.md`, `docs/development/00_DEVELOPMENT_ROADMAP.md`, 25 file `docs/development/tasks/DEV-001.md → DEV-025.md` (đối chiếu khi cần), cộng xác minh trực tiếp source cho từng claim quan trọng (grep có mục tiêu, không đọc lại toàn bộ module-reviews).
> Quy ước bằng chứng dùng trong tài liệu này:
> - **STATIC** = xác nhận bằng đọc trực tiếp source code (grep/Read) trong audit này.
> - **AUTOMATED TEST** = xác nhận bằng `npx jest` (unit/service-level, mock DB — không phải HTTP thật).
> - **HTTP/E2E** = xác nhận bằng request thật qua route — **KHÔNG có** cho bất kỳ DEV-XXX nào trong toàn bộ dự án.
> - **PRODUCTION** = xác nhận trên môi trường production thật — **KHÔNG có quyền truy cập**, mọi mục production trong tài liệu này là UNKNOWN.

---

## 1. Overall Status

- **25/25 development task (DEV-001 → DEV-025) đều ở trạng thái DONE** theo báo cáo task tương ứng — đối chiếu lại với source hiện tại trong audit này, **KHÔNG phát hiện task nào bị revert/thiếu code** so với báo cáo (xem Mục 2, cột "Xác minh lại STATIC").
- `npx tsc --noEmit` → **0 lỗi**. `npx jest` → **15 suite / 87 test PASS** — khớp chính xác con số DEV-025 đã báo cáo cuối cùng.
- `git status`: **96 thay đổi** (74 file tracked modified/deleted qua `git diff --stat`: +6290/-3658 dòng, cộng ~22 mục untracked — chủ yếu file test mới + `docs/` + `CLAUDE.md`) — **CHƯA CÓ COMMIT NÀO** trong toàn bộ 25 task (đúng CLAUDE.md §27, đã tuân thủ xuyên suốt).
- **1 sub-task, ngoài 25 task chính**: `DEV-001A` (Harden Super Admin Identity) — Phase A DONE từ trước; **Phase B ĐÃ HOÀN TẤT (2026-09-12, DEV-047)** — migration script đã chạy + xác nhận (`Role.countDocuments({isSystemRole:true}) === 1`), literal fallback `role.name === "ADMIN"` đã gỡ khỏi ~20 vị trí. Xem `docs/development/tasks/DEV-047.md`.
- **1 task PAUSED, không thuộc 25 task chính**: `DEV-009A` (kích hoạt ABAC domain Document) — đã PLANNED đầy đủ, **0 dòng code**, tạm dừng theo yêu cầu người dùng.
- **Không phát hiện regression tĩnh** ở 10 khu vực được yêu cầu kiểm tra (Mục 4) — nhưng phần lớn xác nhận chỉ ở mức STATIC + AUTOMATED TEST một phần, **KHÔNG có HTTP/E2E nào cho toàn bộ 25 task**.
- **3 UNKNOWN production quan trọng vẫn UNKNOWN** (Mục 7) — chưa từng có evidence xác minh trong suốt cả quá trình Development, không chỉ audit này.

**Kết luận tổng thể**: xem Mục 10.

---

## 2. DEV-001 → DEV-025 Matrix

Cột "Xác minh lại STATIC (audit này)" là bằng chứng **mới**, thu thập trực tiếp trong audit này (không copy lại nguyên văn báo cáo task) — để tránh tự xác nhận vòng tròn.

| DEV | Mục tiêu | Trạng thái báo cáo | Xác minh lại STATIC (audit này) | Automated test | HTTP/E2E |
|---|---|---|---|---|---|
| 001 | Đóng backdoor rename Role→ADMIN | DONE | ✅ Guard `updateRoleService()` còn nguyên (`rbac.service.ts:347-350`) | Có (unit) | Không |
| 002 | Safeguard ADMIN cho `resetPassword()` | DONE | ✅ Guard `targetRole.isSystemRole===true \|\| name==="ADMIN"` còn nguyên (`users.service.ts:459-462`) | Có (unit) | Không |
| 003 | Bật lại `authorizePermission("DOCUMENT_CREATE")` ở `/proposal` | DONE | ✅ Còn nguyên (`document.route.ts:29-33`) | Không có suite riêng | Không |
| 004 | Khôi phục toolchain Jest | DONE | ✅ `jest.config.js` tồn tại (untracked), 15 suite chạy được | — (chính nó là hạ tầng test) | — |
| 005 | Sửa business rule Asset sync (`CHECK_DAMAGE`) | DONE | ✅ `workflow.service.ts:130` dùng đúng `CHECK_DAMAGE` | **KHÔNG có test riêng cho `syncAssetOnDocumentApproved`** — đã ghi nhận từ lúc DONE, vẫn đúng ở audit này | Không |
| 006 | Hard-delete → soft-delete hàng loạt theo tháng | DONE | ✅ `deleteDocumentsByMonthService` dùng soft-delete pattern, có xử lý `referenceTo` (`document.service.ts:487+`) | Không có suite riêng | Không |
| 007 | Domain Upload: đóng chuỗi IDOR (4 sub-item) | DONE | ✅ `uploadedBy` gán khi lưu, ownership check `getFileDetail`/`deleteFile`, scope list theo `isAdminCaller` (`upload.service.ts`, `upload.controller.ts`) | Không có suite riêng | Không |
| 008 | Khôi phục `validateQuery` 13 route + NoSQL injection filter | DONE | ✅ Spot-check `document.route.ts:43` có `validateQuery(QueryDocumentDTO)` | Unit tầng service only — **không xác nhận middleware khi request thật đi qua** (đã tự ghi nhận từ lúc DONE) | Không |
| 009 | Spike ABAC (Activate/Remove) | DECIDED (không code) | ✅ Đúng — 0 dòng code, chỉ quyết định Phương án A | — | — |
| 010 | Asset whitelist + escapeRegex | DONE | ✅ `regex.util.ts` tồn tại, whitelist đã bỏ `isActive` | Không có suite riêng | Không |
| 011 | `PERFORMANCE_VIEW` permission | DONE | ✅ Định nghĩa + gắn route còn nguyên (`performance.routes.ts:22`) | Không có suite riêng | Không |
| 012 | Referential integrity (Department/Asset hard-delete) | DONE | ✅ `Asset.exists()` (`departments.service.ts:221`), `MedicalDeviceProfile.exists()` (`asset.service.ts:248`) còn nguyên | **Không có unit test riêng** — đã tự ghi nhận từ lúc DONE | Không |
| 013 | RBAC/API contract hygiene (permission string, type-safety) | DONE | ✅ `USER_VIEW`/`USER_VIEW_DETAIL`/`DOCUMENT_VIEW_DETAIL` đã đúng catalog | Có (middleware test cập nhật theo) | Không |
| 014 | Auth hardening lớp 2 (hash refresh token, jwt.verify try/catch, CORS fail-fast) | DONE | ✅ `hashResetToken()` dùng ở cả 3 chỗ login/refresh/logout (`auths.service.ts`) | Test cũ không assert giá trị token cụ thể — không xác nhận hành vi mới bằng test riêng (đã tự ghi nhận) | Không |
| 015 | Injection/output hardening (CSV/path traversal/HTML) | DONE | ✅ `html.util.ts` tồn tại | Không có suite riêng | Không |
| 016 | Data integrity còn lại (soft-delete vs Workflow pending, Department validate, disable User↔Asset) | DONE | ✅ Guard `workflowStatus==="pending"` còn nguyên (`document.service.ts:449-454`) | Không có suite riêng | Không |
| 017 | Nhận diện lỗi Multer riêng | DONE | ✅ `err instanceof multer.MulterError` còn nguyên (`error.middleware.ts:108`) | Có (`error.middleware.test.ts`) | Không |
| 018 | Index WorkflowInstance/Document/Asset + sửa metric endpoint | DONE | ✅ 3 index còn nguyên (`workflowInstance.model.ts:63`, `document.model.ts:202`, `asset.model.ts:101`) | Không có suite riêng — **chưa `explain()` xác nhận IXSCAN thật trên DB có dữ liệu** (đã tự ghi nhận từ lúc DONE) | Không |
| 019 | Chuẩn hoá `.env.example` | DONE | ✅ `CLIENT_URL` hợp nhất 1 dòng, còn nguyên | — (không phải code TS) | — |
| 020 | Điều tra Excel batch transaction (không đổi code) | DONE (spike) | ✅ Đúng — 0 dòng code, đã benchmark thật, user chọn giữ nguyên | — | — |
| 021 | Password/token policy + input validation (bundle 10 finding) | DONE | ✅ `JWT_SECRET`/`JWT_REFRESH_SECRET` fail-fast còn nguyên (`server.ts:42,46`) | Có — 6 file test mới + mở rộng | Không |
| 022 | RBAC edge-case (denyPermissions ADMIN, VersionError) | DONE | ✅ `runAssignmentTransaction()` bắt `VersionError` còn nguyên (`assetAssignment.service.ts:48-54`) | Có (`assetAssignment.service.test.ts`, `permission.service.test.ts`) | Không |
| 023 | Dọn dead code + hợp nhất duplicate config | DONE | ✅ Cả 5 file đã xoá xác nhận **KHÔNG tồn tại** trên đĩa | — (bản chất là xoá code chết, không test) | Không |
| 024 | Cân nhắc structured logger (investigation-only) | DONE | ✅ Đúng — không có `winston`/`pino` trong `package.json`, vẫn `console.*` | — | — |
| 025 | API response consistency (ARCH-17/21/23/31) | DONE | ✅ `totalPage`→`totalPages` còn nguyên cả 4 vị trí; TOCTOU fix Excel import còn nguyên (`Document.findOne(...).session(session)` bên trong `withTransaction`) | Có (`excel.service.test.ts`, 3 test) | Không |

**Không có task nào bị PARTIAL/DEFERRED trong 25 task chính khi đối chiếu lại với source hiện tại.** Toàn bộ scope đã báo cáo DONE đều còn nguyên trong source — không phát hiện dấu hiệu bị revert hoặc undo ngoài ý muốn.

**2 mục PARTIAL/PAUSED nằm NGOÀI 25 task đánh số chính thức:**

| Mục | Trạng thái | Ghi chú |
|---|---|---|
| `DEV-001A` (Harden Super Admin Identity) | **DONE** — Phase A + Phase B (2026-09-12, DEV-047) | `Role.isSystemRole` đã thêm; migration script `backend/scripts/migrate-system-role-flag.ts` đã chạy + xác nhận (`Role.countDocuments({isSystemRole:true}) === 1`, chỉ role ADMIN). ~20 vị trí trước dùng pattern OR (`isSystemRole===true \|\| name==="ADMIN"`) nay CHỈ còn `isSystemRole===true` — literal fallback đã gỡ hoàn toàn. |
| `DEV-009A` (Kích hoạt ABAC domain Document) | **PAUSED**, 0% code | Xác nhận lại STATIC: `grep "enablePolicies" routes/**` → 0 kết quả — khớp chính xác trạng thái đã báo cáo (chưa wire gì). Không phải regression, là PAUSED có chủ đích theo yêu cầu người dùng. |

---

## 3. Remaining Issues

Tổng hợp toàn bộ "Remaining Issues"/"Finding ngoài scope" đã ghi nhận rải rác qua 25 task + `SESSION_HANDOFF.md`. Trạng thái xác nhận lại trong audit này (STATIC), KHÔNG tự xử lý.

| Finding | Ghi nhận từ task | Trạng thái xác nhận lại | Loại |
|---|---|---|---|
| Bulk-delete-by-month (`DELETE /delete-by-month`) thiếu ADMIN-only guard | DEV-006 | **CÒN TỒN TẠI** — route chỉ có `authorizePermission("DOCUMENT_DELETE")`, không check role. **Đính chính 1 chi tiết**: ghi nhận gốc nói "role USER cũng có DOCUMENT_DELETE" — xác minh lại `rolePermission.map.ts` hiện tại cho thấy **không có role nào tên "USER"**; role non-ADMIN thực sự giữ `DOCUMENT_DELETE` là `IT` (dòng 98). Bản chất finding vẫn đúng (non-ADMIN bulk-soft-delete được), chỉ tên role trong ghi chú cũ không chính xác. | Cần task mới nếu muốn xử lý |
| `RV05-07` — TOCTOU dò trùng đề xuất sửa chữa Asset (`document.service.ts:createDocuments`, `PROPOSE_REPAIR`) | Ghi nhận ở DEV-025 (Remaining Issues, "ngoài scope") | **CÒN TỒN TẠI** — xác nhận lại: `findPendingRepairProposalForAsset()` (dòng 124-125) chạy TRƯỚC `withTransaction` (dòng 138), cùng pattern TOCTOU mà ARCH-21 đã sửa ở Excel import nhưng KHÔNG áp dụng ở đây (DEV-025 chỉ trong scope Excel import). | Cần task mới nếu muốn xử lý (cùng họ với ARCH-21 đã fix) |
| `ARCH-09` — Upload controller không dùng `catchAsync`/`ApiError` chuẩn | Ghi nhận ở DEV-021, nhắc lại ở DEV-025 | **CÒN TỒN TẠI** — `upload.controller.ts:14` vẫn `try {` thủ công, không qua error middleware tập trung | Technical debt, chưa có task |
| `GET /api/users`, `GET /api/users/:id` — không role nào giữ `USER_VIEW`/`USER_VIEW_DETAIL` | DEV-013 | **CÒN TỒN TẠI** — xác nhận lại: 0 kết quả `USER_VIEW` trong `rolePermission.map.ts` (chỉ có 1 dòng comment out) | Business decision UNKNOWN, chưa hỏi user |
| `ARCH-02`/`ARCH-03` (Excel/middleware gọi thẳng Model domain khác) | Ghi nhận ở DEV-023 | Không đổi (finding gốc tự nhận không có recommendation cụ thể) | Technical debt thuần |
| `ARCH-35` (2 cấu hình Multer riêng biệt) | Ghi nhận ở DEV-023 | Không đổi (finding gốc tự nhận "chấp nhận được") | Technical debt thuần |
| Chưa có unit test cho `departments.service.ts` (check Asset)/`asset.service.ts` (check MedicalDeviceProfile) | DEV-012 | **CÒN TỒN TẠI** — vẫn 0 test file cho 2 service này | Test gap |
| Chưa có test cho `syncAssetOnDocumentApproved` (DEV-005) | SESSION_HANDOFF | **CÒN TỒN TẠI** — `workflow.service.test.ts` không có case cho hàm này | Test gap, RỦI RO CAO nhất trong danh sách test gap (đây là fix P0 business-logic) |
| `RefreshToken.expiresAt` không được `refresh()` kiểm tra trực tiếp | SESSION_HANDOFF (tồn đọng cũ) | Không xác minh lại trong audit này (ngoài phạm vi 25 task, chưa từng lên DEV-XXX) | UNKNOWN — cần task riêng nếu muốn xử lý |
| File Upload cũ (trước DEV-007) thiếu `uploadedBy` | DEV-007 | UNKNOWN — cần audit DB thật để biết còn bao nhiêu bản ghi | Cần data remediation, không phải code |

**Phân loại tổng quát**: phần lớn Remaining Issues là **technical debt đã biết, cố ý không sửa vì ngoài scope lúc đó** — không phải finding bị bỏ sót do audit này mới phát hiện. Không có Remaining Issue nào được audit này xử lý (đúng yêu cầu "KHÔNG tự xử lý Remaining Issues").

---

## 4. Regression Status

Kiểm tra STATIC + kết quả `npx jest` cho 10 khu vực được yêu cầu — **không chạy HTTP/E2E** (không có sẵn trong dự án).

| Khu vực | STATIC | Automated test | Kết luận |
|---|---|---|---|
| Authentication/RBAC | `updateRoleService`, `resetPassword`, `authorizePermission` guard đều còn nguyên; `isSystemRole` OR-pattern nhất quán ở 11 vị trí | `auths.service.test.ts`, `authorizePermission.middleware.test.ts`, `permission.service.test.ts`, `auth.helper.test.ts` PASS | Không phát hiện regression |
| Documents | Route/DTO/validate còn nguyên; `syncAssetOnDocumentApproved` dùng đúng `CHECK_DAMAGE` | `workflow.service.test.ts` PASS (nhưng KHÔNG cover `syncAssetOnDocumentApproved` — xem Mục 3) | Không phát hiện regression ở phần CÓ test; phần KHÔNG có test (business-logic core) chỉ xác nhận được ở mức STATIC |
| Workflow | Index `{status:1, createdAt:1}` còn nguyên; guard `workflowStatus==="pending"` còn nguyên | `workflow.service.test.ts` PASS | Không phát hiện regression |
| Assets | `runAssignmentTransaction`/`VersionError` handling, `Asset.exists`/`MedicalDeviceProfile.exists` còn nguyên | `assetAssignment.service.test.ts` PASS — nhưng `asset.service.ts`/`departments.service.ts` KHÔNG có unit test | Không phát hiện regression ở phần CÓ test |
| Upload | `uploadedBy`, ownership check, response wrapper `{success,...}` còn nguyên | **0 test suite cho domain Upload** | Chỉ xác nhận STATIC, không có automated test nào bảo vệ domain này |
| Users/Departments | Permission catalog đúng; `RefreshToken.updateMany` trong `changePassword`/`resetPassword` còn nguyên | `users.service.test.ts`, `departments.dto.test.ts` PASS | Không phát hiện regression |
| Notifications | Không có thay đổi nào trong 25 task chạm tới domain này ngoài `escapeHtml` (DEV-015) | Không có suite riêng | Không xác minh — ngoài phạm vi 25 task |
| Audit | `UserAudit.create()` trong `changePassword`/`resetPassword` còn nguyên | Cover gián tiếp qua `users.service.test.ts` | Không phát hiện regression |
| Dashboard | Không có thay đổi trực tiếp trong 25 task | Không có suite riêng | Không xác minh — ngoài phạm vi 25 task |
| Excel/PDF | ARCH-21 TOCTOU fix còn nguyên, nhánh `dryRun` không đổi | `excel.service.test.ts` (3 test, riêng cho ARCH-21) PASS | Không phát hiện regression ở phần CÓ test |
| API/OpenAPI | `openAPI.yaml` parse hợp lệ (xác nhận bằng `js-yaml` trong audit này) | — | Không phát hiện lỗi cú pháp; **KHÔNG đối chiếu lại 100% field-by-field với implementation trong audit này** (ngoài phạm vi audit, chỉ parse YAML hợp lệ) |

**Tổng kết Mục 4**: `npx jest` xanh toàn bộ (15/15 suite) cho các khu vực CÓ test — không có evidence regression ở bất kỳ khu vực nào. Tuy nhiên **Upload, Dashboard, Notifications, và phần core của Documents (`syncAssetOnDocumentApproved`) không có automated test bảo vệ** — kết luận "không regression" ở các khu vực này chỉ dựa trên STATIC (đọc code), không phải test tự động.

---

## 5. Security Final Status

Đối chiếu các nhóm finding quan trọng nhất trước Development (Phase 09/17/20/23) với source hiện tại.

| Finding | Trạng thái | Bằng chứng |
|---|---|---|
| Privilege escalation lên ADMIN qua `PUT /api/users/:id` (SEC-05/ISS-01) | **FIXED** (trước cả 25 task, TASK-001/002) | Guard còn nguyên, xác nhận lại STATIC |
| Backdoor rename Role→"ADMIN" (SEC-28/RV02-01) | **FIXED** (DEV-001) | Guard còn nguyên trong `updateRoleService()` |
| `resetPassword()` thiếu safeguard ADMIN (SEC-29/RV03-01) | **FIXED** (DEV-002) | Guard còn nguyên |
| Upload IDOR chain (SEC-30→33/RV09-01→04) | **FIXED** (DEV-007) | `uploadedBy`, ownership check, MIME whitelist, pagination còn nguyên |
| NoSQL injection qua query object (SEC-13, 13 route) | **FIXED** (DEV-008) | `validateQuery` wired lại, xác nhận spot-check | 
| Query validation bị comment (`IMP-011`) | **FIXED** (DEV-008) | Cùng bằng chứng trên |
| Document deletion/reference (hard-delete → soft-delete, ISS-02) | **FIXED** (DEV-006) | Soft-delete pattern còn nguyên |
| Referential integrity Department/Asset hard-delete (ARCH-05) | **FIXED** (DEV-012) | `Asset.exists`/`MedicalDeviceProfile.exists` còn nguyên |
| Workflow → Asset synchronization (`CHECK_DAMAGE`, RV05-01/ARCH-12, CRITICAL business bug) | **FIXED** (DEV-005) | `workflow.service.ts` dùng đúng `CHECK_DAMAGE`; **CẢNH BÁO: KHÔNG có automated test riêng cho hàm này** — FIXED chỉ ở mức STATIC + đã audit DB dev 1 lần (2 Asset UNDER_MAINTENANCE, 0 bị kẹt) |
| Permission mismatch (3 permission string sai catalog, MEDIUM-04) | **FIXED** (DEV-013) | `USER_VIEW`/`USER_VIEW_DETAIL`/`DOCUMENT_VIEW_DETAIL` đúng catalog |
| Password policy yếu, JWT secret không fail-fast, JWT payload dư (SEC-01→04) | **FIXED** (DEV-021) | Fail-fast + min(8) còn nguyên |
| TOCTOU dò trùng lặp khi import Excel (ARCH-21) | **FIXED** (DEV-025) | Đọc trong transaction, còn nguyên |
| TOCTOU dò trùng đề xuất sửa chữa Asset (RV05-07) | **OPEN** — chưa từng có DEV-XXX | Xác nhận lại STATIC (Mục 3) — cùng loại lỗi với ARCH-21 nhưng ở domain khác, chưa fix |
| Bulk-delete-by-month thiếu ADMIN-only guard | **OPEN** — chưa từng có DEV-XXX | Xác nhận lại STATIC (Mục 3) |
| ABAC dead runtime (SEC-07/ISS-03) | **PARTIALLY OPEN** — quyết định Activate (DEV-009) nhưng chưa code (DEV-009A PAUSED) | Xác nhận lại STATIC: `enablePolicies` vẫn 0 kết quả trong routes |
| `denyPermissions` vô tác dụng với ADMIN (RV02-02) | **DOCUMENTED, INTENTIONALLY NOT FIXED** | DEV-022 — đúng theo recommendation gốc (không phải lỗ hổng mở rộng quyền, chỉ inconsistency) |

**Không phát hiện security finding nào trước đây được báo FIXED mà nay lại OPEN (không có regression bảo mật).**

---

## 6. Test Status

- `npx tsc --noEmit`: **0 lỗi**, chạy trong audit này.
- `npx jest`: **15 test suite, 87/87 test PASS**, chạy trong audit này — khớp chính xác con số DEV-025 công bố, không có suite/test nào bị mất hoặc fail kể từ DEV-025.
- Loại test trong 25 task gốc CHỈ có unit/service-level (Jest + mock DB/model) — **0 integration test, 0 HTTP/E2E test** trên toàn bộ 116 endpoint. Đây là giới hạn đã biết từ Phase 18/22, KHÔNG được đóng bởi bất kỳ DEV-XXX nào trong 25 task gốc (không nằm trong scope roadmap khi đó). **CẬP NHẬT (2026-09-12, DEV-048)**: đã dựng khung E2E (supertest + `mongodb-memory-server`, RIÊNG khỏi unit suite) + 10 test cho luồng CRITICAL nhất (auth/RBAC/department-scoping + toàn bộ chuỗi Document→Workflow→sync Asset, DEV-005). Vẫn CHƯA phủ hết 116 endpoint (không nằm trong phạm vi đã thống nhất với user — xem `docs/development/tasks/DEV-048.md`).
- **Domain hoàn toàn không có test**: Upload, Dashboard, Notifications, Departments (service), Assets (service — chỉ có `assetAssignment.service.test.ts`, không có `asset.service.ts`/`assetCategory.service.ts`).
- **Fix quan trọng KHÔNG có automated test riêng**: `syncAssetOnDocumentApproved` (DEV-005, business-logic CRITICAL) — đây là gap rủi ro cao nhất trong toàn bộ test coverage, vì đây chính là fix cho bug nghiêm trọng nhất trong toàn bộ risk register.

---

## 7. Production UNKNOWN

Không có quyền truy cập production trong phiên làm việc này hoặc bất kỳ phiên nào trước đó của toàn bộ Development Stage. Giữ nguyên UNKNOWN, **KHÔNG suy đoán**:

| Mục | Trạng thái | Ghi chú |
|---|---|---|
| Production RBAC data (role nào thực sự giữ permission nào) | **UNKNOWN** | Chỉ đã audit DB **dev** (1 lần, cho DEV-003/DEV-005). Ảnh hưởng trực tiếp mức độ nghiêm trọng thực tế của DEV-001/002/003/013. |
| Production MongoDB có phải replica set | **UNKNOWN** | Điều kiện bắt buộc để `withTransaction()` hoạt động đúng — ảnh hưởng DEV-005/006/012/016/022/025 (mọi chỗ dùng transaction). Dev đã xác nhận là replica set 1 node (DEV-020 benchmark), production chưa xác nhận. |
| Reverse proxy / static upload serving | **UNKNOWN** | Ảnh hưởng mức độ nghiêm trọng thực tế của DEV-007 (Upload). |
| Existing uploaded files (bao nhiêu file thiếu `uploadedBy` từ trước DEV-007) | **UNKNOWN** | Cần audit DB production trực tiếp, chưa làm. |
| HTTP/E2E production workflow (luồng tạo→duyệt→sync Asset chạy đúng trên production thật) | **UNKNOWN** | Chưa từng test qua HTTP thật ở BẤT KỲ môi trường nào (kể cả dev), chỉ có unit test + audit DB tĩnh. |
| `Role.isSystemRole` đã migrate trên dev/production chưa | **UNKNOWN (khả năng cao là CHƯA, dựa trên ghi chú cũ)** | `SESSION_HANDOFF.md` ghi nhận lần audit gần nhất (DEV-003) thấy `isSystemRole===false` trên DB dev — audit này KHÔNG có quyền truy cập DB để xác nhận lại, giữ nguyên trạng thái ghi nhận cũ, không nâng lên CONFIRMED. |

**Không có mục UNKNOWN nào được nâng lên CONFIRMED trong audit này — đúng yêu cầu.**

---

## 8. Technical Debt

Các mục đã xác nhận là technical debt thuần (không phải bug, không phải lỗ hổng), cố ý không xử lý trong Development Stage:

- `ARCH-02`/`ARCH-03` — Excel/middleware gọi thẳng Model domain khác thay vì qua Service (quan sát kiến trúc, không có recommendation cụ thể).
- `ARCH-35` — 2 cấu hình Multer riêng biệt (finding gốc tự nhận "chấp nhận được ở quy mô hiện tại").
- `ARCH-09` — domain Upload không dùng `catchAsync`/`ApiError` chuẩn (lệch convention, không phải lỗ hổng).
- Thiếu structured logger (ARCH-30) — quyết định CHỦ Ý giữ nguyên `console.*` (DEV-024), có điều kiện rõ ràng để mở lại (khi có kế hoạch scale).
- `database.ts` — vài đoạn docstring dư thừa (RV00-06 đã lỗi thời, không phải dead code thật — xác nhận ở DEV-023).
- Thiếu unit test cho nhiều service (`departments.service.ts`, `asset.service.ts`, `assetCategory.service.ts`, domain Upload/Dashboard/Notifications toàn bộ).

---

## 9. Risks Requiring Follow-up

Xếp theo mức độ ưu tiên nên cân nhắc (không phải lệnh thực thi — chỉ là điểm rủi ro còn mở):

1. **`syncAssetOnDocumentApproved` (DEV-005) không có automated test** — đây là fix cho bug CRITICAL nghiêm trọng nhất đã tìm thấy trong toàn bộ 23 tài liệu phân tích; hiện tại KHÔNG có gì tự động phát hiện nếu logic này bị regression trong tương lai.
2. **RV05-07 (TOCTOU domain Asset, đề xuất sửa chữa trùng lặp)** — cùng loại lỗi với ARCH-21 đã fix ở Excel import, nhưng chưa có task nào xử lý ở domain Asset.
3. **Bulk-delete-by-month thiếu ADMIN-only guard** — role `IT` (non-ADMIN) hiện có thể soft-delete hàng loạt Document theo tháng.
4. ~~`DEV-001A` Phase B chưa hoàn thành~~ — **ĐÃ XONG (2026-09-12, DEV-047)**: `isSystemRole` giờ là nguồn sự thật DUY NHẤT cho security identity, literal fallback đã gỡ.
5. ~~0 HTTP/E2E test trên toàn bộ 116 endpoint~~ — **MỘT PHẦN ĐÃ ĐÓNG (2026-09-12, DEV-048)**: khung E2E + 10 test cho luồng CRITICAL nhất (auth/RBAC/department-scoping + Document→Workflow→sync Asset). Vẫn còn phần lớn 116 endpoint chưa có E2E — chỉ nền tảng + luồng quan trọng nhất, theo đúng phạm vi user chọn.
6. **3 UNKNOWN production** (Mục 7) — đặc biệt RBAC data thật và MongoDB replica set, ảnh hưởng trực tiếp độ tin cậy của nhiều fix (DEV-001/002/003/013 phụ thuộc RBAC data; DEV-005/006/012/016/022/025 phụ thuộc replica set cho transaction).
7. **`GET /api/users` vẫn 403 với mọi non-ADMIN** — business decision chưa được hỏi/xác nhận với người dùng, có thể là hành vi mong muốn hoặc là 1 bug chức năng chưa lộ ra.

---

## 10. Recommendation

**DEVELOPMENT COMPLETE WITH OPEN RISKS**

Căn cứ:
- Toàn bộ 25/25 development task theo roadmap đã DONE, xác nhận lại bằng STATIC evidence trong audit này — không phát hiện task nào bị thiếu, revert, hay regression so với báo cáo gốc.
- `npx tsc --noEmit` (0 lỗi) và `npx jest` (15/15 suite, 87/87 test) đều PASS thật, chạy trực tiếp trong audit này.
- Không có security finding nào trước đây FIXED mà nay quay lại OPEN.
- **Nhưng** vẫn còn: (a) 2 finding cùng họ với các finding đã fix nhưng ở phạm vi khác chưa được xử lý (RV05-07, bulk-delete guard); (b) 1 fix business-logic CRITICAL (DEV-005) không có automated test bảo vệ; (c) 3 UNKNOWN production chưa từng được xác minh trong suốt cả quá trình; (d) hoàn toàn không có HTTP/E2E test; (e) 1 sub-task an ninh (DEV-001A) chỉ hoàn thành 1 nửa.

Không mục nào trong số này là bằng chứng của lỗi mới hay regression — tất cả đều là giới hạn **đã biết và đã ghi nhận từ trước**, không phải phát hiện mới của audit này. Vì vậy không đủ căn cứ để kết luận "NOT COMPLETE" (scope đã cam kết đều đã hoàn thành đúng), nhưng cũng không thể kết luận "COMPLETE" không kèm điều kiện — vì các rủi ro ở Mục 9 vẫn hiện diện thật trong source production sẽ chạy.
