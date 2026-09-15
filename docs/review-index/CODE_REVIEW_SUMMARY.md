# CODE REVIEW SUMMARY

> Nơi tổng hợp TOÀN BỘ finding từ mọi module review (REVIEW-00 → REVIEW-16), cập nhật sau mỗi lần 1 review hoàn thành. Không thay thế `docs/module-reviews/<ID>_*.md` (chi tiết đầy đủ từng finding vẫn nằm ở file gốc) — file này chỉ tổng hợp để nhìn toàn cảnh.

## Cách cập nhật file này

Sau khi 1 REVIEW-XX hoàn thành:
1. Thêm các finding mới vào bảng "Toàn bộ finding" bên dưới (giữ nguyên ID gốc `RVxx-YY` từ module review).
2. Cập nhật lại bảng "Tổng hợp theo severity" và "Tổng hợp theo status".
3. Nếu có finding CRITICAL/HIGH mới, cân nhắc cập nhật `docs/00_PROJECT_MEMORY.md`.

Không tự suy diễn severity/status khác với những gì đã ghi trong module review gốc.

---

## Tổng hợp theo severity (toàn bộ review đã chạy)

| Severity | Số lượng |
|---|---|
| CRITICAL | 2 |
| HIGH | 20 |
| MEDIUM-HIGH | 2 |
| MEDIUM | 24 |
| LOW-MEDIUM | 14 |
| LOW | 22 |
| INFO | 8 |
| N/A (positive finding) | 9 |
| **Tổng** | **101** |

## Tổng hợp theo status

| Status | Số lượng |
|---|---|
| OPEN | 92 |
| RESOLVED | 1 |
| N/A (positive finding, không cần fix) | 8 |

> Đã sửa lại 2 dòng trên cho khớp với bảng "Toàn bộ finding" bên dưới (bản trước có sai lệch cộng dồn — status của `RV02-04` là RESOLVED, không phải N/A; tổng OPEN+RESOLVED+N/A của 5 review đầu là 28+1+0=29, khớp tổng finding lúc đó).

## Tổng hợp theo review đã chạy

| Review | Ngày | Commit | Tổng finding | CRITICAL | HIGH | MEDIUM | LOW | INFO |
|---|---|---|---|---|---|---|---|---|
| REVIEW-00 (Foundation/Cross-cutting) | 2026-08-30 | `5b58fb1` | 7 | 0 | 1 | 1 (+2 LOW-MEDIUM) | 1 | 2 |
| REVIEW-01 (Authentication) | 2026-08-30 | `5b58fb1` | 6 | 0 | 1 (+1 MEDIUM-HIGH) | 1 (+1 LOW-MEDIUM) | 1 | 1 |
| REVIEW-02 (RBAC/Authorization) | 2026-08-30 | `5b58fb1` | 5 (+1 positive) | 1 | 1 | 1 | 0 | 1 |
| REVIEW-03 (Users & UserAudit) | 2026-08-30 | `5b58fb1` | 5 | 0 | 3 | 1 | 1 | 0 |
| REVIEW-04 (Departments) | 2026-08-30 | `5b58fb1` | 6 | 0 | 1 | 3 | 2 | 0 |
| REVIEW-05 (Documents + Workflow) | 2026-08-30 | `5b58fb1` | 10 (+1 positive) | 1 | 4 | 3 (+1 LOW-MEDIUM) | 1 | 0 |
| REVIEW-06 (Assets — toàn bộ, kể cả Medical Device/Calibration) | 2026-08-30 | `5b58fb1` | 8 (+1 positive) | 0 | 2 | 2 (+2 LOW-MEDIUM) | 2 | 0 |
| REVIEW-07 (Dashboard) | 2026-08-30 | `5b58fb1` | 6 (+1 positive) | 0 | 0 | 1 (+2 LOW-MEDIUM) | 2 | 1 |
| REVIEW-08 (Import/Export Excel) | 2026-08-30 | `5b58fb1` | 7 (+2 positive) | 0 | 0 | 3 (+1 LOW-MEDIUM) | 2 | 1 |
| REVIEW-09 (File Upload) | 2026-08-30 | `5b58fb1` | 10 (+1 positive) | 0 | 4 | 2 (+1 LOW-MEDIUM) | 2 | 1 |
| REVIEW-10 (Notification) | 2026-08-30 | `5b58fb1` | 6 (+1 positive) | 0 | 1 | 2 (+1 LOW-MEDIUM) | 2 | 0 |
| REVIEW-11 (Performance Monitoring) | 2026-08-30 | `5b58fb1` | 5 (+1 positive) | 0 | 2 | 1 | 2 | 0 |
| REVIEW-15 (Cron/Background Jobs — ad-hoc, ngoài kế hoạch gốc; output file `12_CRON_CODE_REVIEW.md`) | 2026-08-31 | `5b58fb1` | 4 | 0 | 0 | 1 (+1 LOW-MEDIUM) | 1 | 1 |
| REVIEW-16 (Shared library — ad-hoc, ngoài kế hoạch gốc; output file `13_SHARED_CODE_REVIEW.md`) | 2026-08-31 | `5b58fb1` | 8 | 0 | 0 | 2 (+1 MEDIUM-HIGH, +2 LOW-MEDIUM) | 3 | 0 |

---

## Toàn bộ finding (chi tiết đầy đủ ở file module review gốc)

| ID | Review | Severity | Category | Tóm tắt | File chính | Status |
|---|---|---|---|---|---|---|
| RV00-01 | REVIEW-00 | HIGH | Functional Bug | Uploaded file không được serve qua HTTP (`express.static` cho `/uploads` không tồn tại) | `backend/src/app.ts` | OPEN |
| RV00-02 | REVIEW-00 | MEDIUM | Security (Info Disclosure) | `errorHandler` lộ `err.message` thô cho lỗi 500 không xác định | `backend/src/middlewares/error.middleware.ts` | OPEN |
| RV00-03 | REVIEW-00 | LOW-MEDIUM | Security (API Exposure) | `/api-docs` (Swagger) public hoàn toàn, không auth | `backend/src/config/swagger/swagger.ts` | OPEN |
| RV00-04 | REVIEW-00 | LOW | Maintainability | 2 rate-limiter độc lập cùng cấu hình cho `/api/auths` | `backend/src/app.ts`, `authRateLimiter.middleware.ts` | OPEN |
| RV00-05 | REVIEW-00 | LOW-MEDIUM | Configuration | `JWT_SECRET`/`JWT_REFRESH_SECRET` không fail-fast khi thiếu | `backend/server.ts` | OPEN |
| RV00-06 | REVIEW-00 | INFO | Technical Debt | Dead code cross-cutting (đã biết, xác nhận lại chưa dọn) | nhiều file | OPEN |
| RV00-07 | REVIEW-00 | INFO | Architecture | `memoryCache.ts` giới hạn single-instance, không coalescing | `backend/src/shared/cache/memoryCache.ts` | OPEN |
| RV02-01 | REVIEW-02 | CRITICAL | Authorization/Privilege Escalation | `updateRoleService` không chặn đổi tên Role thành/khỏi "ADMIN" — hijack bypass string-match | `backend/src/services/rbac/rbac.service.ts` | OPEN |
| RV02-02 | REVIEW-02 | MEDIUM | Authorization Inconsistency | `denyPermissions` vô tác dụng với user role ADMIN (bypass chạy trước) | `backend/src/middlewares/authorizePermission.middleware.ts` | OPEN |
| RV02-03 | REVIEW-02 | HIGH | Injection (cross-ref ISS-04/SEC-13) | NoSQL operator injection qua `resource`/`action` filter vẫn còn nguyên | `backend/src/services/rbac/rbac.service.ts` | OPEN |
| RV02-04 | REVIEW-02 | N/A | Positive Finding | Mass-assignment "B13" ở Role update đã được vá 2 lớp (DTO + whitelist service) | `backend/src/services/rbac/rbac.service.ts` | RESOLVED (đã fix từ trước, chỉ ghi nhận) |
| RV02-05 | REVIEW-02 | INFO | Performance (latent) | `Policy` model không có index, kể cả `{resource,action}` dùng bởi ABAC (hiện dead) | `backend/src/models/rbac/policy.model.ts` | OPEN |
| RV03-01 | REVIEW-03 | HIGH | Authorization/Privilege Escalation | `resetPassword()` (Users) thiếu guard chặn ADMIN mà chính docstring mô tả — account takeover ADMIN nếu quyền bị cấp rộng | `backend/src/services/users/users.service.ts` | OPEN |
| RV03-02 | REVIEW-03 | HIGH | Injection (mở rộng ISS-04) | `getList()` (Users) — NoSQL operator injection qua `role`/`department`, `validateQuery` tắt | `backend/src/services/users/users.service.ts` | OPEN |
| RV03-03 | REVIEW-03 | HIGH | Injection + Resource Exhaustion (cross-ref ISS-04) | UserAudit: cả 3 `validateQuery` tắt dù DTO đã viết sẵn; `limit` không giới hạn ở `GET /` | `backend/src/routes/users/userAudit.routes.ts` | OPEN |
| RV03-04 | REVIEW-03 | MEDIUM | Validation/Data Integrity | `update()` bỏ sót check tồn tại Department khi chỉ đổi `department` không kèm `role` | `backend/src/services/users/users.service.ts` | OPEN |
| RV03-05 | REVIEW-03 | LOW | Validation/API Consistency | `UpdateUserDTO.isActive` được validate nhưng bị `update()` âm thầm bỏ qua | `backend/src/dto/users/users.dto.ts` | OPEN |
| RV01-01 | REVIEW-01 | HIGH | Error Handling | `refresh()` không bọc `jwt.verify()` — refresh token hết hạn/hỏng trả 500 kèm message lỗi thư viện thô | `backend/src/services/auth/auths.service.ts` | OPEN |
| RV01-02 | REVIEW-01 | MEDIUM-HIGH | Security (Data at Rest) | Refresh token lưu PLAINTEXT trong DB, không hash (khác PasswordResetToken) | `backend/src/services/auth/auths.service.ts`, `models/auth/refreshToken.model.ts` | OPEN |
| RV01-03 | REVIEW-01 | MEDIUM | Security (Session Mgmt) | Không có refresh token rotation → không phát hiện được reuse khi token bị đánh cắp | `backend/src/services/auth/auths.service.ts` | OPEN |
| RV01-04 | REVIEW-01 | LOW-MEDIUM | Performance/Data Hygiene | `RefreshToken` model thiếu index cho `token`, không TTL cleanup | `backend/src/models/auth/refreshToken.model.ts` | OPEN |
| RV01-05 | REVIEW-01 | LOW | Security (User Enumeration) | `register()` cho phép dò username/email tồn tại qua 409 Conflict | `backend/src/services/auth/auths.service.ts` | OPEN |
| RV01-06 | REVIEW-01 | INFO | Comment Accuracy | Comment sai: JWT payload thực tế có `role`/`department`, không chỉ `{id}` | `backend/src/shared/helpers/auth.helper.ts` | OPEN |
| RV04-01 | REVIEW-04 | HIGH | Referential Integrity | Xóa Department không check `Asset` (field `department` required)/`AssetAssignmentHistory` → orphan reference | `backend/src/services/departments/departments.service.ts` | OPEN |
| RV04-02 | REVIEW-04 | MEDIUM | Referential Integrity | Check User trước khi xóa Department chỉ xét `isActive:true`, bỏ sót user đã bị vô hiệu hóa | `backend/src/services/departments/departments.service.ts` | OPEN |
| RV04-03 | REVIEW-04 | MEDIUM | Validation | DTO Department viết đầy đủ nhưng chưa từng wire vào route; DTO còn lệch field với model (`isActive`, `description`) | `backend/src/routes/departments/department.routes.ts`, `backend/src/dto/departments/departments.dto.ts` | OPEN |
| RV04-04 | REVIEW-04 | MEDIUM | Injection/Availability | Regex filter (`keyword`/`code`/`name`) dựng trực tiếp từ input, không escape — ReDoS tiềm ẩn | `backend/src/services/departments/departments.service.ts` | OPEN |
| RV04-05 | REVIEW-04 | LOW | Error Handling | Update trùng `code` không pre-check → lộ raw Mongo E11000 error (liên hệ RV00-02) | `backend/src/services/departments/departments.service.ts` | OPEN |
| RV04-06 | REVIEW-04 | LOW | Audit/Maintainability | Tái sử dụng `UserAudit` cho hành động Department làm giảm khả năng truy vết theo entity | `backend/src/services/departments/departments.service.ts` | OPEN |
| RV05-01 | REVIEW-05 | CRITICAL | Business Logic | `DOCUMENT_RULES.CONFIRM_STATUS` yêu cầu reference `PROPOSE_INK`, nhưng `syncAssetOnDocumentApproved` hard-code tìm `PROPOSE_REPAIR` → Asset không bao giờ thoát `UNDER_MAINTENANCE` sau khi CONFIRM_STATUS duyệt xong, im lặng không báo lỗi. Củng cố thêm bởi RV07-05, RV08-06 (nghiêng về hướng `workflow.service.ts` sai, không phải `documentRules.ts`) | `backend/src/shared/constants/documentRules.ts`, `backend/src/services/documents/workflow.service.ts` | OPEN |
| RV05-02 | REVIEW-05 | HIGH | Authorization | `POST /api/documents/proposal` vẫn thiếu `authorizePermission("DOCUMENT_CREATE")` (=ISS-09, vẫn mở) | `backend/src/routes/documents/document.route.ts` | OPEN |
| RV05-03 | REVIEW-05 | HIGH | API/Validation | Pagination `GET /documents` vẫn hỏng — `QueryDocumentDTO` đã viết đúng nhưng `validateQuery` vẫn bị comment ở route (=ISS-08) | `backend/src/routes/documents/document.route.ts` | OPEN |
| RV05-04 | REVIEW-05 | HIGH | Authorization/Data integrity | Không có department-scoping khi ĐỌC Document (List/Detail), dù CÓ khi SỬA — UNKNOWN có phải chủ đích | `backend/src/services/documents/document.service.ts` | OPEN |
| RV05-05 | REVIEW-05 | HIGH | Data integrity | Hard-delete Document theo tháng vẫn không check tham chiếu ngược (=ISS-02, không đổi) | `backend/src/services/documents/document.service.ts` | OPEN |
| RV05-06 | REVIEW-05 | MEDIUM | Data integrity/Workflow | Soft-delete Document không chặn/đồng bộ WorkflowInstance đang pending — approver vẫn duyệt được document đã ẩn | `backend/src/services/documents/document.service.ts` | OPEN |
| RV05-07 | REVIEW-05 | MEDIUM | Race condition | TOCTOU khi chặn trùng đề xuất sửa chữa (`PROPOSE_REPAIR`) cho 1 asset | `backend/src/services/documents/document.service.ts` | OPEN |
| RV05-08 | REVIEW-05 | MEDIUM | Performance | `WorkflowInstance` vẫn 0 index ngoài `_id` — hộp thư chờ duyệt luôn COLLSCAN (=Phase04 §9.3) | `backend/src/models/documents/workflowInstance.model.ts` | OPEN |
| RV05-09 | REVIEW-05 | LOW-MEDIUM | Maintainability | ~500 dòng code chết comment nguyên khối cuối `workflow.service.ts` | `backend/src/services/documents/workflow.service.ts` | OPEN |
| RV05-10 | REVIEW-05 | LOW | API/Validation | `DELETE /documents/delete-by-month` vẫn thiếu validate `month`/`year` (=ISS-26) | `backend/src/routes/documents/document.route.ts` | OPEN |
| RV05-11 | REVIEW-05 | N/A | Positive Finding | Domain Documents hardening đáng kể từ baseline: transaction đầy đủ, whitelist filter + escape regex, audit trail đầy đủ kể cả Restore | `backend/src/services/documents/document.service.ts` | N/A |
| RV06-01 | REVIEW-06 | HIGH | Business Logic/Authorization bypass | `UpdateAssetDTO`/`ASSET_UPDATE_WHITELIST` có `isActive` — `PUT /assets/:id` (chỉ cần `ASSET_UPDATE`) bỏ qua toàn bộ guard của `deleteAssetService`, không set `deletedAt`/`deletedBy` | `backend/src/dto/assets/assets.dto.ts`, `backend/src/services/assets/assets.constants.ts` | OPEN |
| RV06-02 | REVIEW-06 | HIGH | Security (ReDoS) | `getAllAssetsService`/`getAllAssetCategoriesService` không escape regex cho `keyword` search | `backend/src/services/assets/assetDevice/asset.service.ts` | OPEN |
| RV06-03 | REVIEW-06 | MEDIUM | Data integrity | Hard-delete Asset vẫn không check `Document.relatedAsset` (=Phase04 §12.2/ISS-18) | `backend/src/services/assets/assetDevice/asset.service.ts` | OPEN |
| RV06-04 | REVIEW-06 | MEDIUM | Authorization/Data exposure | Domain Asset hoàn toàn không có department-scoping (Read lẫn Assignment) — UNKNOWN có phải chủ đích | `backend/src/services/assets/assetDevice/{asset,assetAssignment}.service.ts` | OPEN |
| RV06-05 | REVIEW-06 | LOW-MEDIUM | Maintainability | ~280 dòng code chết comment nguyên khối cuối `assetAssignment.service.ts` | `backend/src/services/assets/assetDevice/assetAssignment.service.ts` | OPEN |
| RV06-06 | REVIEW-06 | LOW | Performance | `AssetCategory` vẫn thiếu index `parentCategory` | `backend/src/models/assets/assetCategory.model.ts` | OPEN |
| RV06-07 | REVIEW-06 | LOW | Performance | Cron cảnh báo Asset ghi tuần tự + N+1 role/user lookup mỗi asset (cross-ref PERF-09) | `backend/src/services/assets/assetDevice/assetAlerts.service.ts` | OPEN |
| RV06-08 | REVIEW-06 | LOW-MEDIUM | Race condition | Không bắt riêng Mongoose `VersionError` khi assign/transfer/return đồng thời — rơi vào nhánh 500 mặc định (RV00-02) | `backend/src/services/assets/assetDevice/assetAssignment.service.ts` | OPEN |
| RV06-09 | REVIEW-06 | N/A | Positive Finding | Domain Assets/Assignment/Calibration cẩn thận nhất hệ thống: transaction đúng, `hasValidRecipients` chống silent-failure ở cron, dọn file mồ côi có điều kiện | `backend/src/services/assets/assetDevice/*.ts` | N/A |
| RV07-01 | REVIEW-07 | MEDIUM | Authorization/Data exposure | 11/12 endpoint dashboard (trừ `admin-summary`) không có department-scoping — cùng dạng RV05-04/RV06-04 | `backend/src/controllers/dashboard/dashboard.controller.ts` | OPEN |
| RV07-02 | REVIEW-07 | LOW-MEDIUM | Performance | `Document`/`Asset` vẫn thiếu index `isActive` cho mọi aggregate dashboard (=PERF-03, mở rộng sang Asset) | `backend/src/models/{documents/document,assets/asset}.model.ts` | OPEN |
| RV07-03 | REVIEW-07 | LOW | Cache/Staleness | Cache dashboard có sẵn `clearCacheByPrefix`/`clearCacheKey` nhưng KHÔNG được gọi ở bất kỳ đâu — chỉ dựa TTL 30s | `backend/src/shared/cache/memoryCache.ts` | OPEN |
| RV07-04 | REVIEW-07 | LOW | Maintainability | 2 pattern `runPaginatedAggregate` song song (tự ghi nhận trong code) | `backend/src/services/dashboard/dashboard.service.ts` | OPEN |
| RV07-05 | REVIEW-07 | INFO | Business Logic/KPI correctness | `topDamagedInkService` group theo `CONFIRM_STATUS`, khớp `documentRules.ts` — bằng chứng liên domain củng cố RV05-01 | `backend/src/services/dashboard/dashboard.service.ts` | OPEN |
| RV07-06 | REVIEW-07 | LOW-MEDIUM | KPI correctness | `$unwind: "$meta.items"` không có `preserveNullAndEmptyArrays` — document thiếu field bị âm thầm loại khỏi KPI | `backend/src/services/dashboard/dashboard.service.ts` | OPEN |
| RV07-07 | REVIEW-07 | N/A | Positive Finding | Domain sạch nhất tính tới nay: đã tự xoá hẳn ~250 dòng code chết, sửa đúng bug filter department, whitelist sortBy, validate ngày tháng chặt | `backend/src/services/dashboard/dashboard.service.ts` | N/A |
| RV08-01 | REVIEW-08 | MEDIUM | Error handling/API contract | Lỗi `multer` (sai định dạng/quá size) không được `error.middleware.ts` nhận diện → 500 thay vì 400, ảnh hưởng mọi route upload Excel | `backend/src/middlewares/{upload,error}.middleware.ts` | OPEN |
| RV08-02 | REVIEW-08 | MEDIUM | Performance | Import Document Excel — N+1 transaction/dòng, xác nhận là đánh đổi có chủ đích (=PERF-07) | `backend/src/services/excel/excel.service.ts` | OPEN |
| RV08-03 | REVIEW-08 | MEDIUM | Performance | `buildMapFromReports` vẫn tải toàn hệ thống không lọc phạm vi export (=PERF-08) | `backend/src/shared/helpers/buildMapReports.ts` | OPEN |
| RV08-04 | REVIEW-08 | LOW-MEDIUM | Data integrity/Race condition | Dò trùng lặp Proposal khi import không atomic với transaction — 2 import đồng thời có thể tạo trùng lặp | `backend/src/services/excel/excel.service.ts` | OPEN |
| RV08-05 | REVIEW-08 | LOW | File security | Upload chỉ check extension, không check magic-byte — rủi ro thấp vì memoryStorage (=SEC-16, phạm vi hẹp hơn) | `backend/src/middlewares/upload.middleware.ts` | OPEN |
| RV08-06 | REVIEW-08 | INFO | Business Logic | `excel.service.ts` (import lẫn export) dùng nhất quán `PROPOSE_INK ↔ CONFIRM_STATUS` — bằng chứng độc lập thứ 2 củng cố RV05-01 | `backend/src/services/excel/excel.service.ts` | OPEN |
| RV08-07 | REVIEW-08 | LOW | Maintainability | ~207 dòng code chết comment nguyên khối trong `excel.service.ts` | `backend/src/services/excel/excel.service.ts` | OPEN |
| RV08-08 | REVIEW-08 | N/A | Positive Finding (clarification) | Formula injection (SEC-15) chỉ áp dụng CSV — export `.xlsx` thật qua ExcelJS ở đây rủi ro thấp hơn nhiều (OOXML tách biệt cell công thức/text) | `backend/src/services/excel/excel.service.ts` | N/A |
| RV08-09 | REVIEW-08 | N/A | Positive Finding | `syncDepartmentFromExcel` dùng `insertMany`, Excel export dùng cursor+streaming đúng chuẩn, header validation chống lệch cột âm thầm | `backend/src/services/excel/excel.service.ts` | N/A |
| RV09-01 | REVIEW-09 | HIGH | File Upload/Security | `POST /api/upload` gọi `createUploader()` không truyền `allowedTypes` → chấp nhận MỌI loại file, không check gì | `backend/src/routes/upload/upload.routes.ts`, `backend/src/services/upload/upload.middleware.ts` | OPEN |
| RV09-02 | REVIEW-09 | HIGH | Authorization/Data integrity | `saveFilesToDB` không bao giờ set `uploadedBy` — file upload qua `/api/upload` không có chủ sở hữu trong DB (tiền đề RV09-03/04) | `backend/src/services/upload/upload.service.ts` | OPEN |
| RV09-03 | REVIEW-09 | HIGH | Authorization (IDOR) | `GET /api/upload` trả về TOÀN BỘ file của MỌI user, không filter, không phân trang | `backend/src/controllers/upload/upload.controller.ts` | OPEN |
| RV09-04 | REVIEW-09 | HIGH | Authorization (IDOR) | `GET/DELETE /api/upload/:id` không check ownership — bất kỳ user có `DELETE_FILE` xoá được file của người khác | `backend/src/controllers/upload/upload.controller.ts` | OPEN |
| RV09-05 | REVIEW-09 | MEDIUM | File Upload/Path Traversal | `file.originalname` không sanitize khi đặt tên file lưu disk (=SEC-16, không đổi) | `backend/src/services/upload/upload.middleware.ts` | OPEN |
| RV09-06 | REVIEW-09 | MEDIUM | Performance/Availability | `GET /api/upload` không phân trang — tải toàn bộ collection vào response | `backend/src/controllers/upload/upload.controller.ts` | OPEN |
| RV09-07 | REVIEW-09 | LOW-MEDIUM | Error handling | `upload.controller.ts` không dùng `catchAsync`/`ApiError`, khác 100% mọi controller khác đã review | `backend/src/controllers/upload/upload.controller.ts` | OPEN |
| RV09-08 | REVIEW-09 | LOW | Maintainability | `validateFiles` viết đầy đủ nhưng không bao giờ được gọi — dead code, validate hữu ích không được enforce | `backend/src/services/upload/upload.validator.ts` | OPEN |
| RV09-09 | REVIEW-09 | INFO | File Upload/Architecture | Không có `express.static`/`res.download`/`res.sendFile` cho `/uploads` — giảm nhẹ RV09-01/03/04 qua chính app, nhưng UNKNOWN nếu hạ tầng ngoài serve tĩnh thư mục này | `backend/src/services/upload/upload.middleware.ts` | OPEN |
| RV09-10 | REVIEW-09 | LOW | Orphan files | Không có cơ chế dọn file mồ côi khi ghi DB thất bại sau khi Multer đã ghi file (=SEC-18) | `backend/src/services/upload/upload.service.ts` | OPEN |
| RV09-11 | REVIEW-09 | N/A | Positive Finding (đối chứng) | `certificateUploader`/`createCalibrationRecordService` (REVIEW-06) làm ĐÚNG những gì `/api/upload` làm sai — chứng minh `createUploader` không có vấn đề kiến trúc | `backend/src/routes/assets/medicalDevice.routes.ts` | N/A |
| RV10-01 | REVIEW-10 | HIGH | Functional Bug/API contract | `GET /notifications` — `validateQuery` bị comment → `page`/`limit` là `undefined` khi không truyền param → `skip=NaN` (khả năng lỗi runtime, nặng hơn ISS-08); filter `isRead` hỏng hoàn toàn do lệch kiểu string/boolean | `backend/src/routes/notifications/notification.routes.ts`, `backend/src/services/notifications/notification.service.ts` | OPEN |
| RV10-02 | REVIEW-10 | MEDIUM | Security (HTML/Email Injection) | Email nhúng thẳng `title`/`message` (dữ liệu user kiểm soát gián tiếp, VD `Document.title`) vào `html` không escape | `backend/src/services/notifications/notification.service.ts` | OPEN |
| RV10-03 | REVIEW-10 | MEDIUM | Reliability (Retry/Dead-letter) | Không có cơ chế retry/dead-letter cho email gửi thất bại — lỗi chỉ log rồi mất vĩnh viễn | `backend/src/services/notifications/notification.service.ts`, `backend/src/shared/utils/mailer.ts` | OPEN |
| RV10-04 | REVIEW-10 | LOW-MEDIUM | Configuration | `mailer.ts` không fail-fast khi thiếu env SMTP — lỗi chỉ lộ ra khi gửi mail đầu tiên (cross-ref RV00-05) | `backend/src/shared/utils/mailer.ts` | OPEN |
| RV10-05 | REVIEW-10 | LOW | Maintainability | `CreateNotificationDTO.resourceType` thiếu `"Asset"` — DTO lệch enum thật, vô hại vì chưa từng được `.parse()` | `backend/src/dto/notifications/notification.dto.ts` | OPEN |
| RV10-06 | REVIEW-10 | LOW | Duplicate/Idempotency | Không có ràng buộc chống trùng lặp khi tạo Notification — chỉ là hệ quả nếu tầng nghiệp vụ gốc có race condition (RV05-07/RV06-08/RV08-04), không phải lỗi độc lập | `backend/src/models/notifications/notification.model.ts` | OPEN |
| RV10-07 | REVIEW-10 | N/A | Positive Finding | IDOR protection tốt nhất hệ thống tính tới nay — mọi hàm đọc/sửa/xoá đều filter cứng theo `recipient`; email fire-and-forget đúng thiết kế, `Promise.allSettled` cho broadcast | `backend/src/services/notifications/notification.service.ts` | N/A |
| RV11-01 | REVIEW-11 | HIGH | Authorization | `GET /performances/dashboard` không có check phân quyền nào ngoài `authenticate` — mọi user đăng nhập xem được; xung đột với Phase 05 (tài liệu lỗi thời, đã ưu tiên source hiện tại) | `backend/src/routes/performances/performance.routes.ts`, `backend/src/controllers/performances/performance.controller.ts` | OPEN |
| RV11-02 | REVIEW-11 | HIGH | Metrics Correctness | `endpoint` ghi theo `req.route.path` không có tiền tố mount router (`req.baseUrl`) — hàng chục domain dùng chung pattern (`/:id`...) bị gộp lẫn vào cùng 1 nhóm thống kê, hỏng mục đích cốt lõi dashboard | `backend/src/middlewares/performance.middleware.ts` | OPEN |
| RV11-03 | REVIEW-11 | MEDIUM | Metrics Correctness/Data Quality | Fallback `req.originalUrl` khi route không match tạo `endpoint` cardinality cao — mọi request 404 (luôn được log 100%) làm loãng dữ liệu thống kê | `backend/src/middlewares/performance.middleware.ts` | OPEN |
| RV11-04 | REVIEW-11 | LOW | Database/Index | Index trùng lặp trên `createdAt` — 1 plain `{createdAt:-1}` + 1 TTL `{createdAt:1,expireAfterSeconds}`, dư thừa | `backend/src/models/apiPerformance/apiPerformance.model.ts` | OPEN |
| RV11-05 | REVIEW-11 | LOW | Validation | `from`/`to` query param không validate trước khi đưa vào `new Date()` | `backend/src/controllers/performances/performance.controller.ts` | OPEN |
| RV11-06 | REVIEW-11 | N/A | Positive Finding | Batch+sampling là thiết kế hiệu năng tốt nhất chuỗi review; tự phát hiện và xoá hẳn field luôn=0; graceful shutdown flush wire đúng; không log dữ liệu nhạy cảm | `backend/src/shared/performance/performanceLogBuffer.ts` | N/A |
| RV15-01 | REVIEW-15 | MEDIUM | Idempotency/Restart | `notifyUsersByRoleName(...)` rồi mới `asset/profile.sentAt = now; await .save()` — 2 thao tác không atomic; crash/restart server đúng lúc giữa chừng → asset đó bị gửi cảnh báo trùng ở lần cron chạy kế tiếp | `backend/src/services/assets/assetDevice/assetAlerts.service.ts`, `backend/src/services/assets/medicalDevice/medicalDeviceAlerts.service.ts` | OPEN |
| RV15-02 | REVIEW-15 | LOW-MEDIUM | Retry/Error handling | `sentAt` được set vô điều kiện ngay sau khi gọi `notifyUsersByRoleName`, dù hàm này có thể đã gửi lỗi cho TOÀN BỘ user role "IT" (dùng `Promise.allSettled` + nuốt lỗi, không trả về số lượng thành công thực tế) — không retry, cron sẽ không bao giờ thử lại cho asset đó | `backend/src/services/assets/assetDevice/assetAlerts.service.ts`, `backend/src/services/assets/medicalDevice/medicalDeviceAlerts.service.ts` | OPEN |
| RV15-03 | REVIEW-15 | LOW | Concurrency/Duplicate execution | `node-cron@4.6.0` hỗ trợ sẵn `noOverlap`/`distributed`/`runCoordinator` nhưng cả 2 file cron đều không dùng — nếu tương lai scale nhiều instance (PM2 cluster/nhiều container), mỗi instance tự chạy cron riêng theo cùng lịch, không có lock chống chạy trùng (mô hình deploy thực tế hiện UNKNOWN, chưa xác nhận) | `backend/src/shared/cron/assetAlerts.cron.ts`, `backend/src/shared/cron/medicalDeviceAlerts.cron.ts` | OPEN |
| RV15-04 | REVIEW-15 | INFO | Transaction | Không có MongoDB transaction bọc "tạo Notification" + "set sentAt" — là nguyên nhân gốc của RV15-01; mức đầu tư sửa (có cần transaction hay chấp nhận rủi ro thấp) nên do chủ nghiệp vụ quyết định | như RV15-01 | OPEN |
| RV16-01 | REVIEW-16 | MEDIUM-HIGH | Duplicate data/Hidden business logic | `permission.descriptors.ts` là dead code (không nơi nào import) nhưng comment khẳng định sai rằng nó đang được `seed-rbac.ts` dùng để chống lệch permission; `seed-rbac.ts` thực tế dùng 1 map mô tả riêng độc lập (đã đúng bộ, có `USER_ASSIGN_ROLE`) trong khi `permission.descriptors.ts` bị bỏ sót `USER_ASSIGN_ROLE` — nếu file này từng bị import, guard tự viết bên trong sẽ crash ngay lúc import | `backend/src/shared/constants/permission.descriptors.ts`, `backend/scripts/seed-rbac.ts` | OPEN |
| RV16-02 | REVIEW-16 | MEDIUM | Duplicate utilities | `dashboard.service.ts` tự viết lại `runPaginatedAggregate` thay vì dùng bản dùng chung tổng quát hơn ở `shared/utils/Queryparsing.util.ts` (đã thiết kế sẵn để tái dùng — đối chứng: `medicalDeviceDashboard.service.ts` dùng đúng cách); củng cố thêm cho RV07-04 | `backend/src/shared/utils/Queryparsing.util.ts`, `backend/src/services/dashboard/dashboard.service.ts` | OPEN |
| RV16-03 | REVIEW-16 | MEDIUM | Security (HTML Injection) | `buildPasswordResetEmail()` nội suy `fullName` vào HTML email không escape, gửi thật qua `sendMail()` — cùng lớp lỗ hổng với RV10-02, phạm vi ảnh hưởng hẹp hơn (thường chỉ ảnh hưởng email của chính chủ tài khoản) | `backend/src/shared/helpers/passwordReset.template.ts` | OPEN |
| RV16-04 | REVIEW-16 | LOW-MEDIUM | Coupling/Maintainability | Không có ranh giới rõ ràng giữa `helpers/` và `utils/` — các hàm cùng pattern (`generateAssetCode` vs `generateDocumentCode`, cùng dùng chung `getNextSequence`) nằm ở 2 thư mục khác nhau không theo quy tắc nào | `backend/src/shared/helpers/generateAssetCode.ts`, `backend/src/shared/utils/generateDocumentCode.ts` | OPEN |
| RV16-05 | REVIEW-16 | LOW-MEDIUM | Maintainability (dead code, tổng hợp) | 4 vị trí code chết bị comment nguyên khối thay vì xoá (`importHeaderValidator.helper.ts`, `parse-doc.ts`, `formatDate.ts`, `generate-code.ts`) — cùng thói quen đã ghi nhận ở RV05-09/RV06-05/RV08-07 | `backend/src/shared/helpers/{importHeaderValidator.helper,parse-doc,generate-code}.ts`, `backend/src/shared/utils/formatDate.ts` | OPEN |
| RV16-06 | REVIEW-16 | LOW | Type safety | `req.user.permissions: string[]` không phản ánh đúng 2 giai đoạn population thật (luôn `[]` ngay sau `authenticate`, chỉ đúng sau `authorizePermission` chạy kế tiếp) | `backend/src/shared/types/express.d.ts`, `backend/src/middlewares/auth.middleware.ts` | OPEN |
| RV16-07 | REVIEW-16 | LOW | Maintainability | 3/24 file trong `shared/` dùng PascalCase (`Mongoid.util.ts`, `Policycondition.evaluator.ts`, `Queryparsing.util.ts`) trong khi phần còn lại dùng camelCase | `backend/src/shared/utils/{Mongoid.util,Policycondition.evaluator,Queryparsing.util}.ts` | OPEN |
| RV16-08 | REVIEW-16 | LOW | Comment hygiene | Comment đầu file thể hiện không chắc chắn về đường dẫn import của chính file (đã verify đường dẫn thực tế đúng) — dấu hiệu code được viết thiếu ngữ cảnh toàn repo | `backend/src/shared/helpers/parse-doc.ts` | OPEN |

---

## Ghi chú liên kết với 13-phase historical analysis

Một số finding ở review theo module có thể trùng/liên quan tới finding đã có ID trong 13-phase analysis (`SEC-XX`, `ISS-XX`, `PERF-XX`, `TD-XX`). Khi phát hiện trùng, module review sẽ ghi chú tham chiếu chéo ngay trong file gốc thay vì tạo ID mới trùng lặp ở đây — file summary này chỉ liệt kê theo ID review (`RVxx-YY`) để tránh nhầm lẫn 2 hệ thống đánh số.

## Cross-reference nổi bật giữa các review (liên domain)

RV05-01 (CRITICAL, Documents/Workflow — mâu thuẫn `CONFIRM_STATUS` giữa `documentRules.ts` và `workflow.service.ts`) được CỦNG CỐ bởi 2 bằng chứng độc lập ở review khác: RV07-05 (Dashboard KPI "top damaged ink") và RV08-06 (Excel import/export) — cả 2 đều dùng nhất quán `CONFIRM_STATUS ↔ PROPOSE_INK`, nghiêng về hướng lỗi nằm ở `workflow.service.ts:syncAssetOnDocumentApproved`, không phải `documentRules.ts`. Đọc cả 3 file review (05, 07, 08) trước khi quyết định hướng fix.

Mẫu hình "không có department-scoping khi ĐỌC dữ liệu" lặp lại nhất quán ở 3 domain: RV05-04 (Documents), RV06-04 (Assets), RV07-01 (Dashboard) — cùng 1 câu hỏi UNKNOWN cần xác nhận với chủ dự án (chủ đích thiết kế hay thiếu sót), nên xử lý đồng bộ nếu quyết định sửa.

Mẫu hình "code chết bị comment nguyên khối thay vì xoá" lặp lại ở RV05-09 (`workflow.service.ts`, ~500 dòng), RV06-05 (`assetAssignment.service.ts`, ~280 dòng), RV08-07 (`excel.service.ts`, ~207 dòng) — đối lập với `dashboard.service.ts` (REVIEW-07) đã tự xoá sạch cùng loại code chết, cho thấy đây là việc dọn dẹp khả thi khi được ưu tiên.

RV06-07 (REVIEW-06, LOW, performance — "cron cảnh báo Asset ghi tuần tự + N+1 role/user lookup mỗi asset") là quan sát sơ bộ ban đầu về đúng 2 cron job này; REVIEW-15 đào sâu toàn diện hơn (scheduling/idempotency/retry/concurrency/transaction/restart/timezone) và phát hiện thêm RV15-01/02 (idempotency + retry, MEDIUM/LOW-MEDIUM — nghiêm trọng hơn quan sát performance thuần tuý ở RV06-07) trên cùng 2 file `assetAlerts.service.ts`/`medicalDeviceAlerts.service.ts`.

RV16-02 (REVIEW-16, MEDIUM — `dashboard.service.ts` tự viết lại `runPaginatedAggregate` thay vì dùng bản dùng chung ở `shared/utils/Queryparsing.util.ts`) CỦNG CỐ RV07-04 (REVIEW-07, "2 pattern `runPaginatedAggregate` song song") — REVIEW-16 xác nhận thêm từ phía `shared/`: bản dùng chung đã tồn tại và được thiết kế đúng để tái dùng (nhận `model` làm tham số), `dashboard.service.ts` chỉ đơn giản chưa migrate sang dùng nó.

RV16-03 (REVIEW-16, MEDIUM — HTML injection qua `fullName` chưa escape ở `passwordReset.template.ts`) CÙNG LỚP LỖ HỔNG với RV10-02 (REVIEW-10, HTML/Email injection ở `notification.service.ts`) — nên xử lý đồng bộ cả 2 file nếu quyết định sửa.

RV16 mục "Hidden business logic" (`documentRules.ts`, `constants/documentRules.ts`) là bằng chứng ĐỘC LẬP THỨ 3 củng cố RV05-01 (sau RV07-05 và RV08-06): `CONFIRM_STATUS.referenceSubType = PROPOSE_INK` nhất quán ở cả 3 domain, càng nghiêng về hướng lỗi nằm ở `workflow.service.ts:syncAssetOnDocumentApproved`, không phải ở bảng rule.

## REVIEW-XX chưa chạy

REVIEW-12 → REVIEW-14 (Database cross-domain, API contract & OpenAPI, Scripts/Config/Deployment) trong kế hoạch gốc hiện chưa có finding nào (chưa chạy). REVIEW-15 (Cron/Background Jobs) và REVIEW-16 (Shared library) đã chạy ngoài kế hoạch gốc theo yêu cầu riêng — xem `docs/review-index/CODE_REVIEW_INDEX.md` để biết trạng thái/thứ tự thực hiện, ghi chú đổi số thứ tự so với kế hoạch gốc, và ghi chú trùng tên file output giữa REVIEW-12/REVIEW-13 (Database cross-domain / API contract & OpenAPI, cả 2 TODO) và REVIEW-15/REVIEW-16 (Cron / Shared, cả 2 DONE, file `12_CRON_CODE_REVIEW.md` / `13_SHARED_CODE_REVIEW.md`).
