# 11 — TECHNICAL DEBT ANALYSIS

> Phase: 11 — Technical Debt Analysis
> Phạm vi: TỔNG HỢP technical debt đã có evidence từ Phase 01–10 (Architecture/Backend/Database/API/Frontend/Security/Testing/Deployment/Maintainability). KHÔNG tìm lỗi mới, KHÔNG phân tích sâu thêm, KHÔNG refactor.
> Nguồn: `00_PROJECT_MEMORY.md`, `01_PROJECT_OVERVIEW.md`, `02_ARCHITECTURE.md`, `03_BACKEND_ANALYSIS.md`, `04_DATABASE_ANALYSIS.md`, `05_API_ANALYSIS.md`, `06_FRONTEND_ANALYSIS.md` (N/A), `07_AUTH_RBAC_ANALYSIS.md`, `08_BUSINESS_LOGIC.md`, `09_SECURITY_ANALYSIS.md`, `10_PERFORMANCE_ANALYSIS.md` — tất cả tại commit `f4ce8e9083e16c01177f53a3871b66cfde4133b8`.
> Quy ước: **CONFIRMED** = evidence trực tiếp trong source. **INFERRED** = suy luận hợp lý, chưa test runtime. **UNKNOWN** = chưa đủ evidence. Mục Security KHÔNG lặp lại nội dung `09_SECURITY_ANALYSIS.md` — chỉ reference finding ID.

---

## 1. ARCHITECTURE DEBT

| Vấn đề | Loại | Evidence |
|---|---|---|
| Toàn bộ tầng ABAC (Policy model + evaluator 319 dòng + CRUD API) là kiến trúc hoàn chỉnh nhưng **chết hoàn toàn ở runtime** — không route nào truyền `options.enablePolicies` | Wrong responsibility / dead architecture layer | Phase 07 §5.3, Phase 09 SEC-07 |
| Cross-domain coupling xảy ra ở tầng Service gọi thẳng Service/Model domain khác, không có event bus/interface trung gian — muốn đổi enum `AssetStatus` phải rà tay mọi domain gọi tới | High coupling | Phase 02 §7 |
| Cache permission in-memory (`Map`, TTL 5 phút) không chia sẻ giữa các instance nếu triển khai multi-instance — chặn khả năng scale-out ngang | Poor separation (state gắn với process) | Phase 02 §6, Phase 07 §5.4 |
| Không có cache layer ngoài (Redis/CDN/HTTP cache header) trong toàn hệ thống | Architecture gap | Phase 02 §1, Phase 10 PERF-14 |
| Side-effect (Notification, đồng bộ Asset khi approve workflow) nằm ngoài DB transaction chính theo chủ đích thiết kế — đánh đổi consistency tuyệt đối lấy việc không để lỗi phụ làm hỏng thao tác chính | Thiết kế có chủ đích, nhưng rủi ro eventual-consistency chưa có cơ chế bù trừ (retry/outbox) | Phase 02 §9.3 |
| `WorkflowInstance.steps[].role` lưu **free string** thay vì ObjectId reference tới `Role` — Workflow có thể bị "kẹt vĩnh viễn" nếu Role bị đổi tên/xoá sau khi Template đã tạo | Wrong responsibility / thiếu ràng buộc tham chiếu | Phase 02, Phase 04 §12.3 |
| 2 lớp nguồn permission (`permission.constant.ts` code-level vs `Permission` collection DB thật) không có cầu nối tự động; `ROLE_PERMISSIONS` (223 dòng cấu hình ý đồ phân quyền) viết cho 1 script seed **không tồn tại** | Configuration drift kiến trúc | Phase 07 §6.1, SEC-09 |

---

## 2. CODE QUALITY DEBT

| Vấn đề | Loại | Evidence |
|---|---|---|
| Dead code tích luỹ: `shared/errors/errorHandler.ts` (deprecated), `middlewares/loadDocument.middleware.ts` (viết đủ, không gắn route), `config/database/mongo.logger.ts` (`registerMongoLogger()` không gọi ở đâu dù `.env.example` tài liệu hoá như đang hoạt động), `services/upload/upload.validator.ts` (`validateFiles()` không consumer), `services/documents/documents.validator.ts` (2 hàm tự đánh dấu deprecated), ~40 dòng comment code cũ trong `database.ts`, `ROLE_PERMISSIONS` (223 dòng, Phase 07 §6.1), `assignRole()` (có safeguard đúng nhưng không gắn route nào, Phase 07 §5.4/9.2) | Dead code | Phase 03 §11.4, Phase 07 §5.4/6.1/9.2 |
| 2 rate-limiter cấu hình **giống hệt nhau** (`app.ts` inline `authLimiter` và `authRateLimiter.middleware.ts`) cùng áp cho `/api/auths` — 2 bộ đếm độc lập, không chia sẻ counter | Duplicate logic | Phase 03 §10.1/11.3 |
| 2 cấu hình Multer riêng biệt (`middlewares/upload.middleware.ts` vs `services/upload/upload.middleware.ts`) không dùng chung 1 factory | Duplicate pattern (không hẳn duplicate logic hoàn toàn, nhưng dễ nhầm lẫn bảo trì) | Phase 03 §11.3 |
| Response format **không đồng nhất** giữa domain: pattern phổ biến nhất `{success, message?, data?}`, nhưng `auth` không có field `success` (và không nhất quán ngay trong cùng 1 file — `user` vs `data`), `upload` lệch nhiều nhất (không `catchAsync`, không `ApiError`, tự `try/catch` + `res.status().json()`) | Inconsistent pattern | Phase 03 §4, Phase 05 §11 #7 |
| Tên field pagination lệch (`totalPages` vs `totalPage`) giữa domain Documents và Users | Inconsistent naming | Phase 05 §11 #8 |
| Nhiều comment trong code **lỗi thời, mâu thuẫn với hành vi thực tế** của chính file đó: (a) comment JWT payload khẳng định "chỉ gồm `{id}}`" nhưng thực tế payload chứa `role`/`department`; (b) comment `hardDeleteAssetService` nói field `relatedAsset` "chưa tồn tại (Giai đoạn 1)" dù field đã tồn tại từ lâu; (c) comment đầu `workflow.routes.ts` nói route "không đảm bảo ai được phép gọi" dù mọi route trong file đã có `authorizePermission` đầy đủ; (d) comment `openAPI.yaml` báo 4 permission Upload "chưa tồn tại" dù đã có trong `permission.constant.ts` | Comment/documentation drift | Phase 03 §3.2(d), Phase 05 §9.1, Phase 07 §3.1 |

---

## 3. API DEBT

| Vấn đề | Loại | Evidence |
|---|---|---|
| 11 route có `validateQuery` bị comment out (Documents, Workflow pending, Users, RBAC ×3, UserAudit ×3, Notifications, Assets ×2) — mất coerce/validate kiểu dữ liệu query | Missing validation | Phase 05 §5.2/11 #4, SEC-10 |
| `GET /api/documents` luôn trả trang 1/10 bản ghi bất kể `page`/`limit` — hệ quả trực tiếp của việc mất `validateQuery` | Missing validation → functional bug | Phase 05 §4.4/11 #1 |
| `POST /api/documents/proposal` không có `authorizePermission` (dòng bị comment) | Missing validation (authorization) | Phase 03 §3.2(a), Phase 05 §2.6, SEC-06 |
| RBAC (`Permission`/`Role`/`Policy`) thiếu `validateParams(IdParamDTO)` ở toàn bộ route PUT/DELETE theo `:id` | Missing validation | Phase 05 §2.4/11 #5, SEC-11 |
| Departments — **không có** `validateBody`/`validateParams` ở bất kỳ route nào trong domain | Missing validation | Phase 05 §2.5/11 #6, SEC-11 |
| `DELETE /api/documents/delete-by-month` không `validateBody` cho `month`/`year` (tự comment "chưa xử lý") | Missing validation | Phase 04 §12.1, SEC-12 |
| Response shape domain Upload: 4 dạng khác nhau (mảng trần, object trần, thiếu `success`) trong cùng 1 domain | Inconsistent response | Phase 03 §4, Phase 05 §6.2/11 #7 |
| File upload chung (`/api/upload`) và file chứng nhận kiểm định **không truy cập được qua HTTP** — không có `express.static()` nào serve `backend/uploads/` | Missing capability (documentation mismatch giữa "trả về `fileUrl`" và thực tế không serve được) | Phase 03 §13, Phase 05 §5.4/11 #9 |
| Comment nội bộ trong `openAPI.yaml` báo permission Upload "chưa tồn tại" — lỗi thời so với `permission.constant.ts` thật | Documentation mismatch (mức thấp, chỉ ảnh hưởng đọc hiểu) | Phase 05 §9.1/11 #10 |

*(Điểm tích cực đối trọng: 116/116 endpoint và 87/87 path khớp hoàn hảo giữa `openAPI.yaml` và route thực tế — Phase 05 §9 — không có API debt loại "documentation mismatch" ở mức path/method.)*

---

## 4. DATABASE DEBT

| Vấn đề | Loại | Evidence |
|---|---|---|
| `WorkflowInstance` không có index nào ngoài `_id`, bị query bằng `$expr + $arrayElemAt` ở endpoint tần suất cao (`GET /workflows/pending`) → COLLSCAN mỗi lần gọi | Missing index / poor query pattern | Phase 04 §14 #1, Phase 10 PERF-01 |
| `RefreshToken` không có index trên `token`, không có TTL index dọn token hết hạn/revoked (khác `PasswordResetToken`) | Missing index / schema issue | Phase 04 §14 #2, Phase 10 PERF-02 |
| 7/21 model không có index ngoài `_id` (`RefreshToken`, `Role`, `Permission`, `Policy`, `WorkflowTemplate`, `WorkflowInstance`, `Upload`) | Missing index | Phase 04 §10, Phase 10 PERF-04 |
| `Document` thiếu index compound có `isActive`/`deletedAt` dù dashboard lọc theo 2 field này ở 5/7 aggregate | Missing index | Phase 04 §9.2, Phase 10 PERF-03 |
| Hard-delete Document theo tháng (`deleteDocumentsByMonthService`, `deleteMany` thật) không kiểm tra tham chiếu ngược từ `WorkflowInstance`, `Document.referenceTo[]`, `Notification.resourceId` | Data integrity risk | Phase 04 §12.1, §14 #3 |
| Hard-delete Asset không check `Document.relatedAsset` dù field đã tồn tại (comment trong code lỗi thời, mô tả 1 giai đoạn phát triển cũ) | Data integrity risk | Phase 04 §12.2, §14 #4 |
| Xoá Role không check `WorkflowTemplate`/`WorkflowInstance.steps[].role` (theo tên string) đang dùng Role đó | Data integrity risk | Phase 04 §12.3, §14 #5 |
| Thiếu `.lean()` không nhất quán ở list endpoint đọc-nhiều: `users.service.ts:getList`, `rbac.service.ts:getPermissionService/getRoleService` — khác domain Documents/Notifications đã dùng `.lean()` nhất quán | Poor query pattern (hydration overhead không cần thiết) | Phase 10 PERF-05 |
| Read-modify-write trên `WorkflowInstance.approveStep` (`findById` → sửa field → `save()`) không xử lý `VersionError` (Mongoose optimistic concurrency) tường minh khi 2 approver duyệt đồng thời | Concurrency risk | Phase 04 §12.5 |
| Môi trường production thực tế có phải MongoDB replica set hay không **chưa xác minh** — điều kiện tiên quyết bắt buộc cho toàn bộ 5 file dùng `withTransaction` | Unverified infrastructure assumption | Phase 02 §10, Phase 04 §14 #10, Phase 08 §9 #5 (carry-over xuyên suốt) |

---

## 5. FRONTEND DEBT

**N/A** — Repo không có frontend (xác nhận Phase 01/02/06, giữ nguyên qua các phase). Không có debt nào để ghi nhận ở mục này.

---

## 6. SECURITY DEBT (reference only — chi tiết đầy đủ tại `09_SECURITY_ANALYSIS.md`)

| Finding ID | Severity | Tóm tắt |
|---|---|---|
| SEC-05 | CRITICAL | Privilege escalation lên ADMIN qua `PUT /api/users/:id` |
| SEC-06 | HIGH | `POST /api/documents/proposal` thiếu authorization |
| SEC-07 | HIGH | ABAC/Policy hoàn toàn dead ở runtime |
| SEC-13 | HIGH | Rủi ro NoSQL operator injection (RBAC/Departments/UserAudit) |
| SEC-01 | MEDIUM | Refresh token không rotate + `changePassword` không revoke |
| SEC-08 | MEDIUM | Cache permission không invalidate khi đổi role (endpoint thật) |
| SEC-14 | MEDIUM | ReDoS/regex injection không escape (Departments, RBAC) |
| SEC-15 | MEDIUM | CSV Formula/Excel Injection |
| SEC-10 | MEDIUM | 11 route `validateQuery` bị comment out |
| SEC-16 | LOW–MEDIUM | Path traversal tiềm năng qua `file.originalname` |
| SEC-21 | LOW–MEDIUM | CORS mở `*` nếu thiếu `CLIENT_URL` |
| SEC-02/03/04/09/11/12/17/22/23/25/27 | LOW | Xem bảng đầy đủ tại `09_SECURITY_ANALYSIS.md` §9 |
| SEC-18/19/20/24/26 | INFO | Bao gồm 2 điểm tích cực (không secret hard-code, `password` có `select:false`) |

---

## 7. TESTING DEBT

| Vấn đề | Loại | Evidence |
|---|---|---|
| Cấu hình Jest (`ts-jest`, `jest.config.js`) đầy đủ nhưng **không có bất kỳ file test nào** (`__tests__`/`*.test.ts`) trong toàn bộ repo | Zero test coverage | Phase 01 §14, `00_PROJECT_MEMORY.md` |
| Không có script `test` trong `package.json` (chỉ có `dev`, `build`, `start`) | Missing tooling wiring | Phase 01 §14 |
| Toàn bộ 116 endpoint, bao gồm các business rule phức tạp (status machine Document/Workflow/Asset, RBAC formula, hard-delete guard) **không có test tự động nào xác nhận hành vi** — mọi thay đổi code trong tương lai không có lưới an toàn hồi quy | Zero regression safety net | Hệ quả tổng hợp từ Phase 01, 05, 08 |

---

## 8. DEPLOYMENT DEBT

| Vấn đề | Loại | Evidence |
|---|---|---|
| Không có Dockerfile, docker-compose, hay pipeline CI/CD (`.github/workflows`, `.gitlab-ci.yml`, ...) nào trong repo | Missing deployment automation | Phase 01 §13, `00_PROJECT_MEMORY.md` |
| README đề cập `npm run seed:medical-devices`, `npm run seed:rbac`, `backup-mongo.sh`/`.ps1` — **CONFIRMED không tồn tại** trong `package.json` scripts lẫn `backend/scripts/` | Documentation/reality mismatch (vận hành) | Phase 01 §13, `00_PROJECT_MEMORY.md` |
| `JWT_SECRET`/`JWT_REFRESH_SECRET` đọc bằng non-null assertion, không validate tồn tại lúc bootstrap (khác `PORT`/`MONGO_URI` fail-fast) — lỗi chỉ lộ ra ở request đầu tiên | Configuration risk, dễ bỏ sót khi triển khai | SEC-03 |
| `CLIENT_URL` không validate tồn tại lúc bootstrap — nếu thiếu, CORS fallback mở `*` kết hợp `credentials:true` | Configuration risk | SEC-21 |
| Không có `trust proxy` — nếu triển khai sau reverse proxy, `req.ip` sai → rate-limit theo IP không chính xác | Configuration gap, phụ thuộc hạ tầng triển khai (chưa xác minh) | SEC-22 |
| Yêu cầu MongoDB replica set (bắt buộc cho `withTransaction`, 5 file dùng) chưa được xác nhận có đáp ứng ở môi trường production thật | Unverified deployment prerequisite | Phase 02/04/08 (carry-over) |
| Không có caching layer (Redis/CDN) nào trong kiến trúc triển khai | Missing scalability infrastructure | Phase 02 §1, PERF-14 |

---

## 9. MAINTAINABILITY DEBT

| Vấn đề | Loại | Evidence |
|---|---|---|
| `ROLE_PERMISSIONS` (thiết kế phân quyền "trên giấy" cho 7 role) không có cơ chế đối chiếu tự động với dữ liệu Role/Permission thật trong MongoDB — không ai biết DB thật có lệch khỏi ý đồ thiết kế hay không | Configuration drift, khó audit | Phase 07 §6.1, SEC-09 |
| Permission cache in-memory không invalidate khi đổi role qua endpoint đang chạy (`update()`) — chỉ hàm dead code `assignRole()` có xử lý đúng | Logic đúng tồn tại nhưng ở nhánh code không chạy — dễ đưa lại bug nếu ai đó xoá nhầm `assignRole()` mà không biết nó "trông như đã xử lý vấn đề" | Phase 07 §5.4/9.3, SEC-08 |
| Comment code khẳng định sai về hành vi thực tế (JWT payload, hard-delete Asset, workflow permission) làm tăng rủi ro hiểu sai khi maintainer mới đọc code mà không đối chiếu runtime | Documentation drift ảnh hưởng onboarding | Xem mục 2 |
| 2 tài liệu có sẵn trong repo (`DANH-GIA-TONG-THE.md`, `luong-du-lieu-DMS.html`) và `mongodb-transaction-setup-guide.md` chưa được đọc/đối chiếu qua 10 phase — độ tin cậy và tính cập nhật của các tài liệu này với code thật **UNKNOWN** | Tài liệu nội bộ chưa được kiểm chứng | Phase 01 §1/§15, carry-over toàn bộ các phase |

---

## 10. Bảng tổng hợp Technical Debt (đầy đủ, có ID)

> Priority = tổng hợp Impact + Risk + Effort + Business importance. Security debt chỉ liệt kê mức CRITICAL/HIGH ở đây (chi tiết đầy đủ xem mục 6); MEDIUM/LOW/INFO security debt không lặp lại.

| ID | Area | Problem | Impact | Priority | Evidence | Recommendation | Effort |
|---|---|---|---|---|---|---|---|
| TD-01 | Security (ref SEC-05) | Privilege escalation lên ADMIN qua `PUT /api/users/:id` | Chiếm quyền toàn hệ thống | **CRITICAL** | `09_SECURITY_ANALYSIS.md` SEC-05 | Áp safeguard của `assignRole()` vào `update()` đang chạy; gọi `clearPermissionCache()` | THẤP (đã có code mẫu `assignRole()`) |
| TD-02 | Database | Hard-delete Document theo tháng không check tham chiếu ngược (WorkflowInstance/referenceTo/Notification) | Dữ liệu mồ côi, sai lệch âm thầm, khó phát hiện | **CRITICAL** | Phase 04 §12.1 | Thêm guard kiểm tra tham chiếu trước `deleteMany`, hoặc chuyển sang soft-delete | TRUNG BÌNH |
| TD-03 | Security (ref SEC-06) | `POST /api/documents/proposal` thiếu authorization | Bất kỳ user login nào tạo được Document | **HIGH** | `09_SECURITY_ANALYSIS.md` SEC-06 | Bỏ comment `authorizePermission("DOCUMENT_CREATE")` | RẤT THẤP (1 dòng) |
| TD-04 | API | `GET /api/documents` luôn trả trang 1/10, bỏ qua `page`/`limit` | Tính năng phân trang hỏng hoàn toàn cho endpoint chính | **HIGH** | Phase 05 §4.4/11 #1 | Khôi phục `validateQuery(QueryDocumentDTO)` | THẤP |
| TD-05 | Security (ref SEC-07) | ABAC/Policy toàn bộ tầng dead code ở runtime | Mất 1 tầng phòng thủ được quảng cáo, IDOR/resource-level authz không tồn tại thực tế | **HIGH** | `09_SECURITY_ANALYSIS.md` SEC-07 | Hoàn thiện kích hoạt HOẶC gỡ bỏ có chủ đích, rà soát thủ công department-scoping | CAO (quyết định kiến trúc) |
| TD-06 | Security (ref SEC-13) | NoSQL operator injection risk (RBAC/Departments/UserAudit filter) | Khả năng bypass filter/gây lỗi bất thường qua query object | **HIGH** | `09_SECURITY_ANALYSIS.md` SEC-13 | Whitelist field + ép kiểu string trước khi gán filter; khôi phục `validateQuery` | TRUNG BÌNH |
| TD-07 | Database | `WorkflowInstance` không index, COLLSCAN qua `$expr` ở endpoint tần suất cao | Hộp thư chờ duyệt chậm dần theo số lượng workflow | HIGH | Phase 04 §14 #1, Phase 10 PERF-01 | Thêm index `{status:1}`, cân nhắc denormalize `currentStepRole` | THẤP–TRUNG BÌNH |
| TD-08 | Backend/File Processing | Excel import Document: N+1 transaction (tối đa 5000 transaction/file) | Import file lớn chậm, tốn tài nguyên MongoDB | HIGH | Phase 10 PERF-07 | Batch transaction theo nhóm dòng thay vì per-row | TRUNG BÌNH–CAO |
| TD-09 | Testing | Zero test coverage toàn bộ 116 endpoint dù đã cấu hình Jest đầy đủ | Không có lưới an toàn hồi quy cho mọi thay đổi tương lai | HIGH (business risk dài hạn) | Phase 01 §14 | Viết test cho các luồng CRITICAL trước (auth, RBAC, workflow, hard-delete) | CAO |
| TD-10 | API | 11 route `validateQuery` bị comment out | Mất coerce/validate kiểu dữ liệu, mở đường cho injection/ReDoS | MEDIUM–HIGH | Phase 05 §5.2/11 #4, SEC-10 | Khôi phục toàn bộ 11 middleware | THẤP (đã có DTO viết sẵn) |
| TD-11 | Database | `RefreshToken` thiếu index `token`, không TTL cleanup | Collection scan mỗi lần refresh/logout, phình collection vô hạn | MEDIUM | Phase 04 §14 #2, Phase 10 PERF-02 | Thêm unique index `{token:1}` + TTL index trên `expiresAt` | THẤP |
| TD-12 | Deployment | Không có Dockerfile/docker-compose/CI-CD | Triển khai thủ công, không tái lập được môi trường, không kiểm tra tự động trước merge | MEDIUM | Phase 01 §13 | Viết Dockerfile + pipeline CI cơ bản (lint, build, test khi có test) | TRUNG BÌNH |
| TD-13 | Database | Hard-delete Asset không check `Document.relatedAsset` (comment lỗi thời) | Document mồ côi trỏ tới Asset đã xoá | MEDIUM | Phase 04 §12.2 | Thêm check `Document.countDocuments({relatedAsset:id})` trước hard-delete | THẤP |
| TD-14 | Database | Xoá Role không check `WorkflowTemplate/Instance.steps[].role` theo tên | Workflow có thể tham chiếu Role không còn tồn tại | MEDIUM | Phase 04 §12.3 | Thêm check `WorkflowTemplate.exists({"steps.role": role.name})` trước xoá | THẤP |
| TD-15 | Backend/File Processing | `buildMapFromReports` tải toàn bộ Document theo subType không lọc phạm vi mỗi lần export | Tốn RAM/CPU tăng dần theo tổng dữ liệu, không theo phạm vi export thực tế | MEDIUM | Phase 10 PERF-08 | Lọc theo phạm vi export (department/thời gian) trước khi build map | TRUNG BÌNH |
| TD-16 | Backend | Cron cảnh báo Asset/Medical Device: N+1 Role/User query mỗi asset, ghi tuần tự | Cron chạy chậm dần khi số lượng asset cảnh báo tăng | MEDIUM | Phase 10 PERF-09 | Query Role/User 1 lần, dùng `bulkWrite`/`updateMany` cho phần ghi | TRUNG BÌNH |
| TD-17 | Maintainability | `ROLE_PERMISSIONS` "trên giấy" không đồng bộ DB thật (script seed không tồn tại) | Không audit được RBAC thật có khớp thiết kế hay không | MEDIUM | Phase 07 §6.1, SEC-09 | Viết script seed đọc `ROLE_PERMISSIONS`, hoặc job đối chiếu định kỳ | TRUNG BÌNH |
| TD-18 | API | RBAC thiếu `validateParams(IdParamDTO)` ở PUT/DELETE; Departments thiếu toàn bộ validate | Lỗi `:id` sai rơi vào CastError thay vì 400 rõ ràng; Departments không có lớp validate shape nào | MEDIUM | Phase 05 §11 #5/#6, SEC-11 | Bổ sung `validateParams`/`validateBody` đầy đủ | THẤP |
| TD-19 | Code Quality | Response format không đồng nhất (domain `auth`, `upload` lệch khỏi `{success,message,data}`) | Client phải xử lý đặc biệt theo domain, tăng rủi ro bug tích hợp | MEDIUM | Phase 03 §4, Phase 05 §11 #7 | Chuẩn hoá response wrapper cho `auth`/`upload` | TRUNG BÌNH |
| TD-20 | Database | Thiếu `.lean()` ở list endpoint Users/RBAC | Hydration overhead không cần thiết cho endpoint chỉ đọc | LOW–MEDIUM | Phase 10 PERF-05 | Thêm `.lean()` theo pattern đã dùng ở Documents/Notifications | RẤT THẤP |
| TD-21 | Database | 7/21 model thiếu index ngoài `_id` | Rủi ro hiệu năng tăng dần, mức độ khác nhau theo model | LOW–MEDIUM | Phase 04 §10, Phase 10 PERF-04 | Ưu tiên `WorkflowInstance`/`RefreshToken` trước (đã có TD-07/TD-11) | THẤP |
| TD-22 | Database | `Document` thiếu index `isActive`/`deletedAt` cho dashboard | Aggregate dashboard lọc kém hiệu quả khi selectivity thấp | LOW–MEDIUM | Phase 04 §9.2, Phase 10 PERF-03 | Thêm compound index `{isActive:1, deletedAt:1, createdAt:-1}` | THẤP |
| TD-23 | API | File upload/certificate không truy cập được qua HTTP (thiếu `express.static`) | `fileUrl` trả về không dùng được trực tiếp | LOW–MEDIUM | Phase 05 §5.4/11 #9 | Thêm `express.static()` cho thư mục uploads (cân nhắc kiểm soát truy cập nếu cần) | THẤP |
| TD-24 | Code Quality | Dead code tích luỹ (7 vị trí: errorHandler cũ, loadDocument, mongo.logger, upload.validator, documents.validator×2, ROLE_PERMISSIONS, assignRole) | Tăng chi phí đọc hiểu/bảo trì, rủi ro nhầm lẫn cho maintainer mới | LOW | Phase 03 §11.4, Phase 07 §6.1/9.2 | Xoá dead code đã xác nhận không còn dùng, hoặc gắn kết nếu vẫn cần | THẤP (cần xác nhận kỹ trước khi xoá) |
| TD-25 | Code Quality | 2 rate-limiter trùng cấu hình, 2 cấu hình Multer riêng biệt | Trùng lặp logic, dễ sửa 1 nơi quên nơi kia | LOW | Phase 03 §11.3 | Hợp nhất về 1 nguồn cấu hình mỗi loại | THẤP |
| TD-26 | Testing | Không có script `test` trong `package.json` | Không tích hợp được vào bất kỳ CI nào kể cả khi có test | LOW | Phase 01 §14 | Thêm script `test` gọi `jest` | RẤT THẤP |
| TD-27 | Deployment | JWT secrets/CLIENT_URL không validate tồn tại lúc bootstrap | Lỗi cấu hình chỉ lộ khi có request đầu, không fail-fast | LOW | SEC-03, SEC-21 | Validate cùng cơ chế với `PORT`/`MONGO_URI` ở `server.ts` | RẤT THẤP |
| TD-28 | Deployment | README tham chiếu script không tồn tại (`seed:rbac`, `seed:medical-devices`, `backup-mongo.sh/.ps1`) | Gây nhầm lẫn vận hành, onboarding sai kỳ vọng | LOW | Phase 01 §13 | Cập nhật README khớp thực tế, hoặc bổ sung script còn thiếu | THẤP |
| TD-29 | Architecture | Cache permission in-memory không chia sẻ giữa instance | Chặn khả năng scale-out ngang đúng nghĩa (đa instance sẽ có permission lệch nhau tạm thời) | LOW (hiện tại, vì hệ thống chạy 1 process) | Phase 02 §6, Phase 07 §5.4 | Cân nhắc Redis-based cache nếu có kế hoạch scale-out | CAO (đổi hạ tầng) |
| TD-30 | Maintainability | Comment code lỗi thời/mâu thuẫn hành vi thực tế (nhiều vị trí) | Rủi ro maintainer mới hiểu sai logic nếu không đối chiếu runtime | LOW | Phase 03 §3.2(d), Phase 05 §9.1, Phase 07 §3.1 | Rà soát và cập nhật comment khớp code thật khi chạm vào từng file | THẤP |

---

## 11. Ghi chú về Priority Methodology

Priority được xác định theo tổ hợp:
- **Impact**: mức độ ảnh hưởng nếu vấn đề xảy ra (data integrity, security breach, tính năng hỏng, hiệu năng).
- **Risk**: khả năng/tần suất vấn đề thực sự xảy ra trong vận hành thực tế.
- **Effort**: chi phí ước lượng để khắc phục (không phải effort để phân tích).
- **Business importance**: mức độ trung tâm của module bị ảnh hưởng trong nghiệp vụ (Document/Workflow là core, Departments/Upload là phụ trợ).

CRITICAL/HIGH ưu tiên các vấn đề: (a) đã CONFIRMED severity cao trong Security Analysis, (b) gây hỏng tính năng cốt lõi đang chạy (pagination Documents), (c) gây sai lệch dữ liệu vĩnh viễn không thể tự phục hồi (hard-delete không check reference). MEDIUM là các vấn đề hiệu năng/injection-risk có evidence rõ nhưng cần điều kiện cụ thể (traffic, dữ liệu quy mô) để bộc lộ đầy đủ mức độ nghiêm trọng. LOW là các vấn đề về tính nhất quán/bảo trì không ảnh hưởng trực tiếp tới tính đúng đắn hay bảo mật ngay lập tức.

**Không xếp priority cho mục Frontend Debt** — N/A, không có frontend.

---

## 12. Unknowns liên quan tới đánh giá Priority (kế thừa, không phân tích thêm)

- Dữ liệu Role/Permission thật trong MongoDB (ảnh hưởng mức độ khai thác thực tế TD-01/SEC-05).
- Số lượng bản ghi thực tế trong `WorkflowInstance`/`RefreshToken`/`Document` (ảnh hưởng mức độ nghiêm trọng thực tế TD-07/TD-08/TD-11/TD-21/TD-22).
- Môi trường production có phải MongoDB replica set hay không (ảnh hưởng tính khả thi của mọi khuyến nghị liên quan `withTransaction`).
- Traffic thực tế theo endpoint (ảnh hưởng độ ưu tiên thực sự giữa các finding hiệu năng).

---

**PHASE 11 COMPLETED**
