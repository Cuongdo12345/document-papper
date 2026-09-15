# Phase 16 — Refactoring Plan

> Ngày: 2026-08-31. Chuyển các architecture/technical-debt finding ĐÃ XÁC MINH (Phase 11, Phase 12, Phase 14, Phase 15, và các module review liên quan) thành kế hoạch refactoring AN TOÀN. **KHÔNG IMPLEMENT trong tài liệu này** — chỉ lập kế hoạch. Không sửa source, không cài package, không tự chạy Phase 17.
>
> **Nguồn đã đọc**: `CLAUDE.md`, `SKILL.md`, `docs/00_PROJECT_MEMORY.md`, `docs/14_ANALYSIS_AUDIT.md`, `docs/15_ARCHITECTURE_REVIEW.md` (đọc toàn văn, tự viết trước đó), `docs/11_TECHNICAL_DEBT.md` (đọc toàn văn — TD-01→30), `docs/12_ISSUES_AND_RISKS.md` (đã đọc TOP 10 + risk matrix ở Phase 14, không đọc lại toàn văn — đúng SKILL.md Rule 04). Không đọc `13_FINAL_PROJECT_REPORT.md` (không cần — TD/ISS đã đủ evidence). Không inspect source mới ngoài việc đối chiếu file path đã có sẵn trong các tài liệu trên (đúng SKILL.md Rule 07/10 — global-scope work ưu tiên review document).

---

## 1. Objective

Biến các finding đã CONFIRMED (không phải suy đoán, không phải style preference) thành danh sách refactor có cấu trúc: phạm vi rõ, rủi ro rõ, effort ước lượng, thứ tự thực hiện an toàn. Ưu tiên finding có evidence TRỰC TIẾP từ source (không phải "có thể viết đẹp hơn"). Bao gồm cả finding MỚI phát sinh SAU Phase 11/12 (từ 16 module review + Global Security/Architecture Review + Phase 14/15) mà TD-01→30/ISS-01→10 gốc chưa có — ghi rõ nguồn khi không trùng ID cũ.

---

## 2. Refactoring Principles

Theo đúng CLAUDE.md §12/§26 và SKILL.md §9/§24:

- Chỉ refactor có EVIDENCE cụ thể (File + Function + Observed Behavior) — không refactor vì "style preference" hay "generic best practice".
- Ưu tiên: **NHỎ > DỄ REVIEW > DỄ KIỂM THỬ > DỄ HOÀN TÁC**.
- Không gộp nhiều finding không liên quan vào 1 refactor lớn (không "mega-refactor").
- Không thay đổi API contract/database/business rule mà không có phê duyệt rõ ràng.
- Không làm yếu authentication/authorization trong lúc refactor (kể cả tạm thời).
- Mỗi refactor phải có Rollback Consideration cụ thể, không chung chung.
- Refactor CRITICAL/HIGH liên quan bảo mật ưu tiên effort THẤP trước (fix nhanh, rủi ro thấp) hơn là chờ 1 giải pháp "hoàn hảo" effort CAO.

---

## 3. Refactoring Candidates

Tổng hợp 22 candidate (REF-001→022), nguồn gốc:

| Nguồn | Số candidate liên quan |
|---|---|
| TD-01→30 (Phase 11, đã có Priority sẵn) | 16 candidate trực tiếp ánh xạ |
| ISS-01→10 (Phase 12 TOP 10, qua SEC-xx cross-ref) | Trùng phần lớn với TD (không tính riêng) |
| Finding MỚI sau Phase 11/12 (module review + Global Review + Phase 14/15) | 6 candidate mới: `RV02-01`, `RV05-01`, `RV03-01`, `RV09-01→04`, `RV16-01`, `ARCH-27` |

**Không đưa vào kế hoạch** (đã RESOLVED, không cần refactor): TD-01/ISS-01/SEC-05 (privilege escalation `PUT /users/:id`) — đã fix ở TASK-001/002, xác nhận lại `14_ANALYSIS_AUDIT.md` Mục 2.

---

## 4. Critical Refactoring

### REF-001 — Đóng đường backdoor "rename Role thành ADMIN"

- **Area**: Authorization / RBAC (`services/rbac/rbac.service.ts`)
- **Problem**: `updateRoleService()` không có guard chặn đổi `Role.name` thành/khỏi chuỗi `"ADMIN"`. Cơ chế Super-Admin bypass (`authorizePermission.middleware.ts`) chỉ so khớp CHUỖI `role.name === "ADMIN"`, không so `_id`/cờ hệ thống riêng.
- **Evidence**: `RV02-01` (`docs/module-reviews/02_RBAC_CODE_REVIEW.md`), tái xác nhận CRITICAL/OPEN ở `docs/20_GLOBAL_SECURITY_REVIEW.md` §1, `docs/14_ANALYSIS_AUDIT.md` Mục 10.
- **Current Behavior**: 1 user có `ROLE_UPDATE` có thể đổi tên Role ADMIN hiện tại sang tên khác, rồi đổi tên 1 Role khác thành `"ADMIN"` — tạo backdoor persistence độc lập với ISS-01 (đã fix).
- **Target Behavior**: Bypass Super-Admin không còn phụ thuộc CHUỖI tên có thể sửa qua API — dùng cờ hệ thống bất biến (vd `isSystemRole: true`, không expose qua `UpdateRoleDTO`) hoặc `_id` cố định đã seed sẵn; đồng thời `updateRoleService()` chặn đổi `name` thành `"ADMIN"` (trừ chính role hệ thống) và chặn đổi TÊN của role hệ thống đó.
- **Affected Files**: `models/rbac/role.model.ts` (thêm field), `services/rbac/rbac.service.ts:updateRoleService`, `middlewares/authorizePermission.middleware.ts` (đổi điều kiện bypass), `backend/scripts/seed-rbac.ts` (set cờ cho role ADMIN gốc).
- **Functions/Classes**: `updateRoleService`, nhánh Super-Admin bypass trong `authorizePermission`.
- **Dependencies**: Không phụ thuộc REF khác — độc lập, có thể làm ngay.
- **API Impact**: `PUT /api/rbac/roles/:id` — thêm validate, KHÔNG đổi request/response shape hiện có (chỉ thêm rejection case mới).
- **Database Impact**: Thêm 1 field trên `Role` model (không destructive, có default). Cần 1 lần migration/script gán `isSystemRole:true` cho Role ADMIN hiện tại trong mọi môi trường (dev/prod).
- **Security Impact**: TÍCH CỰC — đóng CRITICAL vulnerability còn mở duy nhất chưa được TASK-001/002 xử lý.
- **Testing Strategy**: Test case (1) đổi tên role ADMIN gốc → phải reject; (2) đổi tên role khác thành "ADMIN" → phải reject; (3) update role thường (không liên quan tên) vẫn hoạt động bình thường; (4) xác nhận bypass vẫn hoạt động đúng cho role ADMIN gốc sau khi thêm cờ.
- **Risk**: LOW — thay đổi cô lập trong 1 hàm + 1 điều kiện middleware, không đụng luồng khác.
- **Effort**: SMALL.
- **Priority**: **CRITICAL**.
- **Rollback Consideration**: Revert 1 commit; nếu đã chạy migration set cờ, cờ dư thừa không gây hại nếu rollback (field vô hại khi middleware quay về so khớp string cũ).

### REF-002 — Sửa mâu thuẫn business rule `CONFIRM_STATUS` khiến Asset không bao giờ đồng bộ

- **Area**: Business Logic (`shared/constants/documentRules.ts` ↔ `services/documents/workflow.service.ts`)
- **Problem**: `DOCUMENT_RULES.CONFIRM_STATUS.referenceSubType = PROPOSE_INK` nhưng `syncAssetOnDocumentApproved()` hard-code tìm proposal `subType: PROPOSE_REPAIR` — 2 nguồn định nghĩa cùng 1 rule, không có single-source-of-truth, khiến nhánh sync Asset không bao giờ chạy đúng cho `CONFIRM_STATUS`.
- **Evidence**: `RV05-01` (CRITICAL, `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md`), củng cố độc lập bởi `RV07-05` (Dashboard KPI) và `RV08-06` (Excel import/export) — cả 2 đồng thuận `CONFIRM_STATUS↔PROPOSE_INK` đúng, `workflow.service.ts` lệch. Kiến trúc root-cause: `ARCH-12` (`docs/21_GLOBAL_ARCHITECTURE_REVIEW.md`).
- **Current Behavior**: Asset từng chuyển `UNDER_MAINTENANCE` qua `PROPOSE_REPAIR` kẹt vĩnh viễn sau khi CONFIRM_STATUS được duyệt — không lỗi nào lộ ra (try/catch im lặng), workflow báo "approved" bình thường.
- **Target Behavior**: `workflow.service.ts:syncAssetOnDocumentApproved` đọc `referenceSubType` TỪ `documentRules.ts` (single source of truth) thay vì hard-code lại — loại bỏ khả năng lệch pha trong tương lai.
- **Affected Files**: `services/documents/workflow.service.ts`, `shared/constants/documentRules.ts`.
- **Functions/Classes**: `syncAssetOnDocumentApproved`.
- **Dependencies**: **BẮT BUỘC xác nhận ý định nghiệp vụ THẬT với chủ dự án trước khi sửa** (không tự suy đoán theo CLAUDE.md §19) — đây là điều kiện tiên quyết, không phải refactor thuần code.
- **API Impact**: Không đổi request/response shape — chỉ đổi hành vi nội bộ khi approve workflow cuối bước.
- **Database Impact**: **CẦN RÀ SOÁT DỮ LIỆU HIỆN CÓ trước khi sửa** — có thể đã tồn tại `CONFIRM_STATUS` document tạo trong quá khứ tham chiếu sai/bị chặn hoàn toàn; Asset nào đang kẹt `UNDER_MAINTENANCE` do bug này cần xác định để cân nhắc data-fix riêng (ngoài phạm vi code refactor).
- **Security Impact**: Không trực tiếp — nhưng KPI/dashboard dựa trên trạng thái Asset sai lệch có thể ảnh hưởng quyết định vận hành.
- **Testing Strategy**: Test tạo `PROPOSE_REPAIR` → duyệt → Asset chuyển `UNDER_MAINTENANCE` → tạo `CONFIRM_STATUS` đúng reference → duyệt xong → xác nhận Asset chuyển đúng trạng thái cuối (`IN_USE`/`DISPOSED`).
- **Risk**: **MEDIUM** — đây là thay đổi business rule đang chạy, ảnh hưởng dữ liệu Asset thật, cần rà soát dữ liệu hiện có trước khi deploy.
- **Effort**: SMALL (code) nhưng đi kèm effort điều tra dữ liệu MEDIUM.
- **Priority**: **CRITICAL** (impact nghiệp vụ + đã CONFIRMED bởi 3 bằng chứng độc lập).
- **Rollback Consideration**: Revert code dễ; nhưng nếu đã chạy data-fix cho Asset bị kẹt, cần backup trạng thái Asset trước khi sửa để có thể khôi phục nếu rule đổi hướng lại.

### REF-003 — Hard-delete Document theo tháng không kiểm tra tham chiếu ngược

- **Area**: Database / Document access (`services/documents/document.service.ts`)
- **Problem**: `deleteDocumentsByMonthService` gọi `Document.deleteMany(query)` không transaction, không check `WorkflowInstance.documentId`/`Document.referenceTo[]`/`Notification.resourceId`.
- **Evidence**: TD-02 (Phase 11), ISS-02 (Phase 12, Critical Risk, vẫn OPEN theo `14_ANALYSIS_AUDIT.md` Mục 15), `RV05-05`/`RV05-10`.
- **Current Behavior**: Xoá hàng loạt để lại dangling reference vĩnh viễn trên 3 model khác, không throw lỗi nào.
- **Target Behavior**: Thêm guard tương tự `countReportsByProposal` (đã áp dụng tốt ở xoá đơn lẻ) — chặn hoặc cảnh báo khi còn tham chiếu, HOẶC chuyển sang soft-delete hàng loạt để nhất quán với domain khác.
- **Affected Files**: `services/documents/document.service.ts:deleteDocumentsByMonthService`, `services/documents/documents.query.ts:deleteDocumentsByFilter`.
- **Functions/Classes**: `deleteDocumentsByMonthService`, `deleteDocumentsByFilter`.
- **Dependencies**: Cần quyết định nghiệp vụ: chặn cứng hay cảnh báo hay chuyển soft-delete — quyết định này ảnh hưởng tới UX của tính năng "xoá theo tháng" hiện có, cần xác nhận với chủ dự án (tính năng này tự nhận trong comment là "P2.9 — Business Improvement, chưa xử lý validation").
- **API Impact**: `DELETE /api/documents/delete-by-month` — có thể đổi từ 200 (luôn thành công) sang 409 (nếu chặn) khi còn tham chiếu — BREAKING CHANGE tiềm năng cho bất kỳ automation nào đang gọi endpoint này, cần rà soát.
- **Database Impact**: Thêm query kiểm tra trước `deleteMany` — tăng nhẹ thời gian xử lý, không ảnh hưởng schema.
- **Security Impact**: Không trực tiếp — nhưng giảm data-integrity risk đã xếp Critical Risk ở Phase 12.
- **Testing Strategy**: Test xoá tháng có Document đang được `WorkflowInstance`/`referenceTo` khác tham chiếu → phải bị chặn/cảnh báo; test xoá tháng không có tham chiếu → vẫn hoạt động bình thường.
- **Risk**: MEDIUM (thay đổi hành vi API hiện có, cần rà soát consumer).
- **Effort**: MEDIUM.
- **Priority**: **CRITICAL** (Critical Risk theo Phase 12, chưa xử lý qua nhiều phase).
- **Rollback Consideration**: Revert code dễ; không có data migration nên rollback an toàn tuyệt đối.

---

## 5. High Priority Refactoring

### REF-004 — Thêm `authorizePermission("DOCUMENT_CREATE")` cho `POST /documents/proposal`

- **Area**: Authorization (`routes/documents/document.route.ts`)
- **Problem**: Dòng `authorizePermission` bị comment — bất kỳ user login nào cũng tạo được Document proposal.
- **Evidence**: TD-03 (Phase 11), ISS-09 (Phase 12, Critical Risk), xác nhận ĐỘC LẬP 3 lần (`SEC-06`, `RV05-02`, `15_API_CONTRACT_REVIEW.md` §6.3) — vẫn OPEN qua toàn bộ audit (`14_ANALYSIS_AUDIT.md` Mục 15).
- **Current/Target Behavior**: Bỏ comment 1 dòng — target là route yêu cầu đúng permission như 4 route khác trong cùng file.
- **Affected Files**: `routes/documents/document.route.ts`.
- **Functions/Classes**: Route definition `POST /proposal`.
- **Dependencies**: Cần xác nhận role nào hiện đang giữ `DOCUMENT_CREATE` trong DB thật TRƯỚC khi bật — nếu role dự kiến tạo proposal (vd `USER` thường) chưa được gán permission này, bật lên sẽ chặn nhầm luồng nghiệp vụ đang hoạt động.
- **API Impact**: `POST /api/documents/proposal` — có thể trả 403 cho user trước đây tạo được nhưng không có permission — cần audit trước.
- **Database Impact**: Không.
- **Security Impact**: TÍCH CỰC — đóng 1 trong TOP 5 Critical Risk còn mở.
- **Testing Strategy**: Test user có `DOCUMENT_CREATE` → 201; user không có → 403.
- **Risk**: LOW (thay đổi 1 dòng) nhưng **cần audit RBAC data trước** để tránh phá vỡ luồng đang hoạt động.
- **Effort**: SMALL.
- **Priority**: **HIGH** (effort thấp nhất trong toàn bộ CRITICAL/HIGH — nên làm SỚM).
- **Rollback Consideration**: Comment lại dòng đó — tức thời, không rủi ro.

### REF-005 — Bổ sung safeguard chặn reset mật khẩu ADMIN ở `resetPassword()` (Users, admin reset hộ)

- **Area**: Authorization / Privilege escalation (`services/users/users.service.ts`)
- **Problem**: Docstring hàm mô tả "Nếu role là ADMIN => không cho reset password" nhưng code không có check này (khác `disable()` cùng file — CÓ check).
- **Evidence**: `RV03-01` (HIGH, impact CRITICAL nếu khai thác) — không có trong TD-01→30 gốc (finding mới từ REVIEW-03).
- **Current Behavior**: Nếu `USER_RESET_PASSWORD` từng cấp cho role không phải ADMIN, người đó reset được mật khẩu ADMIN.
- **Target Behavior**: Thêm check `role.name === "ADMIN"` → throw, đúng docstring, cùng pattern `disable()`.
- **Affected Files**: `services/users/users.service.ts:resetPassword` (tên hàm suy từ docstring — cần xác nhận tên hàm chính xác lúc implement, KHÔNG nhầm với `resetPassword` ở `auths.service.ts` — 2 hàm khác nhau, khác domain).
- **Functions/Classes**: `resetPassword` (admin reset hộ user khác, khác `AuthService.resetPassword` self-service).
- **Dependencies**: Độc lập.
- **API Impact**: `PATCH /api/users/reset-password/:id` — có thể trả 400 mới cho case admin target, cần rà soát nếu có automation gọi vào ADMIN account (không nên có, nhưng cần xác nhận).
- **Database Impact**: Không.
- **Security Impact**: TÍCH CỰC — đóng đường account-takeover ADMIN thứ 3 (song song REF-001, ISS-01 đã fix).
- **Testing Strategy**: Test reset password cho user ADMIN → 400; reset cho user thường → vẫn hoạt động.
- **Risk**: LOW.
- **Effort**: SMALL.
- **Priority**: **HIGH**.
- **Rollback Consideration**: Xoá check, tức thời.

### REF-006 — Khôi phục ranh giới Route↔Service cho pagination/query validation (root-cause `ARCH-27`)

> Refactor LỚN NHẤT trong nhóm HIGH — chia thành sub-task theo Mục 12 (Bước 5).

- **Area**: API Boundary (11-13 route bị comment `validateQuery` + Service layer giả định sai)
- **Problem**: Service (Documents/Users/Notifications) giả định Middleware đã coerce `page`/`limit`, nhưng `validateQuery` bị comment ở route — không có ràng buộc type-system nào giữa 2 tầng. Đây là ROOT CAUSE của TD-04, TD-10, TD-18 (phần validateQuery), `RV05-03`(ISS-08), `RV10-01`, `RV03-02`/`RV03-03`.
- **Evidence**: `ARCH-27` (`docs/15_ARCHITECTURE_REVIEW.md` §5.1, MỚI) — phân tích cơ chế; TD-04/TD-10 (Phase 11); ISS-08 (Phase 12, High Risk).
- **Current Behavior**: `GET /documents` luôn trả trang 1/10; `GET /users`/`GET /notifications` có hành vi runtime KHÔNG XÁC ĐỊNH với `page`/`limit`.
- **Target Behavior**: (a) Khôi phục `validateQuery` ở toàn bộ 11-13 route đã xác định (Documents, Workflow pending, Users, RBAC×3, UserAudit×3, Notifications, Assets×2, AssetCategory); (b) Service layer KHÔNG còn phụ thuộc ngầm vào Middleware đã chạy — tự parse an toàn (`Number()`/`parseInt` tường minh có fallback) như domain `Asset` đã làm đúng, làm defense-in-depth thay vì tin tưởng tuyệt đối.
- **Affected Files**: 11-13 file route (`document.route.ts`, `workflow.routes.ts`, `user.routes.ts`, `rbac.routes.ts`, `userAudit.routes.ts`, `notification.routes.ts`, `asset.routes.ts`, `assetCategory.routes.ts`) + Service tương ứng (`document.service.ts`, `users.service.ts:getList`, `notification.service.ts`, `rbac.service.ts`, `userAudits.service.ts`).
- **Functions/Classes**: Từng route definition + `getAllDocumentsService`, `getList`, notification list, `getPermissionService`/`getRoleService`/`getPolicieService`, `getAuditLogsService`.
- **Dependencies**: Nên làm CÙNG LÚC với REF-011 (NoSQL injection — cùng root cause thiếu `validateQuery`) để tránh sửa 2 lần cùng 1 route.
- **API Impact**: **BREAKING CHANGE TIỀM NĂNG** — bất kỳ client nào đang phụ thuộc (vô tình) vào hành vi "luôn trang 1" hiện tại của `GET /documents` sẽ thấy hành vi đổi khi pagination hoạt động đúng. Cần rà soát trước khi bật (đã ghi nhận trong `RV05-03`).
- **Database Impact**: Không.
- **Security Impact**: TÍCH CỰC — đóng luôn 1 phần bề mặt NoSQL injection (SEC-13/TD-06) vì `validateQuery` ép kiểu string nghiêm ngặt.
- **Testing Strategy**: Test pagination đúng cho từng route (`?page=2&limit=5` → đúng skip/limit); test field lạ trong query bị Zod từ chối; test response field name (liên hệ REF-022).
- **Risk**: MEDIUM (breaking change tiềm năng cho pagination Documents — cần rà soát consumer trước khi bật).
- **Effort**: MEDIUM (nhiều file nhưng mỗi thay đổi đơn giản — bỏ comment + đối chiếu DTO).
- **Priority**: **HIGH**.
- **Rollback Consideration**: Từng route độc lập — có thể rollback riêng lẻ 1 route nếu phát hiện vấn đề, không cần rollback toàn bộ.

### REF-007 — Thêm index cho `WorkflowInstance`

- **Area**: Database Performance
- **Problem**: Không có index nào ngoài `_id`, bị query bằng `$expr+$arrayElemAt` ở `GET /workflows/pending` (tần suất cao) → COLLSCAN mỗi lần gọi.
- **Evidence**: TD-07 (Phase 11), ISS-05 (Phase 12, High Risk), `RV05-08` (xác nhận lại không đổi qua nhiều phase).
- **Current/Target Behavior**: Thêm tối thiểu `{status:1}` (thu hẹp tập trước khi evaluate `$expr`), cân nhắc `{documentId:1}` cho `getWorkflowByDocument`.
- **Affected Files**: `models/documents/workflowInstance.model.ts`.
- **Functions/Classes**: Schema definition (thêm `.index()`).
- **Dependencies**: Độc lập — an toàn tuyệt đối (thêm index không đổi behavior, chỉ đổi performance).
- **API Impact**: Không.
- **Database Impact**: Thêm index — cần `autoIndex` chạy (đã bật theo Phase 04) hoặc tạo thủ công ở production nếu tắt `autoIndex`; index build có thể tốn thời gian nếu collection đã lớn (cần đánh giá kích thước thật trước khi deploy).
- **Security Impact**: Không.
- **Testing Strategy**: `explain()` trước/sau để xác nhận chuyển từ COLLSCAN sang IXSCAN.
- **Risk**: LOW.
- **Effort**: SMALL.
- **Priority**: **HIGH** (effort thấp, impact hiệu năng rõ ràng, không rủi ro behavior).
- **Rollback Consideration**: `dropIndex()` nếu cần, không ảnh hưởng dữ liệu.

### REF-008 — Domain Upload: khắc phục chuỗi IDOR/thiếu kiểm soát (`/api/upload`)

> Refactor LỚN — chia sub-task theo Mục 12.

- **Area**: File access / Authorization (`services/upload/`, `controllers/upload/`)
- **Problem**: 4 vấn đề liên kết nhân-quả: (1) `createUploader()` không truyền `allowedTypes` → nhận MỌI loại file; (2) `saveFilesToDB` không set `uploadedBy`; (3) `GET /api/upload` trả toàn bộ file mọi user, không phân trang; (4) `GET/DELETE /api/upload/:id` không check ownership.
- **Evidence**: `RV09-01→04` (HIGH×4, `docs/module-reviews/09_UPLOAD_CODE_REVIEW.md`) — KHÔNG có trong TD-01→30 gốc (Phase 11 không đào sâu domain Upload).
- **Current Behavior**: Xem `docs/20_GLOBAL_SECURITY_REVIEW.md` HIGH-09 — file vô chủ, liệt kê/xoá được file người khác.
- **Target Behavior**: (a) `allowedTypes` tường minh cho `/api/upload`; (b) `uploadedBy` set từ `req.user`; (c) `GET /api/upload` filter theo `uploadedBy` (trừ Admin) + phân trang; (d) `GET/DELETE /:id` check ownership.
- **Affected Files**: `services/upload/upload.middleware.ts` (`createUploader` call site), `services/upload/upload.service.ts` (`saveFilesToDB`, `getFiles`, `getFileDetail`, `deleteFile`), `controllers/upload/upload.controller.ts`.
- **Functions/Classes**: `saveFilesToDB`, `getFiles`, `getFileDetail`, `deleteFile`.
- **Dependencies**: Nên làm CÙNG với TD-19 (response format upload) vì đụng cùng file — gộp 1 lần sửa `upload.controller.ts` thay vì 2 lần riêng biệt (xem Mục 12 sub-task).
- **API Impact**: **BREAKING CHANGE**: `GET /api/upload` đổi từ "trả toàn bộ" sang "trả theo user + phân trang" — response shape đổi (thêm pagination wrapper) — cần version rõ hoặc thông báo trước cho consumer (nếu có).
- **Database Impact**: `uploadedBy` hiện tại là `undefined` cho MỌI record `Upload` đã tồn tại (data cũ không có chủ) — cần quyết định: coi record cũ là "hệ thống sở hữu" (hiện Admin xem được) hay tách riêng xử lý.
- **Security Impact**: TÍCH CỰC RÕ RỆT — đóng 4 finding HIGH cùng lúc.
- **Testing Strategy**: Test upload file loại bị chặn → 400; test 2 user khác nhau, mỗi người chỉ thấy/xoá được file của mình; test Admin vẫn xem được toàn bộ (nếu là thiết kế dự kiến — cần xác nhận).
- **Risk**: **MEDIUM-HIGH** (breaking change response shape + cần quyết định xử lý data cũ không có `uploadedBy`).
- **Effort**: MEDIUM.
- **Priority**: **HIGH**.
- **Rollback Consideration**: Giữ nguyên field `uploadedBy` optional (không đổi schema bắt buộc) để có thể rollback code mà không cần rollback data.

### REF-009 — Chặn hard-delete Asset để lại `MedicalDeviceProfile`/`CalibrationRecord`/`Document.relatedAsset` mồ côi

- **Area**: Database / Referential integrity (`services/assets/assetDevice/asset.service.ts`)
- **Problem**: `hardDeleteAssetService` không check bất kỳ back-reference nào — nghiêm trọng nhất là `MedicalDeviceProfile` vì KHÔNG CÓ service delete nào tồn tại cho model này (mồ côi vĩnh viễn, không đường dọn kể cả thủ công qua API).
- **Evidence**: `RV16-01` (HIGH, MỚI — `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md`), TD-13 (Phase 11, `Document.relatedAsset` — đã biết), `RV06-03`.
- **Current/Target Behavior**: Thêm check `MedicalDeviceProfile.exists({asset:id})` VÀ `Document.exists({relatedAsset:id, isActive:true})` trước khi cho phép hard-delete — chặn nếu còn tham chiếu.
- **Affected Files**: `services/assets/assetDevice/asset.service.ts:hardDeleteAssetService`.
- **Functions/Classes**: `hardDeleteAssetService`.
- **Dependencies**: Nếu muốn cho phép hard-delete Asset đã từng có `MedicalDeviceProfile` (thanh lý thiết bị y tế), CẦN bổ sung service xoá `MedicalDeviceProfile`/`CalibrationRecord` trước — quyết định nghiệp vụ (giữ lịch sử kiểm định vĩnh viễn hay cho xoá cascade) cần chủ dự án xác nhận.
- **API Impact**: `DELETE /api/assets/:id/permanent` — có thể trả 409 mới cho Asset còn `MedicalDeviceProfile`/`Document` tham chiếu (trước đây luôn thành công nếu đã soft-delete).
- **Database Impact**: Không đổi schema, chỉ thêm query check.
- **Security Impact**: Không trực tiếp — data integrity.
- **Testing Strategy**: Test hard-delete Asset có `MedicalDeviceProfile` → 409; Asset không có → vẫn xoá được.
- **Risk**: LOW-MEDIUM (thay đổi hành vi API hard-delete, nhưng đây vốn là action hiếm/có kiểm soát permission riêng).
- **Effort**: SMALL-MEDIUM (tuỳ có cần thêm service xoá MedicalDeviceProfile hay không).
- **Priority**: **HIGH**.
- **Rollback Consideration**: Revert check dễ dàng, không data migration.

### REF-010 — Quyết định số phận tầng ABAC (kích hoạt hoàn chỉnh HOẶC gỡ bỏ có chủ đích)

> Refactor LỚN NHẤT toàn kế hoạch — LUÔN chia sub-task, KHÔNG làm 1 lần.

- **Area**: Architecture / Authorization (`middlewares/authorizePermission.middleware.ts`, `middlewares/loadDocument.middleware.ts`, `models/rbac/policy.model.ts`, `shared/utils/Policycondition.evaluator.ts`)
- **Problem**: Toàn bộ tầng ABAC (Policy model + evaluator 319 dòng chống RCE + CRUD API) là kiến trúc hoàn chỉnh nhưng CHẾT HOÀN TOÀN ở runtime — 103 lệnh gọi `authorizePermission()` không truyền `enablePolicies`/`resource`/`action`; `loadDocument.middleware.ts` không gắn route nào.
- **Evidence**: TD-05 (Phase 11), SEC-07/ISS-03 (Phase 12, Critical Risk — đã đúng 100% thời gian, "trạng thái cấu trúc cố định"), `ARCH-06` (Phase 15, root cause của department-scoping không nhất quán ở Documents/Assets/Dashboard).
- **Current Behavior**: Không có resource-level/department-scoping authorization tập trung nào hoạt động — mỗi domain tự làm (hoặc không làm) khác nhau (`RV05-04`, `RV06-04`, `RV07-01`).
- **Target Behavior — 2 HƯỚNG LOẠI TRỪ LẪN NHAU, CẦN QUYẾT ĐỊNH TRƯỚC KHI BẮT ĐẦU** (đây LÀ quyết định kiến trúc, không phải chi tiết implementation):
  - **Hướng A (Activate)**: Gắn `loadDocument`-tương-đương cho mọi resource cần scoping (Document, Asset, Dashboard), truyền đủ `enablePolicies+resource+action` ở route liên quan, viết Policy mẫu cho department-scoping.
  - **Hướng B (Remove)**: Gỡ bỏ Policy/ABAC hoàn toàn (giảm bề mặt tấn công/nhiễu bảo trì), thay bằng 1 middleware department-scoping ĐƠN GIẢN, TƯỜNG MINH hơn (không cần evaluator tổng quát).
- **Affected Files**: Rất rộng — mọi route cần scoping (Documents, Assets, Dashboard tối thiểu), `authorizePermission.middleware.ts`, `loadDocument.middleware.ts`, hoặc (Hướng B) xoá `models/rbac/policy.model.ts`, `shared/utils/Policycondition.evaluator.ts`, các endpoint `POST/GET/PUT/DELETE /api/rbac/policies`.
- **Functions/Classes**: Tuỳ hướng.
- **Dependencies**: **PHẢI xác nhận với chủ dự án TRƯỚC** — đây là quyết định kiến trúc lớn nhất trong toàn bộ kế hoạch, ảnh hưởng ~103 lệnh gọi `authorizePermission` nếu chọn Hướng A. Nên tách thành 1 spike/proposal riêng trước khi lên TASK cụ thể.
- **API Impact**: TIỀM NĂNG LỚN nếu Hướng A (có thể đổi hành vi authorization ở nhiều endpoint); Hướng B ít impact hơn (chỉ xoá 5 endpoint RBAC Policy CRUD nếu không ai dùng — cần xác nhận có consumer thật nào đang dùng Policy API không).
- **Database Impact**: Hướng B cần xử lý collection `Policy` hiện có (backup trước khi drop nếu có dữ liệu thật).
- **Security Impact**: TÍCH CỰC dù chọn hướng nào — hiện trạng "vừa không dùng vừa không gỡ" là tệ nhất (duy trì bề mặt tấn công — vd `RV02-03` NoSQL injection trên `Policy.find` — mà không có lợi ích thực tế).
- **Testing Strategy**: Tuỳ hướng — Hướng A cần test coverage rộng cho mọi route được gắn scoping mới; Hướng B cần xác nhận không route/consumer nào phụ thuộc Policy API trước khi xoá.
- **Risk**: **HIGH** (cả 2 hướng đều ảnh hưởng diện rộng authorization — đây là refactor rủi ro cao nhất trong toàn kế hoạch).
- **Effort**: **LARGE**.
- **Priority**: **HIGH** (là root cause của nhiều finding khác — `ARCH-06`, `RV05-04`, `RV06-04`, `RV07-01` — nhưng effort/risk cao nên xếp sau các fix nhỏ hơn về THỨ TỰ THỰC HIỆN, xem Mục 11).
- **Rollback Consideration**: Vì effort LARGE, BẮT BUỘC triển khai theo feature-flag/từng route 1 (không bật đồng loạt) để có thể rollback từng phần nếu phát hiện vấn đề — xem Mục 12 sub-task.

---

## 6. Medium Priority Refactoring

### REF-011 — Giảm rủi ro NoSQL operator injection (RBAC/Departments/UserAudit/Users filter)

- **Area**: Injection / Input Validation
- **Problem**: Gán thẳng `filter.field = value` từ query string không ép kiểu `string`, không middleware sanitize nào tồn tại.
- **Evidence**: TD-06 (Phase 11), SEC-13/ISS-04 (Phase 12, High Risk — mở rộng phạm vi bởi `RV02-03`, `RV03-02`/`RV03-03`).
- **Target Behavior**: Whitelist field + ép kiểu `typeof value === "string"` trước khi gán filter (theo mẫu `documents.mapper.ts:buildDocumentFilter` đã làm đúng) — kết hợp REF-006 (khôi phục `validateQuery`).
- **Affected Files**: `services/rbac/rbac.service.ts`, `services/departments/departments.service.ts`, `services/users/userAudits.service.ts`, `services/users/users.service.ts:getList`.
- **Dependencies**: **Làm CÙNG REF-006** (cùng route, tránh sửa 2 lần).
- **API Impact**: Không đổi request shape hợp lệ, chỉ từ chối input dạng object bất thường.
- **Database Impact**: Không.
- **Security Impact**: TÍCH CỰC — đóng 1 HIGH risk.
- **Testing Strategy**: Test `?field[$ne]=x` bị từ chối/không ảnh hưởng query.
- **Risk**: LOW.
- **Effort**: MEDIUM (nhiều file, logic đơn giản mỗi nơi).
- **Priority**: **MEDIUM-HIGH** (gộp effort với REF-006 nên thực hiện đồng thời).
- **Rollback Consideration**: Độc lập theo từng service, rollback riêng lẻ được.

### REF-012 — `RefreshToken`: thêm index + hash token

- **Area**: Database Performance + Secrets
- **Problem**: Không index trên `token` (COLLSCAN mỗi login/refresh/logout), không TTL cleanup; lưu PLAINTEXT (khác `PasswordResetToken` đã hash).
- **Evidence**: TD-11 (Phase 11, index), `RV01-02` (MEDIUM-HIGH, plaintext — không có trong TD gốc).
- **Target Behavior**: Thêm unique index `{token:1}` (hoặc hash-based lookup nếu đổi sang hash) + xem xét TTL cho token hết hạn/revoked; hash token trước khi lưu (SHA-256, giống `PasswordResetToken`), so khớp bằng hash khi verify.
- **Affected Files**: `models/auth/refreshToken.model.ts`, `services/auth/auths.service.ts` (`login`, `refresh`, `logout`).
- **Dependencies**: Đổi sang hash là thay đổi LỚN HƠN chỉ thêm index — có thể tách thành 2 sub-task độc lập (index trước — an toàn, không breaking; hash sau — cần đổi query pattern từ `findOne({token})` sang `findOne({tokenHash: hash(token)})`).
- **API Impact**: Không đổi (client vẫn gửi token thô, chỉ server-side đổi cách lưu/so khớp).
- **Database Impact**: Nếu đổi sang hash — TOÀN BỘ refresh token đang tồn tại (issued trước migration) sẽ KHÔNG so khớp được nữa (vì lưu dạng khác) → cần chấp nhận invalidate toàn bộ session đang hoạt động tại thời điểm deploy, hoặc viết migration đọc token cũ (chỉ khả thi nếu chưa xoá bản plaintext trước khi hash).
- **Security Impact**: TÍCH CỰC (đóng MEDIUM-HIGH risk lộ token nếu DB bị lộ).
- **Testing Strategy**: Test login/refresh/logout đầy đủ vòng đời sau khi đổi; test hiệu năng trước/sau index (`explain()`).
- **Risk**: MEDIUM (phần hash — invalidate session hiện tại); LOW (phần index — an toàn tuyệt đối).
- **Effort**: SMALL (index) / MEDIUM (hash).
- **Priority**: **MEDIUM** (index) / có thể nâng HIGH nếu chủ dự án ưu tiên bảo mật token hơn UX gián đoạn session.
- **Rollback Consideration**: Index dễ rollback (`dropIndex`); hash cần kế hoạch rollback rõ ràng (giữ bản backup DB trước migration).

### REF-013 — Bổ sung `validateParams`/`validateBody` còn thiếu (RBAC, Departments)

- **Area**: Input Validation
- **Problem**: RBAC thiếu `validateParams(IdParamDTO)` ở PUT/DELETE theo `:id`; Departments KHÔNG có validate nào (kể cả DTO đã viết sẵn nhưng chưa wire — `RV04-03`).
- **Evidence**: TD-18 (Phase 11), SEC-11 (Phase 12), `RV04-03` (Departments DTO viết sẵn nhưng chưa từng gắn + lệch field với model — `isActive`/`description` không tồn tại trên `Department` model).
- **Target Behavior**: Gắn `validateParams(IdParamDTO)` cho RBAC; gắn `CreateDepartmentDTO`/`UpdateDepartmentDTO`/`QueryDepartmentDTO` cho Departments SAU KHI làm sạch field lệch (`isActive`/`description`) khỏi DTO.
- **Affected Files**: `routes/rbac/rbac.routes.ts`, `routes/departments/department.routes.ts`, `dto/departments/departments.dto.ts`.
- **Dependencies**: Cần xác nhận `isActive`/`description` là tính năng dự kiến làm nhưng chưa hoàn thiện hay code thừa (`RV04-03` UNKNOWN) — quyết định TRƯỚC khi wire DTO Departments.
- **API Impact**: `:id` sai format vẫn trả 400 (không đổi status code, chỉ đổi từ `CastError`-derived sang Zod-derived — message có thể khác).
- **Database Impact**: Không.
- **Security Impact**: Nhẹ (tăng tính rõ ràng lỗi, không phải lỗ hổng nghiêm trọng).
- **Testing Strategy**: Test `:id` không hợp lệ → 400 rõ ràng; test body Department hợp lệ/không hợp lệ.
- **Risk**: LOW.
- **Effort**: SMALL.
- **Priority**: **MEDIUM**.
- **Rollback Consideration**: Gỡ middleware, tức thời.

### REF-014 — Xoá Department không check `Asset`/`AssetAssignmentHistory`; check `User` bỏ sót user đã disable

- **Area**: Database / Referential integrity (`services/departments/departments.service.ts`)
- **Problem**: `deleteDepartmentService` chỉ check `User`(isActive)/`Document`, KHÔNG check `Asset` (required field!) và `AssetAssignmentHistory`.
- **Evidence**: `RV04-01` (HIGH), `RV04-02` (MEDIUM) — KHÔNG có trong TD-01→30 gốc (Phase 11 không đào domain Departments ở mức này).
- **Target Behavior**: Thêm `Asset.exists({department:id})`, `AssetAssignmentHistory.exists({$or:[{fromDepartment:id},{toDepartment:id}]})`; bỏ điều kiện `isActive:true` khi check `User` (hoặc quyết định rõ ràng cho phép/không cho phép — `RV04-02` UNKNOWN business rule).
- **Affected Files**: `services/departments/departments.service.ts:deleteDepartmentService`.
- **Dependencies**: Độc lập, nhưng liên quan REF-009 (cùng dạng "check back-reference trước khi xoá nguồn").
- **API Impact**: `DELETE /api/departments/:id` — có thể trả 400 mới cho Department còn Asset/AssetAssignmentHistory tham chiếu (trước đây luôn thành công nếu qua được 2 check hiện có).
- **Database Impact**: Không đổi schema.
- **Security Impact**: Không trực tiếp — data integrity.
- **Testing Strategy**: Test xoá Department còn Asset → 400; không còn → vẫn xoá được.
- **Risk**: LOW-MEDIUM.
- **Effort**: SMALL.
- **Priority**: **MEDIUM-HIGH** (gộp cùng REF-009 làm 1 đợt "referential integrity sweep" nếu muốn tối ưu effort).
- **Rollback Consideration**: Revert check, tức thời.

### REF-015 — Chuẩn hoá response format (`auth`, `upload`)

- **Area**: Code Quality / API Consistency
- **Problem**: `auth` không có field `success` (và không nhất quán `user` vs `data` ngay trong 1 file); `upload` lệch nhiều nhất (không `catchAsync`/`ApiError`, response mảng/object trần).
- **Evidence**: TD-19 (Phase 11), `ARCH-23` (Phase 15).
- **Target Behavior**: Cả 2 domain dùng `{success, message?, data?}` nhất quán với phần còn lại hệ thống; `upload` chuyển sang `catchAsync`+`ApiError` như convention chung.
- **Affected Files**: `controllers/auth/auth.controller.ts`, `controllers/upload/upload.controller.ts`.
- **Dependencies**: **BREAKING CHANGE cho client hiện có** — đây là refactor DUY NHẤT trong Mục 6 cần xác nhận rõ có consumer thật (FE tương lai/mobile app/Postman collection nội bộ) đang phụ thuộc shape cũ hay không.
- **API Impact**: HIGH mức breaking (đổi response shape của 6+8 endpoint auth+upload).
- **Database Impact**: Không.
- **Security Impact**: Gián tiếp — `upload` chuyển sang `ApiError` sẽ tự động thừa hưởng behavior che `err.message` ở nhánh 500 (liên hệ SEC-23), giảm information leakage hiện có ở `upload.controller.ts`.
- **Testing Strategy**: Test toàn bộ endpoint auth/upload đối chiếu response shape mới.
- **Risk**: MEDIUM-HIGH (breaking API contract — cần version hoặc thông báo trước).
- **Effort**: MEDIUM.
- **Priority**: **MEDIUM** (giá trị maintainability cao nhưng không phải bug/lỗ hổng cấp thiết).
- **Rollback Consideration**: Cần giữ bản cũ song song (feature flag hoặc theo API version) nếu có consumer thật, nếu không thì revert code thuần tuý an toàn.

### REF-016 — Batch transaction cho Excel import Document (giảm N+1 transaction)

- **Area**: Performance / Database Transaction
- **Problem**: Mỗi dòng Excel import tạo 1 transaction riêng (tối đa 5000 transaction/file) — ĐÃ XÁC NHẬN là đánh đổi CÓ CHỦ ĐÍCH (comment tự giải thích), không phải oversight (`14_ANALYSIS_AUDIT.md` Mục 13).
- **Evidence**: TD-08 (Phase 11, PERF-07), REVIEW-08 (xác nhận sắc thái "chủ đích").
- **Target Behavior**: Batch transaction theo nhóm dòng (vd 100-500 dòng/transaction) thay vì per-row — CẦN cân bằng giữa hiệu năng và kích thước transaction (MongoDB giới hạn 16MB/transaction, số lượng operation).
- **Affected Files**: `services/excel/excel.service.ts` (hàm import Document — tên cụ thể cần xác nhận lúc implement).
- **Dependencies**: **Đây là thay đổi kiến trúc CÓ CHỦ ĐÍCH đã được đội trước cân nhắc** — PHẢI xác nhận lý do gốc (transaction quá lớn dễ conflict/timeout?) trước khi đổi, tránh tái tạo lại vấn đề đã tránh trước đó.
- **API Impact**: Không đổi request/response shape, nhưng đổi hành vi lỗi giữa chừng (trước: dòng lỗi không ảnh hưởng dòng khác đã commit; sau: 1 batch lỗi có thể rollback cả batch, không chỉ 1 dòng — cần quyết định UX báo lỗi phù hợp).
- **Database Impact**: Giảm số lượng transaction, có thể tăng kích thước mỗi transaction — cần benchmark với file thật lớn (~5000 dòng) trước khi chốt kích thước batch.
- **Security Impact**: Không.
- **Testing Strategy**: Benchmark thời gian import file 5000 dòng trước/sau; test 1 dòng lỗi giữa file → xác nhận đúng phạm vi rollback theo thiết kế mới.
- **Risk**: MEDIUM (thay đổi đánh đổi đã có chủ đích, cần hiểu rõ lý do gốc trước khi đổi).
- **Effort**: **LARGE**.
- **Priority**: **MEDIUM** (impact rõ nhưng effort cao, cần benchmark dữ liệu thật trước — không cấp thiết bằng nhóm HIGH).
- **Rollback Consideration**: Giữ code cũ (per-row) sau feature flag để so sánh A/B trước khi chuyển hẳn.

### REF-017 — Ràng buộc kiểu cho permission string trong `authorizePermission(...)`

- **Area**: Type Safety / RBAC
- **Problem**: Tham số permission là `string` tự do, không đối chiếu compile-time với `PERMISSIONS` catalog — cho phép drift (3 route đã dùng permission KHÔNG TỒN TẠI: `USER_READ`, `USER_DETAIL`, `DOCUMENT_DETAIL`).
- **Evidence**: `ARCH-25` (Phase 15/Global Architecture Review), `15_API_CONTRACT_REVIEW.md` §6.1 (MEDIUM-HIGH, RBAC misconfiguration).
- **Target Behavior**: Đổi chữ ký `authorizePermission(permissions: PermissionKey[], ...)` với `PermissionKey = keyof typeof PERMISSIONS` (hoặc tương đương) — TypeScript sẽ tự bắt lỗi biên dịch nếu route dùng string sai.
- **Affected Files**: `middlewares/authorizePermission.middleware.ts` (đổi type), VÀ **sửa luôn 3 route đang dùng sai** (`user.routes.ts` ×2, `document.route.ts` ×1) để khớp catalog thật (`USER_VIEW`, `USER_VIEW_DETAIL`, `DOCUMENT_VIEW_DETAIL`).
- **Dependencies**: Đổi type có thể lộ ra CÁC route khác đang dùng sai (ngoài 3 route đã biết) — cần build lại toàn bộ dự án sau khi đổi type để xác nhận không còn lỗi biên dịch nào khác.
- **API Impact**: **THAY ĐỔI HÀNH VI THẬT**: 3 route hiện tại chỉ ADMIN gọi được (permission không tồn tại = fail-closed) SẼ MỞ RA cho role đang giữ permission đúng (vd role `IT` đã có sẵn `DOCUMENT_VIEW_DETAIL` trong `rolePermission.map.ts` nhưng chưa từng dùng được) — cần xác nhận đây ĐÚNG là ý định (role đó có nên xem chi tiết Document/User hay không).
- **Database Impact**: Không.
- **Security Impact**: TÍCH CỰC dài hạn (ngăn lớp lỗi này tái diễn) nhưng THAY ĐỔI PHẠM VI TRUY CẬP THẬT ở 3 endpoint hiện tại — cần rà soát kỹ trước khi deploy.
- **Testing Strategy**: `npx tsc --noEmit` sau khi đổi type (bắt lỗi biên dịch còn sót); test 3 route với role đã được gán permission đúng.
- **Risk**: MEDIUM (thay đổi phạm vi truy cập thật, không chỉ type-safety thuần tuý).
- **Effort**: MEDIUM (đổi type + sửa toàn bộ call site nếu có lỗi biên dịch phát sinh).
- **Priority**: **MEDIUM**.
- **Rollback Consideration**: Đổi type dễ revert; nhưng nếu đã đổi cả 3 permission string và role đã dùng được quyền mới, cần cân nhắc kỹ trước khi rollback (người dùng đã quen quyền mới).

---

## 7. Low Priority Refactoring

| ID | Area | Problem (tóm tắt) | Affected Files | Risk | Effort | Nguồn |
|---|---|---|---|---|---|---|
| REF-018 | Code Quality | Dọn dead code tích luỹ: `shared/errors/errorHandler.ts`, `loadDocument.middleware.ts` (chỉ xoá nếu chọn Hướng B ở REF-010, KHÔNG xoá nếu Hướng A), `mongo.logger.ts`, `services/upload/upload.validator.ts:validateFiles`, `documents.validator.ts:validateStatusTransition/validateStatusPermission`, ~500 dòng `workflow.service.ts`, ~280 dòng `assetAssignment.service.ts`, ~207 dòng `excel.service.ts`, `ROLE_PERMISSIONS`/`permission.descriptors.ts` (RBAC dead configs) | 10 file (liệt kê ở TD-24, `03_BACKEND_ANALYSIS.md` §11.4, `21_GLOBAL_ARCHITECTURE_REVIEW.md` ARCH-15) | LOW (đã xác nhận CONFIRMED dead qua nhiều phase, Git history lưu bản cũ) | SMALL (từng file), MEDIUM (tổng thể do số lượng) | TD-24, ARCH-15, ARCH-34 |
| REF-019 | Configuration | `.env.example` không đồng bộ biến thực dùng (`MONGO_MAX_POOL_SIZE`/`MIN_POOL_SIZE` thiếu tài liệu, `CLIENT_URL` khai trùng 2 lần, `MONGO_DEBUG`/`MONGO_SLOW_MS` tài liệu hoá nhưng tính năng đọc chúng dead) | `backend/.env.example` | LOW (chỉ sửa file mẫu, không phải code) | SMALL | TD-27 (một phần), ARCH-28 |
| REF-020 | Code Quality | Hợp nhất 2 rate-limiter cùng cấu hình; 2 cấu hình Multer không dùng chung factory | `app.ts`, `authRateLimiter.middleware.ts`, `middlewares/upload.middleware.ts`, `services/upload/upload.middleware.ts` | LOW | SMALL | TD-25, ARCH-26, ARCH-35 |
| REF-021 | Database Performance | Thêm `.lean()` cho `users.service.ts:getList`, `rbac.service.ts` list; thêm compound index `{isActive:1, deletedAt:1, createdAt:-1}` cho `Document`; thêm index tương tự cho `Asset` (mở rộng phạm vi từ `RV07-02`) | `models/documents/document.model.ts`, `models/assets/asset.model.ts`, `services/users/users.service.ts`, `services/rbac/rbac.service.ts` | LOW | SMALL | TD-20, TD-22, TD-21 (một phần), RV07-02 |
| REF-022 | API Consistency | Đồng bộ tên field pagination (`totalPages` vs `totalPage`) giữa Documents/Users | `services/documents/document.service.ts`, `services/users/users.service.ts` | LOW (breaking nhẹ nếu có consumer đã quen field cũ) | SMALL | ARCH-31 (Phase 15, mới) |
| REF-023 | Deployment | Validate `JWT_SECRET`/`JWT_REFRESH_SECRET`/`CLIENT_URL` fail-fast lúc bootstrap (cùng cơ chế `PORT`/`MONGO_URI`) | `backend/server.ts` | LOW | SMALL | TD-27, SEC-03, SEC-21 |
| REF-024 | Observability | Cân nhắc structured logger (pino/winston) thay `console.*` | Toàn hệ thống (nhiều file dùng `console.*`) | LOW (bổ sung, không thay behavior nghiệp vụ) | MEDIUM (diện rộng nhưng mỗi thay đổi đơn giản) | ARCH-30 (Phase 15, mới) — KHÔNG cấp thiết ở quy mô hiện tại, chỉ cần khi có kế hoạch scale |

---

## 8. Dependency Analysis

```
REF-001 (Role rename ADMIN)         — ĐỘC LẬP, làm ngay
REF-002 (CONFIRM_STATUS business)   — CẦN xác nhận nghiệp vụ trước (blocking), rồi ĐỘC LẬP về code
REF-003 (hard-delete Document/month)— CẦN quyết định chặn/soft-delete trước
REF-004 (proposal auth)             — CẦN audit RBAC data (role nào giữ DOCUMENT_CREATE) trước khi bật
REF-005 (resetPassword ADMIN guard) — ĐỘC LẬP, làm ngay

REF-006 (Route↔Service boundary)  ──┬── REF-011 (NoSQL injection) — NÊN LÀM CHUNG (cùng route/file)
                                      └── REF-022 (field name) — nên làm SAU REF-006 (cùng lúc sửa response)

REF-007 (WorkflowInstance index)    — ĐỘC LẬP, an toàn tuyệt đối, làm ngay

REF-008 (Upload IDOR chain)         — CẦN quyết định xử lý data cũ (uploadedBy=undefined) trước
                                     — nên gộp cùng REF-015 (response format Upload) nếu sửa cùng đợt

REF-009 (Asset hard-delete refs)  ──┬── REF-014 (Department delete refs) — CÙNG NHÓM "referential integrity
                                      sweep", có thể làm chung 1 đợt nhưng vẫn 2 PR riêng (2 domain khác nhau)

REF-010 (ABAC decision)             — PHỤ THUỘC quyết định kiến trúc từ chủ dự án TRƯỚC MỌI THỨ KHÁC trong
                                       nhóm này; SAU KHI quyết định, là điều kiện tiên quyết thật sự cho việc
                                       giải quyết TRIỆT ĐỂ ARCH-06 (department-scoping không nhất quán ở
                                       Documents/Assets/Dashboard — RV05-04/RV06-04/RV07-01) — nhưng CÓ THỂ
                                       trì hoãn vì các domain vẫn hoạt động (chỉ thiếu scoping, không lỗi)

REF-012 (RefreshToken index+hash)   — Phần INDEX độc lập, làm ngay; phần HASH cần kế hoạch riêng (invalidate
                                       session), tách thời điểm

REF-013 (RBAC/Departments validate) — ĐỘC LẬP; phần Departments DTO cần làm sạch field lệch trước khi wire

REF-016 (Excel batch transaction)   — CẦN hiểu lý do gốc thiết kế cũ trước; ĐỘC LẬP với các REF khác

REF-017 (Permission type-safety)    — NÊN LÀM SAU khi REF-006 ổn định (không đụng cùng file trực tiếp
                                       nhưng cùng loại thay đổi "API boundary hardening", dễ review theo cụm)

REF-018→024 (LOW)                   — Phần lớn ĐỘC LẬP với nhau và với nhóm CRITICAL/HIGH, có thể xen kẽ
                                       làm bất cứ lúc nào có capacity dư (trừ REF-018 phần loadDocument,
                                       phụ thuộc quyết định REF-010)
```

---

## 9. Testing Strategy (tổng quát, áp dụng chung)

Dự án **CHƯA CÓ Jest hoạt động** (TD-09/ISS-07, xác nhận lại `14_ANALYSIS_AUDIT.md` Mục 15 — vẫn đúng 100% qua toàn bộ audit). Do đó MỌI refactor trong kế hoạch này, khi implement, PHẢI:

1. Chạy `npx tsc --noEmit` (type-check) — công cụ DUY NHẤT hiện có để bắt lỗi tự động.
2. Test thủ công qua HTTP client thật (Postman/curl) cho MỌI case Current Behavior → Target Behavior liệt kê ở từng REF — không được coi "đã test" nếu chỉ đọc code (theo CLAUDE.md §28/SKILL.md §15).
3. Với refactor CRITICAL/HIGH liên quan bảo mật (REF-001, 002, 004, 005, 008, 009, 010, 017) — nên là ĐỘNG LỰC ĐẦU TIÊN để đề xuất viết test tự động (liên hệ TD-09), thay vì tiếp tục dựa hoàn toàn vào test thủ công.
4. `git diff` review đầy đủ trước khi coi bất kỳ REF nào DONE.

**Khuyến nghị bổ sung** (không phải REF riêng, chỉ ghi nhận): nếu triển khai ≥3 REF trong nhóm CRITICAL/HIGH, nên cân nhắc đầu tư cài Jest tối thiểu cho riêng các luồng auth/RBAC/workflow TRƯỚC — biến TD-09 thành điều kiện hỗ trợ cho toàn bộ kế hoạch này, không phải làm sau cùng.

---

## 10. Rollback Strategy (tổng quát)

- Mọi REF nhỏ (SMALL effort) — rollback = revert 1 commit, không cần chuẩn bị gì thêm.
- REF có Database Impact (REF-001 field mới, REF-007/021 index, REF-012 index) — an toàn rollback vì không destructive (thêm field/index có thể xoá lại, không mất dữ liệu).
- REF có **data migration thật** (REF-012 phần hash, REF-008 xử lý `uploadedBy` cũ) — BẮT BUỘC backup DB liên quan trước khi deploy, và kế hoạch rollback phải nêu rõ "khôi phục từ backup" thay vì chỉ "revert code" (vì code revert không tự phục hồi dữ liệu đã biến đổi).
- REF thay đổi API contract (REF-003, 008, 015, 017) — cân nhắc feature-flag hoặc theo dõi song song (log cảnh báo trước khi enforce cứng) thay vì bật ngay lập tức, đặc biệt nếu KHÔNG chắc chắn về consumer thật.
- REF-010 (ABAC) — BẮT BUỘC rollout từng route/domain một, không bật đồng loạt, đúng nguyên tắc "dễ hoàn tác" (CLAUDE.md §33).

---

## 11. Refactoring Sequence (thứ tự thực hiện đề xuất)

> Thứ tự dựa trên: Priority → Risk (ưu tiên risk thấp trước để tạo đà) → Dependency (Mục 8) → Effort (việc nhỏ dễ trước để giảm rủi ro tích luỹ).

**Đợt 1 — Security quick-wins, effort thấp, risk thấp (làm NGAY, không phụ thuộc gì)**:
1. REF-005 (resetPassword ADMIN guard)
2. REF-001 (Role rename ADMIN backdoor)
3. REF-007 (WorkflowInstance index)
4. REF-004 (proposal auth — SAU KHI audit RBAC data)

**Đợt 2 — Referential integrity sweep**:
5. REF-009 (Asset hard-delete refs)
6. REF-014 (Department delete refs)
7. REF-003 (hard-delete Document/month — SAU KHI quyết định chặn/soft-delete)

**Đợt 3 — API boundary hardening (gộp chung vì cùng file/route)**:
8. REF-006 + REF-011 (Route↔Service boundary + NoSQL injection, làm chung)
9. REF-022 (field name — làm cùng đợt REF-006)
10. REF-013 (RBAC/Departments validate)

**Đợt 4 — Business logic (cần điều tra dữ liệu trước)**:
11. REF-002 (CONFIRM_STATUS — SAU KHI xác nhận nghiệp vụ + rà soát dữ liệu)

**Đợt 5 — Domain Upload overhaul (gộp response format)**:
12. REF-008 + REF-015 (Upload IDOR + response format, làm chung 1 đợt)

**Đợt 6 — Cải thiện có kiểm soát (risk/effort trung bình)**:
13. REF-012 phần index (RefreshToken)
14. REF-017 (Permission type-safety)
15. REF-012 phần hash (RefreshToken, sau khi đã ổn định phần index)

**Đợt 7 — Quyết định kiến trúc lớn (cần approval riêng, KHÔNG vội)**:
16. REF-010 (ABAC — spike/proposal TRƯỚC, implement SAU nếu được duyệt)
17. REF-016 (Excel batch transaction — cần benchmark trước)

**Đợt 8 — Dọn dẹp, có thể xen kẽ bất kỳ lúc nào**:
18. REF-018, REF-019, REF-020, REF-021, REF-023, REF-024 (LOW priority — làm khi có capacity dư, không cần theo thứ tự cố định, trừ REF-018 phần `loadDocument` phải chờ REF-010).

---

## 12. Tasks Generated From Refactoring

Chia nhỏ theo Bước 5 (không tạo mega-refactor). Format: `REF-XXX → TASK-XXX` (số TASK thực tế sẽ cấp khi task được khởi tạo qua `docs/tasks/`, tiếp nối `TASK-001`/`TASK-002` đã có).

| REF gốc | Sub-task đề xuất |
|---|---|
| REF-006 (LỚN) | TASK-A1: Khôi phục `validateQuery` cho nhóm Documents+Workflow (2 route). TASK-A2: nhóm Users+UserAudit (4 route). TASK-A3: nhóm RBAC (3 route). TASK-A4: nhóm Notifications+Assets+AssetCategory (4 route). Mỗi task tự chứa REF-011 (injection fix) cho đúng domain của nó. |
| REF-008 (LỚN) | TASK-B1: Thêm `allowedTypes` + set `uploadedBy` (write-path, không breaking). TASK-B2: Filter `GET /` theo owner + phân trang (breaking, cần thông báo trước). TASK-B3: Ownership check cho `GET/DELETE /:id`. TASK-B4 (gộp REF-015): chuẩn hoá response shape toàn domain Upload. |
| REF-010 (LỚN NHẤT) | TASK-C0: Spike/proposal so sánh Hướng A vs Hướng B, trình chủ dự án duyệt (KHÔNG code). TASK-C1 (nếu Hướng A được chọn): wire scoping cho Documents. TASK-C2: wire cho Assets. TASK-C3: wire cho Dashboard. (Nếu Hướng B: TASK-C1': gỡ Policy CRUD API + evaluator sau khi xác nhận không consumer nào dùng). |
| REF-016 (LỚN) | TASK-D1: Điều tra lý do gốc thiết kế per-row transaction (đọc kỹ comment + `mongodb-transaction-setup-guide.md`). TASK-D2: Benchmark batch-size khác nhau trên file mẫu lớn. TASK-D3: Implement batch transaction đã chọn kích thước. |
| REF-018 (nhiều vị trí) | TASK-E1: Dọn dead code cross-cutting (`errorHandler.ts`, `mongo.logger.ts` — không phụ thuộc REF-010). TASK-E2: Dọn dead code business (`upload.validator.ts`, `documents.validator.ts` 2 hàm). TASK-E3: Dọn code chết comment-block lớn (`workflow.service.ts`, `assetAssignment.service.ts`, `excel.service.ts`). TASK-E4 (SAU REF-010): xử lý `loadDocument.middleware.ts`, `ROLE_PERMISSIONS`/`permission.descriptors.ts`. |
| REF-012 | TASK-F1: Thêm index `{token:1}` (an toàn, độc lập). TASK-F2 (sau, cần kế hoạch riêng): chuyển sang lưu hash. |

Các REF còn lại (REF-001→005, 007, 009, 011, 013, 014, 017, 019→024) đủ NHỎ để làm 1 task/PR duy nhất mỗi cái — không cần chia thêm.

---

## 13. Risks

| Risk | Liên quan | Mức độ |
|---|---|---|
| Sửa REF-002 (business rule) mà không rà soát dữ liệu Asset đang kẹt trước → có thể "sửa nửa vời", Asset cũ vẫn sai dù rule mới đúng | REF-002 | MEDIUM |
| Bật REF-004/REF-006 (authorization/validate) mà không audit RBAC data thật trước → chặn nhầm luồng nghiệp vụ đang hoạt động, gây gián đoạn vận hành | REF-004, REF-006 | MEDIUM-HIGH |
| REF-008/REF-015 đổi response shape mà không xác nhận có consumer thật (FE tương lai, script nội bộ) → breaking change không kiểm soát được phạm vi ảnh hưởng | REF-008, REF-015, REF-017 | MEDIUM |
| REF-010 (ABAC) triển khai vội mà không qua approval + rollout từng phần → rủi ro cao nhất toàn kế hoạch, có thể làm hỏng authorization diện rộng | REF-010 | **HIGH** nếu làm sai quy trình, chấp nhận được nếu tuân thủ Mục 10/12 |
| REF-012 (hash refresh token) làm gián đoạn session người dùng đang hoạt động nếu không có kế hoạch invalidate rõ ràng | REF-012 | MEDIUM |
| Không có test tự động (TD-09/ISS-07) xuyên suốt toàn bộ kế hoạch → mọi refactor đều dựa vào test thủ công, rủi ro bỏ sót case biên tăng theo số lượng REF triển khai song song | Toàn bộ | MEDIUM-HIGH (tăng dần nếu làm nhiều REF cùng lúc) |
| REF-016 (batch transaction) đổi ngược lại 1 quyết định thiết kế đã có chủ đích mà không hiểu rõ lý do gốc → có thể tái tạo lại vấn đề đã tránh (transaction quá lớn, conflict/timeout) | REF-016 | MEDIUM |

---

## 14. Final Recommendation

1. **Bắt đầu với Đợt 1** (REF-005, REF-001, REF-007, REF-004) — effort thấp, risk thấp, đóng ngay 2 con đường account-takeover ADMIN còn mở (REF-001, REF-005) và 1 Critical Risk đã tồn tại xuyên suốt nhiều phase (REF-004, ISS-09).
2. **REF-002 (CONFIRM_STATUS) cần XÁC NHẬN NGHIỆP VỤ TRƯỚC KHI CODE** — đây là refactor CRITICAL nhưng KHÔNG nên vội implement mà chưa hỏi chủ dự án ý định thật của rule, và chưa rà soát dữ liệu Asset hiện có.
3. **REF-010 (ABAC) KHÔNG nên là ưu tiên implement sớm** dù là root-cause của nhiều finding khác — effort LARGE, risk HIGH, cần 1 quyết định kiến trúc riêng (TASK-C0 spike) trước khi cam kết bất kỳ dòng code nào.
4. **Gộp các REF cùng chạm 1 vùng code** (REF-006+011+022; REF-008+015; REF-009+014) để giảm số lần review/deploy riêng lẻ cho cùng 1 khu vực.
5. **Đầu tư tối thiểu vào testing tự động** (TD-09) song song với việc triển khai nhóm CRITICAL/HIGH — không bắt buộc nhưng khuyến nghị mạnh, vì kế hoạch này có ≥10 refactor ảnh hưởng authorization/data-integrity mà hiện KHÔNG có lưới an toàn hồi quy nào.
6. Không tự động chuyển bất kỳ REF nào sang trạng thái IMPLEMENTED — mọi REF ở đây vẫn là **KẾ HOẠCH**, chờ yêu cầu tường minh theo từng REF/TASK cụ thể.

---

**PHASE 16 COMPLETED — không thực hiện Phase 17.**
