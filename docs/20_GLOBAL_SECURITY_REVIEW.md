# 20 — GLOBAL SECURITY REVIEW

> Loại: Tổng hợp xuyên-tài-liệu (KHÔNG phải 1 phase/review mới, KHÔNG đọc lại toàn bộ source) | Ngày: 2026-08-31 | KHÔNG sửa code.
>
> **Mục tiêu**: tổng hợp toàn bộ security finding **đã được verify bằng evidence trực tiếp trong source** (không phải suy đoán mới), lấy từ:
> - `docs/09_SECURITY_ANALYSIS.md` (Phase 09 — 27 finding SEC-01→SEC-27, baseline lịch sử)
> - `docs/module-reviews/{00..16}_*_CODE_REVIEW.md` (16 module code review — RVxx-yy)
> - `docs/module-reviews/15_API_CONTRACT_REVIEW.md` (REVIEW-13, đối chiếu Implemented vs OpenAPI)
> - `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md` (REVIEW-12/16, cross-domain)
> - `docs/00_PROJECT_MEMORY.md` (đối chiếu trạng thái RESOLVED/OPEN mới nhất)
>
> **Nguyên tắc dedup**: 1 lỗ hổng thật chỉ xuất hiện **1 lần** trong bảng chính, dùng ID nguồn xuất hiện SỚM NHẤT (thường `SEC-xx` từ Phase 09) làm ID chính, các review sau xác nhận lại/mở rộng phạm vi được ghi trong cột "Xác nhận/mở rộng bởi". Finding chỉ tồn tại ở 1 module review (chưa từng có ở Phase 09) giữ nguyên `RVxx-yy` làm ID chính.
>
> **Trạng thái**: toàn bộ finding dưới đây là **OPEN**, trừ khi ghi rõ ✅ RESOLVED. Không có sửa code nào được thực hiện trong tài liệu này.

---

## 0. Tóm tắt điều hành

| Severity | Số lượng (đã dedup) | Trong đó RESOLVED |
|---|---|---|
| CRITICAL | 2 | 1 (SEC-05) |
| HIGH | 10 | 0 |
| MEDIUM | 13 | 0 |
| LOW | 14 | 0 |
| INFO | 7 | — |

**3 điểm cần chú ý nhất, theo đúng trọng tâm yêu cầu (Authentication/Authorization/Privilege escalation/File access):**

1. **RV02-01 (CRITICAL, chưa fix)** — Rename Role thành `"ADMIN"` tạo backdoor persistence vĩnh viễn, không bị chặn ở tầng nào. Nghiêm trọng hơn SEC-05 (đã fix) vì đây là con đường **thứ hai** dẫn tới cùng hậu quả (full ADMIN bypass) mà bản vá TASK-001/002 **không hề đụng tới**.
2. **Domain File Upload chung (`/api/upload`) là bề mặt tấn công yếu nhất toàn hệ thống** — 4 finding HIGH liên kết chuỗi nhân-quả (RV09-01→04): nhận MỌI loại file, không gắn chủ sở hữu, liệt kê toàn bộ file mọi user, xoá được file của người khác — chỉ được giảm nhẹ bởi 1 yếu tố hạ tầng chưa xác minh (RV09-09).
3. **`resetPassword()` (Users, admin reset mật khẩu hộ) thiếu đúng safeguard mà chính docstring mô tả** (RV03-01) — nếu `USER_RESET_PASSWORD` từng được cấp cho role không phải ADMIN, đây là đường account-takeover ADMIN hoàn chỉnh thứ ba (cùng họ với SEC-05/RV02-01).

---

## 1. CRITICAL

### CRITICAL-01 — Rename Role thành `"ADMIN"` → backdoor persistence toàn quyền (OPEN)

- **ID gốc**: `RV02-01`
- **Module review**: `docs/module-reviews/02_RBAC_CODE_REVIEW.md`
- **Category**: Authorization / Privilege escalation / RBAC
- **File/Function**: `backend/src/services/rbac/rbac.service.ts:updateRoleService()`
- **Observed**: `updateRoleService()` không có bất kỳ guard nào chặn đổi `Role.name` thành/khỏi chuỗi `"ADMIN"`. Cơ chế "Super Admin bypass" ở `authorizePermission.middleware.ts` chỉ so khớp **chuỗi** `role.name === "ADMIN"` (không so `_id`, không cờ hệ thống riêng). 1 user có `ROLE_UPDATE` có thể: (1) đổi tên Role ADMIN hiện tại sang tên khác, (2) đổi tên 1 Role bất kỳ khác thành `"ADMIN"` — unique index trên `name` không chặn được thao tác tuần tự này.
- **Impact**: Vector **persistence/backdoor** — kể cả sau khi tài khoản ADMIN gốc bị thu hồi quyền, 1 role "ADMIN" bí mật vẫn cấp bypass đầy đủ vĩnh viễn. Xác minh DB dev: hiện chỉ Role `ADMIN` giữ `ROLE_UPDATE` (an toàn tạm thời, giống pattern ISS-01/SEC-05 trước khi fix) — **KHÔNG xác nhận được cho production**.
- **Quan hệ với SEC-05 (đã fix)**: KHÁC route tấn công — SEC-05 (`PUT /users/:id` gán role ADMIN cho user) đã được vá ở TASK-001/002; RV02-01 (đổi TÊN role thành "ADMIN") **hoàn toàn không bị đụng tới bởi bản vá đó** — cùng hậu quả cuối (full bypass), 2 nguyên nhân độc lập.
- **Recommendation**: Tách bypass khỏi so khớp chuỗi `name` — dùng cờ hệ thống riêng (`isSystemAdmin: true`, không sửa được qua API) hoặc `_id` cố định đã seed sẵn; đồng thời chặn `updateRoleService()` đổi `name` thành `"ADMIN"`/đổi tên Role ADMIN gốc.
- **Confidence**: HIGH (evidence code trực tiếp).

### CRITICAL-02 — Privilege escalation lên ADMIN qua `PUT /api/users/:id` — ✅ RESOLVED (2026-08-30)

- **ID gốc**: `SEC-05` (= ISS-01, kế thừa Phase 07)
- **Module review**: Phase 09 §2; fix: `docs/tasks/TASK-001.md`, `TASK-002.md`
- **Category**: Authorization / Privilege escalation
- **Observed (trước fix)**: `update()` (`users.service.ts`) cho phép đổi `user.role` sang bất kỳ `roleId` nào (kể cả ADMIN) không giới hạn, không invalidate permission cache.
- **Trạng thái hiện tại**: Đã vá — `update()` chặn tuyệt đối `role.name === "ADMIN"`; `create()` cũng đã được vá đối xứng (TASK-002). **Hệ quả xác nhận**: sau 2 fix, KHÔNG còn endpoint API nào có thể tạo/gán role ADMIN — trừ khi khai thác qua CRITICAL-01 (RV02-01, con đường khác, vẫn mở).
- **Chưa xử lý**: `assignRole()` qua `PATCH /api/users/:id/role` (permission mới `USER_ASSIGN_ROLE`) — đã wire nhưng CHƯA gán permission này cho role nào trong DB thật (không tạo rủi ro thêm ở trạng thái hiện tại, nhưng cần audit khi được gán).
- **Confidence**: CONFIRMED (kế thừa Phase 07, xác nhận lại bằng diff thực tế).

---

## 2. HIGH

### HIGH-01 — `resetPassword()` (Users) thiếu safeguard chặn reset mật khẩu ADMIN

- **ID gốc**: `RV03-01`
- **Module review**: `docs/module-reviews/03_USERS_CODE_REVIEW.md`
- **Category**: Authorization / Privilege escalation / Account takeover
- **File/Function**: `backend/src/services/users/users.service.ts:resetPassword()`
- **Observed**: Docstring của hàm mô tả rõ "Nếu role là ADMIN => không cho reset password" nhưng code **không có dòng nào thực hiện check này** (khác `disable()` cùng file — CÓ check tương đương).
- **Impact**: Nếu `USER_RESET_PASSWORD` từng được cấp cho role không phải ADMIN (kịch bản phổ biến — IT/helpdesk), người đó đặt lại mật khẩu ADMIN rồi đăng nhập — account takeover hoàn chỉnh. Xác minh DB dev: hiện chỉ ADMIN giữ quyền này (an toàn tạm thời, **UNKNOWN cho production**).
- **Recommendation**: Bổ sung check `role.name === "ADMIN"` → throw, đúng như docstring đã mô tả (cùng pattern `disable()`).
- **Confidence**: HIGH.

### HIGH-02 — `POST /api/documents/proposal` thiếu authorization check

- **ID gốc**: `SEC-06` (= ISS-09)
- **Xác nhận/mở rộng bởi**: `RV05-02` (`docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md`), `docs/module-reviews/15_API_CONTRACT_REVIEW.md` §6.3 (xác nhận comment vẫn còn đúng hiện trạng)
- **Category**: Authorization / Document access
- **File**: `backend/src/routes/documents/document.route.ts` — `authorizePermission("DOCUMENT_CREATE")` vẫn bị comment (đọc lại lần thứ 3, qua 3 tài liệu độc lập, cùng kết luận: chưa fix).
- **Impact**: Bất kỳ user đã đăng nhập (bất kể role/permission) đều tạo được Document proposal — vi phạm least-privilege.
- **Recommendation**: Bỏ comment dòng `authorizePermission("DOCUMENT_CREATE")`.
- **Confidence**: CONFIRMED (3 nguồn độc lập cùng xác nhận).

### HIGH-03 — Tầng ABAC (Policy) hoàn toàn dead ở runtime — mất 1 tầng phòng thủ resource-level

- **ID gốc**: `SEC-07` (kế thừa Phase 07 §5.3)
- **Xác nhận/mở rộng bởi**: `RV02-03` (RBAC review — dù dead, `Policy` vẫn có bề mặt injection sống, xem MEDIUM-04)
- **Category**: Authorization / Defense in depth
- **Observed**: 103 lệnh gọi `authorizePermission()` trong toàn bộ routes không truyền `enablePolicies`/`resource`/`action`; `loadDocument.middleware.ts` (middleware duy nhất gán `req.resource`) không gắn vào route nào.
- **Impact**: Mọi kỳ vọng resource-level authorization/IDOR protection theo ABAC không có tác dụng thực tế — kiểm soát phạm vi dữ liệu hiện chỉ dựa vào check thủ công rải rác ở service (không đảm bảo bao phủ toàn diện — xem HIGH-05, RV06-04, RV07-01).
- **Recommendation**: Hoàn thiện wiring ABAC cho route cần resource-level check, hoặc gỡ bỏ nếu không dùng để giảm bề mặt tấn công/nhiễu bảo trì.
- **Confidence**: CONFIRMED.

### HIGH-04 — NoSQL operator injection qua gán trực tiếp giá trị query string vào Mongo filter

- **ID gốc**: `SEC-13` (= ISS-04, Phase 09 §4)
- **Xác nhận/mở rộng bởi**: `RV02-03` (RBAC — `getPermissionService`/`getPolicieService`, vẫn nguyên vẹn dù phần khác của RBAC đã hardening), `RV03-02`/`RV03-03` (mở rộng sang `users.service.ts:getList()` và toàn bộ `userAudit.routes.ts` — 2 vị trí MỚI chưa từng liệt kê ở Phase 09)
- **Category**: Injection (NoSQL) / RBAC / Database
- **File**: `rbac.service.ts` (`getPermissionService`, `getPolicieService`), `departments.service.ts`, `userAudits.service.ts:buildAuditFilter`, `users.service.ts:getList()`
- **Observed**: Gán thẳng `filter.field = value` từ query string, không ép kiểu `string`; **không có middleware sanitize nào** (`express-mongo-sanitize` không tồn tại trong dependencies — xác nhận lại ở REVIEW-14 dependency audit); toàn bộ route liên quan nằm trong danh sách `validateQuery` bị comment (xem MEDIUM-01).
- **Impact**: Query bracket syntax (`?performedBy[$ne]=null`) có thể bị Express/`qs` dựng thành object → truyền thẳng vào Mongoose `.find()` như MongoDB operator — thay đổi ngữ nghĩa truy vấn, khả năng dò/lộ dữ liệu ngoài phạm vi dự kiến. Khai thác thực tế (INFERRED, chưa test runtime).
- **Recommendation**: Khôi phục `validateQuery` (Zod `.string()` nghiêm ngặt) + kiểm tra `typeof === "string"` ở tầng service (defense in depth, giống `buildDocumentFilter` domain Documents) + cân nhắc middleware sanitize tổng quát.
- **Confidence**: CONFIRMED (code pattern), INFERRED (khai thác thực tế).

### HIGH-05 — Không có department-scoping khi ĐỌC Document (List/Detail), dù CÓ khi SỬA

- **ID gốc**: `RV05-04`
- **Module review**: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md`
- **Category**: Authorization / Document access / Data exposure
- **File**: `document.service.ts:getAllDocumentsService`, `getDocumentDetailService` — đối chứng `updateDocumentService` (CÓ check `callerDepartment`)
- **Observed**: 2 hàm Read không nhận/so sánh `callerDepartment`/`isAdmin` — khác hẳn Update.
- **Impact**: Bất kỳ user có `DOCUMENT_VIEW`/`DOCUMENT_VIEW_DETAIL` (permission cấp hệ thống, không phân biệt phòng ban) xem được TOÀN BỘ document mọi phòng ban — rò rỉ dữ liệu liên phòng ban (đề xuất mua sắm, biên bản hư hỏng, `actualCost`...). **UNKNOWN**: có phải chủ đích thiết kế ("xem toàn hệ thống, chỉ chặn sửa theo phòng ban") hay thiếu sót — cần xác nhận chủ dự án.
- **Liên hệ cùng pattern (chưa đủ evidence để kết luận là bug, ghi nhận cùng nhóm)**: `RV06-04` (Asset domain — hoàn toàn không có department-scoping ở Read lẫn Assignment, KHÁC RV05-04 ở chỗ không có sự bất đối xứng Read-vs-Update, gợi ý nhiều khả năng là chủ đích "quản lý tập trung"), `RV07-01` (Dashboard — 11/12 endpoint không department-scoping).
- **Recommendation**: Xác nhận chủ đích nghiệp vụ; nếu cần scoping, áp dụng nhất quán filter theo `callerDepartment` cho Read khi user không phải Admin.
- **Confidence**: HIGH (evidence code), INFERRED (có phải bug hay chủ đích).

### HIGH-06 — Hard-delete Document theo tháng không kiểm tra tham chiếu ngược

- **ID gốc**: `SEC-12` liên hệ + chủ yếu là `ISS-02`/`RV05-05` (Phase 04 §12.1)
- **Xác nhận bởi**: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` (RV05-05, RV05-10), `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md` §C.1
- **Category**: Database / Document access / Data integrity
- **File**: `document.service.ts:deleteDocumentsByMonthService`, `documents.query.ts:deleteDocumentsByFilter`
- **Observed**: `Document.deleteMany(query)` — hard-delete thật, không transaction, không check `WorkflowInstance.documentId`/`Document.referenceTo[]`/`Notification.resourceId`; route còn thiếu `validateBody` cho `month`/`year` (RV05-10 = SEC-12).
- **Impact**: Dangling reference trên 3 model khác, sai lệch dữ liệu vĩnh viễn, không cách nào phát hiện qua exception (không throw lỗi nào).
- **Recommendation**: Bổ sung check tham chiếu tương tự `countReportsByProposal` trước `deleteMany`, hoặc chuyển sang soft-delete hàng loạt; thêm Zod validate `month`/`year`.
- **Confidence**: HIGH.

### HIGH-07 — `PUT /assets/:id` bỏ qua guard soft-delete qua field `isActive`

- **ID gốc**: `RV06-01`
- **Module review**: `docs/module-reviews/06_ASSETS_CODE_REVIEW.md`
- **Category**: Authorization / Asset access / Business logic bypass
- **File**: `assets.dto.ts:UpdateAssetDTO`, `assets.constants.ts:ASSET_UPDATE_WHITELIST`, `asset.service.ts:updateAssetService`
- **Observed**: `isActive` KHÔNG bị loại trừ khỏi DTO/whitelist (khác `status`/`assignedTo`/`department` — bị loại trừ đúng chủ đích) — `PUT /assets/:id` (chỉ cần `ASSET_UPDATE`) có thể set `isActive:false` trực tiếp, bỏ qua HOÀN TOÀN guard trạng thái của `deleteAssetService` (chặn xoá khi `IN_USE`/`UNDER_MAINTENANCE`), không set `deletedAt`/`deletedBy`.
- **Impact**: Permission bypass thực chất (hành động tương đương "xoá" chỉ cần `ASSET_UPDATE` thay vì `ASSET_DELETE`); dữ liệu audit không nhất quán.
- **Recommendation**: Loại `isActive` khỏi DTO/whitelist, cùng nguyên tắc đã áp dụng cho `status`/`assignedTo`/`department`.
- **Confidence**: HIGH.

### HIGH-08 — Regex injection/ReDoS không escape ở nhiều domain (Departments, RBAC, Assets)

- **ID gốc**: `SEC-14` (Phase 09 §4)
- **Xác nhận/mở rộng bởi**: `RV04-04` (Departments — không đổi), `RV06-02` (**MỞ RỘNG PHẠM VI MỚI**: `getAllAssetsService`/`getAllAssetCategoriesService` cũng không escape, bề mặt tấn công rộng hơn vì chỉ cần `ASSET_VIEW` — permission phổ biến, không phải quyền admin)
- **Category**: Injection (ReDoS) / RBAC / Asset access
- **File**: `departments.service.ts`, `rbac.service.ts` (`getPermissionService`/`getRoleService`/`getPolicieService`), `asset.service.ts:getAllAssetsService`, `assetCategory.service.ts:getAllAssetCategoriesService`
- **Observed**: `$regex: keyword` không qua `escapeRegex` — khác domain Documents (đã có `escapeRegex` ở `documents.mapper.ts`, mẫu hình tốt chưa được nhân rộng).
- **Impact**: Client gửi pattern catastrophic-backtracking gây CPU cao khi MongoDB evaluate — mức độ phụ thuộc kích thước collection (POTENTIAL RISK, chưa benchmark). Domain Asset đáng chú ý nhất vì permission yêu cầu thấp nhất trong nhóm.
- **Recommendation**: Tái sử dụng `escapeRegex` sẵn có, áp dụng nhất quán mọi domain dùng `$regex` với input client.
- **Confidence**: HIGH (thiếu escape, evidence trực tiếp).

### HIGH-09 — File Upload chung (`/api/upload`) — chuỗi 4 finding IDOR/thiếu kiểm soát liên kết

- **ID gốc**: `RV09-01`, `RV09-02`, `RV09-03`, `RV09-04`
- **Module review**: `docs/module-reviews/09_UPLOAD_CODE_REVIEW.md`
- **Category**: File access / Upload / IDOR / Sensitive data
- **File**: `upload.controller.ts`, `upload.service.ts`, `upload.middleware.ts`, `upload.model.ts`
- **Observed (chuỗi nhân-quả)**:
  1. `POST /api/upload` gọi `createUploader()` KHÔNG truyền `allowedTypes` → chấp nhận **MỌI loại file** (RV09-01) — khác `certificateUploader` (Calibration, REVIEW-06) gọi ĐÚNG với `allowedTypes` tường minh, chứng minh đây là lỗi cấu hình cục bộ, không phải giới hạn của `createUploader`.
  2. `saveFilesToDB` KHÔNG BAO GIỜ set `uploadedBy` dù model có field này và `req.user` sẵn có ở controller (RV09-02) — file "vô chủ" trong DB.
  3. `GET /api/upload` trả TOÀN BỘ file mọi user, không filter, không phân trang (RV09-03).
  4. `GET /api/upload/:id`/`DELETE /api/upload/:id` — IDOR đầy đủ, không check ownership (RV09-04) — bất kỳ user có `DELETE_FILE` xoá được file bất kỳ ai khác.
- **Yếu tố giảm nhẹ đã xác nhận (RV09-09)**: KHÔNG có `express.static`/`res.sendFile`/`createReadStream` nào serve `/uploads` qua chính app này (=RV00-01) — nội dung file THẬT không đọc được qua app hiện tại. **NHƯNG nếu hạ tầng triển khai (reverse proxy) serve tĩnh `backend/uploads/`, toàn bộ authorization Node bị bỏ qua hoàn toàn** — UNKNOWN quan trọng nhất, cần xác nhận hạ tầng thật.
- **Recommendation**: Truyền `allowedTypes` cho `/api/upload`; set `uploadedBy` từ `req.user`; filter `GET /api/upload` theo `uploadedBy` (trừ Admin) + phân trang; check ownership ở `GET/DELETE /:id`.
- **Confidence**: HIGH (toàn bộ evidence trực tiếp).

### HIGH-10 — `GET /api/performances/dashboard` không có bất kỳ authorization check nào

- **ID gốc**: `RV11-01`
- **Module review**: `docs/module-reviews/11_PERFORMANCE_CODE_REVIEW.md`
- **Category**: Authorization / Sensitive data
- **File**: route + controller performance dashboard
- **Observed**: Chỉ `authenticate`, không `authorizePermission`. Permission `PERFORMANCE_VIEW` được nhắc trong comment nhưng CHƯA TỪNG được định nghĩa trong `permission.constant.ts`. Tài liệu Phase 05 (lịch sử) từng ghi nhận "check `role.name===ADMIN` cứng trong controller" — **xác nhận lại source hiện tại KHÔNG CÓ check này** — documentation đã lỗi thời (áp dụng CLAUDE.md §3, source code là nguồn sự thật).
- **Impact**: Bất kỳ user đăng nhập nào cũng xem được dashboard hiệu năng toàn hệ thống (endpoint/status/thời gian phản hồi — không phải dữ liệu nghiệp vụ nhạy cảm trực tiếp, nhưng là thông tin nội bộ hệ thống không nên public cho mọi user).
- **Recommendation**: Định nghĩa `PERFORMANCE_VIEW` trong `permission.constant.ts`, gắn `authorizePermission("PERFORMANCE_VIEW")` vào route.
- **Confidence**: HIGH.

---

## 3. MEDIUM

### MEDIUM-01 — 11-13 route có `validateQuery` bị comment out, mất lớp validate/coerce đầu vào

- **ID gốc**: `SEC-10` (Phase 09, 11 route)
- **Xác nhận/mở rộng bởi**: `docs/module-reviews/15_API_CONTRACT_REVIEW.md` §7.1 (đối chiếu OpenAPI xác nhận 12/13 route — chỉ 1/13 `GET /api/documents` được OpenAPI cảnh báo rõ, 12 route còn lại KHÔNG cảnh báo gì dù hành vi thực tế không được Zod validate — documentation drift), `RV03-02`/`RV03-03` (Users list, UserAudit — mới), `RV10-01` (Notification — hậu quả NẶNG HƠN, `skip=NaN` khả năng lỗi hẳn endpoint dùng nhiều nhất)
- **Category**: Input Validation / RBAC / Document access
- **Impact tổng hợp**: (a) tiền đề trực tiếp cho HIGH-04 (NoSQL injection) và HIGH-08 (ReDoS); (b) bug pagination xác nhận ở Documents/Users/Notifications; (c) OpenAPI không phản ánh đúng thực trạng validate cho 12/13 endpoint, gây hiểu nhầm cho người tích hợp API.
- **Recommendation**: Khôi phục toàn bộ `validateQuery` đã bị comment; đồng bộ cập nhật OpenAPI ghi rõ endpoint nào KHÔNG thực sự được Zod validate cho tới khi fix.
- **Confidence**: CONFIRMED.

### MEDIUM-02 — Xóa Department không check `Asset`/`AssetAssignmentHistory` → orphan reference

- **ID gốc**: `RV04-01`
- **Xác nhận/mở rộng bởi**: `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md` §C.2 (liên kết với RV16-03 — cùng root cause: phòng thủ tốt ở chiều "tạo", không có ở chiều "huỷ nguồn")
- **Category**: Database / Asset access / Data integrity
- **File**: `departments.service.ts:deleteDepartmentService()`
- **Observed**: Chỉ check `User`(isActive)/`Document`; `Asset.department` là `required:true` nhưng KHÔNG được check; `AssetAssignmentHistory.fromDepartment/toDepartment` cũng không check.
- **Impact**: Xóa Department chắc chắn để lại orphan reference — `populate("department")` trả `null` âm thầm, sai lệch dashboard/KPI theo khoa.
- **Recommendation**: Bổ sung `Asset.exists({department:id})`, `AssetAssignmentHistory.exists({$or:[...]})` trước `deleteOne` — cùng pattern check `User`/`Document` đã có.
- **Confidence**: HIGH.

### MEDIUM-03 — Hard-delete Asset để lại `MedicalDeviceProfile`/`CalibrationRecord` mồ côi vĩnh viễn

- **ID gốc**: `RV16-01`
- **Module review**: `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md`
- **Liên hệ**: `RV06-03` (=Phase04 §12.2/ISS-18 — cùng hàm `hardDeleteAssetService` cũng không check `Document.relatedAsset`)
- **Category**: Database / Asset access / Data integrity
- **File**: `asset.service.ts:hardDeleteAssetService`; `medicalDevice.service.ts` (không có hàm delete nào cho `MedicalDeviceProfile`)
- **Observed**: Không service nào tồn tại để xoá `MedicalDeviceProfile` — hard-delete Asset để lại chuỗi tham chiếu 2 tầng (`MedicalDeviceProfile`→`CalibrationRecord`) mồ côi **không có đường dọn nào kể cả thủ công qua API**, nghiêm trọng hơn `RV06-03` (Document.relatedAsset — ít nhất sửa được qua Update).
- **Recommendation**: Thêm check `MedicalDeviceProfile.exists({asset:id})` trước hard-delete, và/hoặc bổ sung service xoá tường minh cho `MedicalDeviceProfile`/`CalibrationRecord`.
- **Confidence**: HIGH.

### MEDIUM-04 — 3 chuỗi permission dùng ở route KHÔNG tồn tại trong catalog thật — chỉ ADMIN gọi được dù thiết kế "trên giấy" nói khác

- **ID gốc**: `finding §6.1` của `docs/module-reviews/15_API_CONTRACT_REVIEW.md` (REVIEW-13)
- **Category**: RBAC / Authorization / Document access
- **File**: routes dùng `"USER_READ"` (`GET /api/users`), `"USER_DETAIL"` (`GET /api/users/{id}`), `"DOCUMENT_DETAIL"` (`GET /api/documents/{id}`) — đúng ra phải là `USER_VIEW`, `USER_VIEW_DETAIL`, `DOCUMENT_VIEW_DETAIL`.
- **Observed**: `seed-rbac.ts` chỉ seed permission theo `Object.values(PERMISSIONS)` — 3 chuỗi sai này KHÔNG hề tồn tại dưới bất kỳ hình thức nào trong DB. OpenAPI copy y hệt lỗi này vào `summary` (match-mà-cả-hai-cùng-sai). Xác nhận cụ thể: role `IT` ĐÃ được gán đúng `DOCUMENT_VIEW_DETAIL` trong `rolePermission.map.ts` nhưng hoàn toàn vô dụng.
- **Impact**: 3 endpoint này hiện **chỉ ADMIN gọi được** (qua bypass `role.name==="ADMIN"`, không đọc permission string) — về bảo mật đây là fail-closed (không phải lỗ hổng mở rộng quyền), nhưng là RBAC misconfiguration nghiêm trọng: hệ thống phân quyền "trên giấy" không khớp thực tế vận hành, IT/role khác tưởng có quyền nhưng không dùng được.
- **Recommendation**: Sửa 3 chuỗi permission trong route cho khớp catalog thật (`USER_VIEW`, `USER_VIEW_DETAIL`, `DOCUMENT_VIEW_DETAIL`); đồng bộ OpenAPI.
- **Confidence**: CONFIRMED (đối chiếu trực tiếp route code với `permission.constant.ts`).

### MEDIUM-05 — Refresh token lưu PLAINTEXT trong DB (không hash)

- **ID gốc**: `RV01-02`
- **Module review**: `docs/module-reviews/01_AUTH_CODE_REVIEW.md`
- **Category**: Authentication / Secrets / Sensitive data
- **File**: `refreshToken.model.ts`, `auths.service.ts`
- **Observed**: `RefreshToken.token` lưu plaintext — khác hẳn `PasswordResetToken` (đã hash SHA-256).
- **Impact**: Nếu DB bị lộ (backup, injection, insider), attacker có ngay token dùng được tới 7 ngày mà không cần crack gì.
- **Recommendation**: Hash refresh token trước khi lưu (SHA-256, giống `PasswordResetToken`), so khớp bằng hash khi verify.
- **Confidence**: HIGH.

### MEDIUM-06 — `refresh()` không bọc `jwt.verify()` trong try/catch → lỗi 500 rò rỉ message thư viện

- **ID gốc**: `RV01-01`
- **Module review**: `docs/module-reviews/01_AUTH_CODE_REVIEW.md`
- **Liên hệ**: `RV00-02`/`SEC-23` (nhánh lỗi 500 chung lộ `err.message`)
- **Category**: Authentication / Error handling
- **Impact**: Refresh token hết hạn/hỏng → client nhận 500 kèm message lỗi thư viện JWT thay vì 400/401 nhất quán với các nhánh lỗi khác trong cùng hàm.
- **Recommendation**: Bọc `jwt.verify()` trong try/catch, map lỗi về `ApiError.unauthorized`.
- **Confidence**: HIGH.

### MEDIUM-07 — CSV Export Formula Injection (Excel Injection) ở UserAudit export

- **ID gốc**: `SEC-15`
- **Module review**: Phase 09 §4; liên hệ `docs/module-reviews/03_USERS_CODE_REVIEW.md` (UserAudit)
- **Category**: Injection / Export / Sensitive data
- **File**: `userAudits.service.ts:escapeCsvField`
- **Observed**: Chỉ xử lý quoting chuẩn CSV (`"`, `,`, `\n`, `\r`) — không neutralize ký tự kích hoạt công thức (`=`, `+`, `-`, `@`). Cột `note` (free-text) có khả năng chứa input gián tiếp từ người dùng.
- **Impact**: Người NHẬN file export (không phải server) có thể bị Excel Formula Injection khi mở bằng Excel/LibreOffice.
- **Recommendation**: Prefix `'` cho giá trị bắt đầu bằng `=`/`+`/`-`/`@`/tab trước khi ghi CSV.
- **Confidence**: CONFIRMED (thiếu neutralize), UNKNOWN (dữ liệu `note` có bao giờ chứa input thô hay không).

### MEDIUM-08 — Path traversal tiềm năng qua `file.originalname` không sanitize (Upload)

- **ID gốc**: `SEC-16`
- **Xác nhận bởi**: `RV09-05` (không đổi, REVIEW-09)
- **Category**: File access / Upload / Injection (Path Traversal)
- **File**: `upload.middleware.ts:storage.filename` — `${Date.now()}-${file.originalname}` không loại bỏ `../`.
- **Impact**: Áp dụng cho cả `POST /api/upload` VÀ `certificateUploader` (Calibration, REVIEW-06) — nguy cơ ghi file ngoài thư mục `uploads/` dự kiến (INFERRED, phụ thuộc hành vi Multer/OS cụ thể, chưa test).
- **Recommendation**: `path.basename(file.originalname)` trước khi ghép filename, hoặc dùng UUID + extension whitelist riêng.
- **Confidence**: CONFIRMED (code), INFERRED (khai thác).

### MEDIUM-09 — CORS fallback mở `*` khi thiếu `CLIENT_URL`, kết hợp `credentials:true`

- **ID gốc**: `SEC-21`
- **Xác nhận bởi**: `docs/module-reviews/14_CONFIG_CODE_REVIEW.md` (cross-ref `RV00-05`/`RV10-04` — nhóm nguyên nhân gốc: thiếu validate tập trung biến môi trường bảo mật lúc khởi động)
- **Category**: API Security / CORS
- **File**: `app.ts`
- **Impact**: `CLIENT_URL` thiếu → fail-open (`Access-Control-Allow-Origin:*`) thay vì fail-closed — client dùng token qua header (không cookie) vẫn có thể bị gọi API xuyên origin nếu token lộ qua kênh khác.
- **Recommendation**: Validate `CLIENT_URL` fail-fast lúc khởi động, cùng cơ chế `PORT`/`MONGO_URI`.
- **Confidence**: CONFIRMED (hành vi thư viện `cors`), UNKNOWN (triển khai thật có luôn set đúng hay không).

### MEDIUM-10 — Email notification/reset-password nhúng free-text vào HTML không escape

- **ID gốc**: `RV10-02` (Notification)
- **Xác nhận/mở rộng bởi**: `13_SHARED_CODE_REVIEW.md` #3 (`passwordReset.template.ts` — cùng lớp lỗ hổng, `fullName` nội suy vào HTML email không escape)
- **Category**: Injection (HTML/Email) / Sensitive data
- **File**: `notification.service.ts:sendEmailForNotification`, `shared/.../passwordReset.template.ts`
- **Impact**: Dữ liệu free-text người dùng (`Document.title`, `fullName`) nhúng thẳng vào HTML email — rủi ro HTML/email injection; nếu FE (ngoài phạm vi repo) render `notification.message` bằng `dangerouslySetInnerHTML`, có thể là stored XSS thật (UNKNOWN, FE không có trong repo).
- **Recommendation**: Escape HTML cho mọi giá trị free-text trước khi nội suy vào template email.
- **Confidence**: CONFIRMED (code), UNKNOWN (mức khai thác thực tế qua FE).

### MEDIUM-11 — Soft-delete Document không chặn/đồng bộ WorkflowInstance đang pending

- **ID gốc**: `RV05-06`
- **Module review**: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md`
- **Category**: Document access / Data integrity / Workflow
- **Impact**: Document bị Admin ẩn (`isActive:false`) nhưng `WorkflowInstance` liên quan vẫn hoạt động — approver vẫn duyệt/từ chối được, side-effect đổi trạng thái Asset thật vẫn xảy ra cho tài liệu "đã xoá".
- **Recommendation**: Chặn soft-delete nếu `workflowStatus==="pending"`, hoặc đồng thời cancel `WorkflowInstance` trong cùng transaction.
- **Confidence**: HIGH (code), UNKNOWN (tần suất xảy ra thực tế).

### MEDIUM-12 — `updateUserService` bỏ validate tồn tại `Department` khi chỉ đổi `department` (không kèm `role`)

- **ID gốc**: `RV16-02`
- **Module review**: `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md`
- **Category**: Database / Sensitive data (integrity) / User access
- **Impact**: `user.department` có thể bị gán ObjectId không tồn tại → `populate` trả `null` âm thầm, phá vỡ ràng buộc ownership-theo-department ở `updateDocumentService` (liên hệ HIGH-05).
- **Recommendation**: Tách điều kiện validate Department ra khỏi nhánh `role?.name==="USER"`.
- **Confidence**: HIGH.

### MEDIUM-13 — Lỗi Multer (sai định dạng/vượt kích thước) không được `error.middleware.ts` nhận diện riêng

- **ID gốc**: `RV08-01`
- **Module review**: `docs/module-reviews/08_IMPORT_EXPORT_CODE_REVIEW.md`
- **Category**: Import / Error handling / Information leakage
- **Impact**: Rơi vào nhánh 500 "lỗi không xác định" (liên hệ SEC-23) thay vì 400 rõ ràng — áp dụng cho MỌI route dùng `uploadExcel` (Document import, Department sync, Asset import).
- **Recommendation**: Thêm nhánh bắt riêng `MulterError` trong `error.middleware.ts`, map về 400.
- **Confidence**: HIGH.

---

## 4. LOW

| ID | Category | Tóm tắt | Nguồn |
|---|---|---|---|
| SEC-01 | Authentication | Refresh token không rotate + `changePassword()` không revoke token khác | Phase 09 §1 |
| SEC-02 | Authentication | Password policy yếu (`min(5)`, không bắt buộc độ phức tạp) | Phase 09 §1 |
| SEC-03 | Authentication | `JWT_SECRET` không fail-fast lúc khởi động | Phase 09 §1 (=`RV00-05`) |
| SEC-04 | Authentication / Sensitive data | JWT payload chứa `role`/`department` object dư thừa (không dùng để authorize, nhưng dư thừa) | Phase 09 §1 |
| SEC-08 | Authorization | ✅ RESOLVED — cache permission không invalidate khi đổi role (fix chung SEC-05) | Phase 09 §2 |
| SEC-09 | RBAC | `ROLE_PERMISSIONS` "trên giấy" không đồng bộ DB thật, không script seed nào đọc | Phase 09 §2 |
| SEC-11 | Input Validation | Departments/RBAC thiếu `validateParams`/`validateBody` (Departments: hoàn toàn chưa wire — xem `RV04-03`) | Phase 09 §3, `RV04-03` |
| SEC-12 | Input Validation | `DELETE /documents/delete-by-month` thiếu `validateBody` cho `month`/`year` | Phase 09 §3 (= `RV05-10`) |
| SEC-17 | File Upload | Type check chỉ dựa MIME/extension client cung cấp, không magic-byte | Phase 09 §5 |
| SEC-22 | API Security | Thiếu `trust proxy` — ảnh hưởng độ chính xác rate-limit theo IP sau reverse proxy | Phase 09 §7 |
| SEC-23 | API Security | Rò rỉ `err.message` thô ở nhánh lỗi 500 không xác định | Phase 09 §7, `RV00-02` |
| RV02-02 | RBAC | `denyPermissions` vô tác dụng với user role ADMIN (bypass chạy trước khi đọc deny list) | `02_RBAC_CODE_REVIEW.md` |
| RV06-08 | Asset access / Race condition | Không bắt riêng `VersionError` khi assign/transfer/return đồng thời — rơi vào nhánh 500 thay vì 409 rõ ràng | `06_ASSETS_CODE_REVIEW.md` |
| RV16-03 | Asset access / User access | `disable()` User không đồng bộ `Asset.assignedTo` — tài sản vẫn "đang cấp phát" cho user đã khoá | `16_DATABASE_CROSS_DOMAIN_REVIEW.md` |

---

## 5. INFO (điểm tốt / không phải lỗ hổng, ghi nhận để khách quan)

| ID | Ghi chú | Nguồn |
|---|---|---|
| SEC-19 | Không phát hiện secret hard-code trong source (grep toàn `src/`) | Phase 09 §6 |
| SEC-20 | `.env` không commit vào repo (chỉ xác nhận working tree, chưa quét lịch sử git) | Phase 09 §6 |
| SEC-24 | Rate limiting chỉ áp dụng `/api/auths/*`, không có endpoint nhạy cảm khác (vd `PUT /users/:id`) | Phase 09 §7 |
| SEC-26 | `User.password` bảo vệ đúng cách (`select:false`) | Phase 09 §8 |
| RV02-04 | Lỗ hổng mass-assignment Role update (permissions bypass) đã được vá hoàn toàn bằng 2 lớp độc lập | `02_RBAC_CODE_REVIEW.md` |
| RV09-09 | Không có `express.static` serve `/uploads` qua app — giảm nhẹ đáng kể HIGH-09 (nhưng phụ thuộc hạ tầng ngoài repo — UNKNOWN) | `09_UPLOAD_CODE_REVIEW.md` |
| RV10-06 | Không idempotency check khi tạo Notification — không phải lỗi độc lập, chỉ thiếu lớp phòng thủ cuối | `10_NOTIFICATION_CODE_REVIEW.md` |

---

## 6. Theo trọng tâm được yêu cầu (mục lục chéo)

| Trọng tâm | Finding liên quan |
|---|---|
| **Authentication** | CRITICAL-02 (resolved), MEDIUM-05, MEDIUM-06, SEC-01/02/03/04 |
| **Authorization** | CRITICAL-01, CRITICAL-02, HIGH-02, HIGH-03, HIGH-05, HIGH-07, HIGH-10, SEC-08(resolved), SEC-09, RV02-02 |
| **Privilege escalation** | CRITICAL-01, CRITICAL-02 (resolved), HIGH-01 |
| **Document access** | HIGH-02, HIGH-05, HIGH-06, MEDIUM-04, MEDIUM-11 |
| **Asset access** | HIGH-07, HIGH-08 (phần Asset), MEDIUM-02, MEDIUM-03, RV06-08, RV16-03 |
| **File access / Upload** | HIGH-09 (4 finding), MEDIUM-08, SEC-17 |
| **Import** | MEDIUM-13, SEC-12 |
| **Export** | MEDIUM-07 (CSV formula injection) |
| **RBAC** | CRITICAL-01, HIGH-04 (phần RBAC), HIGH-08 (phần RBAC), MEDIUM-04, SEC-09, RV02-02, RV02-04 (positive) |
| **Database** | MEDIUM-02, MEDIUM-03, MEDIUM-12, HIGH-06 (data integrity phần), toàn bộ `16_DATABASE_CROSS_DOMAIN_REVIEW.md` |
| **Secrets** | SEC-19 (positive), SEC-20 (positive), MEDIUM-05 (refresh token plaintext) |
| **Sensitive data** | HIGH-05, HIGH-09, HIGH-10, MEDIUM-07, MEDIUM-10, SEC-04, SEC-26 (positive) |

---

## 7. Unknowns quan trọng nhất còn tồn đọng (ảnh hưởng trực tiếp mức độ nghiêm trọng thực tế)

- Dữ liệu Role/Permission THẬT trong MongoDB **production** (không chỉ DB dev đã audit) — ảnh hưởng trực tiếp mức độ khai thác thực tế của CRITICAL-01, HIGH-01, và toàn bộ finding Authorization dựa trên "role nào giữ permission nào".
- Cấu hình hạ tầng triển khai thật: có reverse proxy serve tĩnh `backend/uploads/` hay không (ảnh hưởng trực tiếp mức độ nghiêm trọng thực tế của HIGH-09); MongoDB có phải replica set hay không; `CLIENT_URL`/`trust proxy` có luôn được set đúng.
- Mức độ khai thác thực tế qua runtime của HIGH-04 (NoSQL injection) và MEDIUM-08 (path traversal) — chỉ xác nhận được bằng phân tích tĩnh, chưa test HTTP thật (đúng nguyên tắc "không exploit hệ thống" xuyên suốt toàn bộ review).
- FE (ngoài phạm vi repo, không tồn tại trong codebase hiện tại) có render `notification.message`/email bằng cách không escape hay không — ảnh hưởng MEDIUM-10 có phải XSS thật hay chỉ dừng ở email injection.
- Toàn bộ lịch sử git có từng chứa `.env` thật hay không (SEC-20) — chưa quét `git log --all`.

---

**Không có thay đổi nào được thực hiện trên source code trong quá trình tổng hợp tài liệu này.**
