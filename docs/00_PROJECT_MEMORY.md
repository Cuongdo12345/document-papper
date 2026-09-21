# 00 — PROJECT MEMORY

> File này được cập nhật liên tục qua các phase. Mục đích: giữ ngữ cảnh xuyên suốt để không phải khảo sát lại từ đầu ở các phase sau.

---

## Những gì đã biết (confirmed, có bằng chứng trong source)

- Repo: https://github.com/Cuongdo12345/document-papper.git — đã clone thành công về `/home/claude/document-papper`.
- Branch: `main`. Commit hiện tại (xác minh lại 2026-08-30): `5b58fb1` ("update") — tiến thêm 2 commit so với `f4ce8e9` (mốc Memory ghi nhận ở Phase 06→10): `f4ce8e9` → `150acdf` → `5b58fb1`. Chưa xác minh nội dung thay đổi cụ thể của 2 commit này (UNKNOWN, ngoài phạm vi kiểm tra khởi tạo context — cần đọc `git show` khi có task đụng tới vùng code liên quan).
- Project name: `document-manager` (theo `backend/package.json`).
- Đây là hệ thống **Document & Medical Device Manager** — quản lý tài liệu + tài sản/thiết bị y tế nội bộ, có workflow duyệt đa cấp, RBAC+ABAC (ABAC thực chất KHÔNG hoạt động — xem Phase 07/09), dashboard.
- Repo hiện tại **chỉ có backend**, không có frontend. Toàn bộ code nằm trong `backend/`.
- Stack backend: Node.js + TypeScript, Express 5, MongoDB + Mongoose, JWT auth, Zod validate, Swagger/OpenAPI docs.
- Kiến trúc: layered theo domain — routes → middlewares → controllers → services → models.
- Entry point chính: `backend/server.ts` → `backend/src/app.ts`.
- Có **31 Mongoose model** (SỬA DEV-071, 2026-09-21 — trước ghi "21", lỗi thời từ `DEV-057`→`070`, xem
  `docs/04_DATABASE_ANALYSIS.md` Mục 4). Route file/dòng/endpoint count KHÔNG được xác minh lại ở DEV-071
  (ngoài phạm vi task — chỉ sửa model count), có thể cũng lỗi thời, thư mục `services/` lớn nhất (468K).
- **[CẬP NHẬT 2026-08-30]** `backend/tsconfig.test.json` có khai báo `"types": ["node", "jest"]`, nhưng xác minh lại `backend/package.json` và `package-lock.json` hiện tại **KHÔNG có** `jest`/`ts-jest`/`@types/jest` trong dependencies/devDependencies (chỉ có 1 thư mục mồ côi `node_modules/@jest` không đi kèm core `jest`). Vẫn **chưa có bất kỳ file `.test.ts` nào** trong `backend/src`. Kết luận: hiện tại project **không có khả năng chạy Jest** dù có config trỏ tới jest types — cần cài `jest`/`ts-jest` trước khi viết test, không chỉ thêm file test.
  - OLD: "Có cấu hình Jest (ts-jest) nhưng chưa có bất kỳ file test nào trong repo."
  - REASON: Xác minh trực tiếp `package.json`/`package-lock.json` không thấy dependency Jest nào — cấu hình chỉ còn `tsconfig.test.json` mồ côi.
- **Không có** Dockerfile, docker-compose, hay pipeline CI/CD nào. **[CẬP NHẬT 2026-08-31, REVIEW-14]** Hệ quả cụ thể của việc này: không có gì bắt được lỗi `npm run build` thất bại trên môi trường mới clone (xem mục Code Review REVIEW-14 bên dưới — `scripts/copy-static-assets.js` bị gitignore, chưa từng commit).
- Có 2 tài liệu có sẵn trong repo chưa đọc chi tiết: `DANH-GIA-TONG-THE.md`, `luong-du-lieu-DMS.html`.
- Có tài liệu `backend/mongodb-transaction-setup-guide.md` chưa đọc chi tiết.
- **[CẬP NHẬT 2026-08-30]** README đề cập `npm run seed:medical-devices`, `npm run seed:rbac`, `backup-mongo.ps1`. Xác minh lại: `backend/scripts/` **THỰC SỰ CÓ** các file `seed-rbac.ts`, `seed-medical-devices.ts`, `seed-assets.ts`, `seed-assignment-history.ts`, `backup-mongo.ps1`, `repair-orphaned-user-roles.ts`, `ma-chay-script.ts` — nhưng `backend/package.json` scripts (`dev`/`build`/`start`) vẫn **không có alias** `seed:rbac`/`seed:medical-devices` trỏ tới các file này, nên lệnh `npm run seed:...` mà README nêu vẫn sẽ báo lỗi "missing script" nếu chạy trực tiếp (phải chạy qua `ts-node`/`ts-node-dev` thủ công).
  - OLD: "CONFIRMED không tồn tại trong package.json scripts lẫn backend/scripts/."
  - REASON: `backend/scripts/` nằm trong `.gitignore` (xem `backend/.gitignore`) — bản clone sạch dùng để phân tích Phase 01 không có các file này; working directory cục bộ hiện tại thì có. Nguồn sự thật ưu tiên source code hiện tại theo CLAUDE.md §3.
  - CONFIDENCE: HIGH (đọc trực tiếp thư mục `backend/scripts/`).
- **Không có** secret thật hard-code trong source (Phase 09); `.env.example` không có giá trị thật; `DUMMY_PASSWORD_HASH` là hash công khai vô hại dùng chống timing attack, không phải secret.
- **Không có** bất kỳ middleware sanitize NoSQL nào (`express-mongo-sanitize` hoặc tương đương) trong toàn bộ dependencies/source (Phase 09).
- **Không có** caching layer (Redis/CDN/HTTP cache header) nào trong toàn hệ thống (Phase 10, xác nhận lại Phase 02).
- **Technical debt tổng hợp (Phase 11)**: 30 mục TD-01→TD-30 theo 9 nhóm; nghiêm trọng nhất là tầng ABAC dead + `WorkflowInstance.steps[].role` free string + 7 vị trí dead code tích luỹ.
- **Risk register (Phase 12)**: 51+ issue ISS-01→ISS-51, TOP 10 issues/risks đã xác định; risk cao nhất là privilege escalation ADMIN (ISS-01) và hard-delete Document không check reference (ISS-02), cả hai đều Critical Risk.
- **Final Report (Phase 13)** đã tổng hợp toàn bộ 12 phase — xem `docs/13_FINAL_PROJECT_REPORT.md`.

## Những gì chưa biết (UNKNOWN, tồn đọng xuyên suốt project, chưa có phase nào giải quyết)

- Dữ liệu Role/Permission THẬT trong MongoDB — role nào thực sự có `USER_UPDATE` (ảnh hưởng mức độ nghiêm trọng thực tế của lỗ hổng leo thang đặc quyền SEC-05/ISS-01).
- Nội dung chi tiết `DANH-GIA-TONG-THE.md` và `luong-du-lieu-DMS.html`.
- Lý do chưa có test case nào dù đã cấu hình Jest.
- Rà soát toàn diện department-scoping/ownership check ở tất cả endpoint `:id`.
- Có cơ chế "resubmit" Document sau khi Workflow bị rejected/cancelled hay không.
- Môi trường production thực tế có đúng MongoDB replica set hay không (ISS-10), có đứng sau reverse proxy hay không.
- Mức độ khai thác thực tế của rủi ro NoSQL operator injection (SEC-13/ISS-04) và path traversal upload (SEC-16) — cần test runtime, ngoài phạm vi phân tích tĩnh của toàn bộ project.
- Số lượng bản ghi thực tế trong các collection lớn (`Document`, `WorkflowInstance`, `Notification`, `ApiPerformance`) và traffic thực tế theo endpoint ở môi trường vận hành thật — ảnh hưởng trực tiếp mức độ nghiêm trọng thực tế của mọi finding hiệu năng (PERF-01→PERF-16).
- Thời gian xử lý thực tế của import Excel Document với file lớn (vài nghìn dòng) — cần benchmark.
- Toàn bộ lịch sử git có từng chứa `.env` thật hay không.

## Những file quan trọng

(không đổi so với Phase 10 — Phase 11/12/13 chỉ tổng hợp lại, không đọc source mới)

- `backend/src/shared/helpers/buildMapReports.ts` — tải toàn bộ Document theo subType không lọc phạm vi, dùng bởi Excel export Document (PERF-08).
- `backend/src/services/excel/excel.service.ts` — `exportDocumentsExcelPRO` (streaming tốt, PERF-11), `importDocumentsExcel` (N+1 transaction, PERF-07).
- `backend/src/services/assets/assetDevice/assetExcel.service.ts` — export streaming tốt, import pre-fetch lookup tốt nhưng ghi tuần tự (PERF-10).
- `backend/src/services/assets/assetDevice/assetAlerts.service.ts` — cron cảnh báo Asset, N+1 Role/User query mỗi asset (PERF-09).
- `backend/src/services/notifications/notification.service.ts` — `notifyUsersByRoleName` tự query Role/User mỗi lần gọi (nguồn gốc PERF-09); `createNotification` gửi email không `await` (fire-and-forget, thiết kế tốt).
- `backend/src/shared/performance/performanceLogBuffer.ts` — batch-flush performance log, thiết kế tốt (PERF-12).
- `backend/src/middlewares/performance.middleware.ts` — sampling 10% + luôn log slow/error.
- `backend/src/services/users/users.service.ts:getList`, `backend/src/services/rbac/rbac.service.ts` (getPermissionService/getRoleService) — thiếu `.lean()` ở list endpoint (PERF-05).
- (Các file quan trọng khác giữ nguyên như đã liệt kê ở Phase 01-09, không lặp lại.)

## Những module quan trọng

(không đổi — xem Phase 01/08)

## Tóm tắt discoveries theo phase

- **Phase 02 (Architecture)**: monolith layered theo domain; transaction cần replica set; permission cache in-memory TTL 5 phút; `WorkflowInstance.steps[].role` string tự do.
- **Phase 03 (Backend)**: `POST /documents/proposal` thiếu authorizePermission; nhiều `validateQuery` comment out; response format không đồng nhất (auth/upload); dead code (`loadDocument`, `mongo.logger`, `errorHandler` cũ).
- **Phase 04 (Database)**: 7/31 model không có index ngoài `_id` (SỬA DEV-071 — mẫu số 21→31, tử số không
  đổi; 10 model mới từ `DEV-057`→`070` đều có index); `WorkflowInstance` risk cao nhất (COLLSCAN qua
  `$expr`); 2 lỗ hổng hard-delete không check tham chiếu ngược.
- **Phase 05 (API)**: 116 endpoint/87 path khớp gần hoàn hảo `openAPI.yaml`; pagination bug 3 domain; file upload không serve qua HTTP.
- **Phase 06 (Frontend)**: N/A — không có frontend.
- **Phase 07 (Auth/RBAC)**: ABAC hoàn toàn dead runtime; privilege escalation qua `PUT /users/:id`; JWT payload dư thừa; bất đối xứng revoke token khi đổi mật khẩu.
- **Phase 08 (Business Logic)**: giải quyết UNKNOWN cũ; status machine đầy đủ Document/Workflow/Asset; CalibrationRecord rules.
- **Phase 09 (Security)**: 27 finding SEC-01→SEC-27; NoSQL operator injection risk (RBAC/Departments/UserAudit), ReDoS, CSV formula injection, path traversal upload, CORS misconfiguration.
- **Phase 10 (Performance)**: 16 finding PERF-01→PERF-16 (9 CONFIRMED FROM CODE, 6 POTENTIAL RISK, 3 NEEDS BENCHMARK). Quan trọng nhất: PERF-07 (N+1 transaction Excel import Document, tối đa 5000/file), PERF-08 (tải toàn bộ Document không lọc phạm vi trong `buildMapFromReports`), PERF-09 (N+1 query cron alerts).
- **Phase 11 (Technical Debt)**: 30 mục TD-01→TD-30 theo 9 nhóm (Architecture, Code Quality, API, Database, Security*, Performance*, Testing, Deployment, Maintainability). Nghiêm trọng nhất: ABAC dead architecture, `WorkflowInstance.steps[].role` free string, 2 lớp nguồn permission không đồng bộ, 7 vị trí dead code, response format không đồng nhất.
- **Phase 12 (Issues & Risks)**: Risk register đầy đủ ISS-01→ISS-51+. Risk Matrix xác định 5 Critical Risk (ISS-01, ISS-02, ISS-03, ISS-07, ISS-09) và 4 High Risk (ISS-04, ISS-05, ISS-06, ISS-08); ISS-10 (replica set) không phân loại được do Probability UNKNOWN. TOP 10 Issues và TOP 10 Risks đã xác định, kèm Recommendations Immediate/Short-term/Long-term cho từng issue CRITICAL/HIGH.
- **Phase 13 (Final Report)**: tổng hợp toàn bộ 12 phase thành `docs/13_FINAL_PROJECT_REPORT.md` — Executive Summary, Technology Stack, Architecture, Module Map, Backend/Database/API/Frontend/Auth&RBAC/Business Logic/Security/Performance/Technical Debt/Issues&Risks, Strengths, Recommended Roadmap (4 giai đoạn), Priority Matrix, Developer Onboarding, Architecture Quick Reference. Phát hiện và ghi nhận 1 conflict giữa `00_PROJECT_MEMORY.md` (bản cũ) và tài liệu Phase 11/12 thực tế (Memory chưa được cập nhật dù 2 phase đã hoàn thành) — đã resolve bằng cách ưu tiên nội dung tài liệu phân tích thực tế làm source-of-truth và đồng bộ lại Memory ở bản cập nhật này.

## Các phase đã hoàn thành

- [x] Phase 01 — Clone & Project Discovery
- [x] Phase 02 — Architecture Analysis
- [x] Phase 03 — Backend Analysis
- [x] Phase 04 — Database Analysis
- [x] Phase 05 — API Analysis
- [x] Phase 06 — Frontend Analysis (N/A)
- [x] Phase 07 — Authentication & RBAC Analysis
- [x] Phase 08 — Business Logic Analysis
- [x] Phase 09 — Security Analysis
- [x] Phase 10 — Performance Analysis
- [x] Phase 11 — Technical Debt Analysis
- [x] Phase 12 — Issues & Risks Analysis
- [x] Phase 13 — Final Project Report

## PROJECT ANALYSIS COMPLETED

Toàn bộ 13 phase theo `SKILL.md` đã hoàn thành. Không còn phase nào đang chờ thực hiện theo quy trình chuẩn.

Nếu cần tiếp tục làm việc trên project này ở phiên sau, các hướng khả dĩ (chỉ thực hiện khi có yêu cầu tường minh, KHÔNG tự động chạy):
- Verify các UNKNOWN còn tồn đọng cần dữ liệu/hạ tầng thật (không thể làm bằng static analysis thuần tuý — xem mục "Những gì chưa biết" ở trên).
- Bắt đầu triển khai các khuyến nghị ở Roadmap Phase A (Immediate) trong `13_FINAL_PROJECT_REPORT.md` §16 — đây là hành động SỬA CODE, cần yêu cầu tường minh riêng, ngoài phạm vi workflow phân tích thuần tuý này.
- Đọc chi tiết 3 tài liệu còn UNKNOWN xuyên suốt: `DANH-GIA-TONG-THE.md`, `luong-du-lieu-DMS.html`, `mongodb-transaction-setup-guide.md`.

## Phase tiếp theo

- Không có — PROJECT ANALYSIS COMPLETED (Phase 13 là phase cuối cùng theo `SKILL.md`).

## Feature Roadmap — 2026-09-12

- Người dùng cung cấp 1 tài liệu đề xuất tính năng phát triển tương lai (nghiệp vụ mới), đã lưu vào
  `docs/development/FEATURE_DEVELOPMENT_ROADMAP.md` — nội dung: 4 nhóm đề xuất (Nhóm A — hoàn thiện
  tính năng đã xây một phần: QR code Asset, upload chứng nhận kiểm định, Excel import Asset UI,
  document versioning; Nhóm B — tính năng nghiệp vụ mới: SLA/nhắc việc Workflow, lịch bảo trì chủ
  động, quản lý vật tư tiêu hao, vendor/contract management, xuất PDF chính thức, full-text search,
  scheduled reports; Nhóm C — bảo mật/vận hành: 2FA cho ADMIN, session management UI, audit log
  export theo mẫu thanh tra; Nhóm D — dài hạn: mobile/PWA, đồng bộ HRM/HIS, chatbot nội bộ).
- Đã thêm reference vào `CLAUDE.md` §41 (`@docs/development/FEATURE_DEVELOPMENT_ROADMAP.md`) để phiên
  sau tự đọc khi cần lên kế hoạch nâng cấp, KHÔNG tự động implement mục nào cho tới khi người dùng
  chỉ định cụ thể.
- Đọc file gốc để biết đầy đủ nội dung trước khi bắt đầu bất kỳ task nào trùng tên với mục đã liệt kê
  ở trên (tránh phân tích lại từ đầu).
- **[CẬP NHẬT 2026-09-14] Mục A1 (QR Code cho Asset) đã DONE** — user chỉ định implement, phát hiện
  backend đã có sẵn 100% từ trước (chỉ thiếu UI, đúng như mô tả gốc trong roadmap), chỉ cần làm
  Frontend. Chi tiết: `docs/development/tasks/DEV-050.md`.
- **[CẬP NHẬT 2026-09-15] Mục A2 (Upload chứng nhận kiểm định) đã DONE** — user chỉ định implement.
  KHÁC A1: phát hiện backend có 1 BUG THẬT (`certificateFileUrl` bị gán đường dẫn chết khi upload file
  — đúng như roadmap cảnh báo), đã vá (field mới `certificateFileId` + endpoint tải file mới
  `GET .../calibration-records/:recordId/certificate/download`) cùng lúc với xây UI upload/tải (tái
  dùng `FileUpload` component dùng chung). Chi tiết: `docs/development/tasks/DEV-051.md`. Bổ sung cùng
  ngày (user yêu cầu thêm): endpoint `PUT .../certificate` để sửa lại chứng nhận đã lưu khi upload
  nhầm file.
- **[CẬP NHẬT 2026-09-15] Mục A3 (Excel Import cho Asset) đã DONE — thực ra ĐÃ CÓ SẴN ĐẦY ĐỦ từ
  trước** (backend `POST /api/assets/import` + frontend `AssetExcelMenu.tsx`/`AssetsListPage`, không
  cần code tính năng mới). Chỉ bổ sung 10 unit test cho `assetExcel.service.ts` (gap phát hiện khi xác
  nhận, user chọn làm trước khi sang A4). Chi tiết: `docs/development/tasks/DEV-052.md`.
- **[CẬP NHẬT 2026-09-15] Mục A4 (Lịch sử phiên bản tài liệu) đã DONE — HOÀN TẤT NHÓM A.** Khác A1/A3
  (chỉ thiếu UI/đã có sẵn), đây là tính năng MỚI THẬT (model `DocumentVersion` + endpoint mới), vì mục
  này gắn cờ 💡 (đề xuất, chưa xác nhận) trong roadmap — đã hỏi rõ 2 quyết định nghiệp vụ với user
  trước khi code (thời điểm lưu version: mỗi lần sửa; quyền: chỉ xem lại, không khôi phục). Snapshot
  title/meta CŨ mỗi lần `PUT /documents/:id` thực sự đổi nội dung, xem qua `GET /documents/:id/versions`
  (cùng ABAC với xem chi tiết) + UI trong `DocumentDetailPage`. Chi tiết: `docs/development/tasks/DEV-053.md`.
  Nhóm A (A1-A4) nay đã xong toàn bộ.
- **[CẬP NHẬT 2026-09-15] Mục B1 (SLA & nhắc việc Workflow) đã DONE** — user chỉ định implement (bắt
  đầu Nhóm B). `slaDays` mới trên `WorkflowTemplate.steps[]` (optional, mặc định 3 ngày), cron hằng
  ngày nhắc role đang chờ duyệt khi vượt SLA + escalate ADMIN khi vượt ≥2 lần SLA, dashboard "Đề xuất
  trễ hạn" mới (`GET /dashboard/workflow/overdue-approvals`). Chi tiết: `docs/development/tasks/DEV-054.md`.
  **LƯU Ý ĐÃ XONG**: đã chạy `scripts/seed-rbac.ts` (user xác nhận) để permission `WORKFLOW_SLA_ALERTS_TRIGGER`
  có trong DB — vẫn cần gán tay qua UI "Phân quyền" cho IT/PHONG_VAT_TU_TTB (script không tự gán role,
  quyết định DEV-041).
- **[CẬP NHẬT 2026-09-15] Mục B2 (Lịch bảo trì chủ động) đã DONE** — user chọn phương án LỚN (xây lịch
  bảo trì chủ động thật sự, không phải chỉ xem lại hạn kiểm định có sẵn). Domain mới hoàn toàn
  `AssetMaintenancePlan`, ĐỘC LẬP với luồng PROPOSE_REPAIR phản ứng — CRUD theo asset +
  `GET /assets/maintenance-plans/calendar` (lịch theo tháng, xuyên suốt mọi asset). Permission mới
  `ASSET_MAINTENANCE_PLAN_VIEW/CREATE/UPDATE` (IT + PHONG_VAT_TU_TTB). UI: section trong
  `AssetDetailPage` + trang mới `/app/assets/maintenance-calendar` (lưới CSS Grid tự viết). Chi tiết:
  `docs/development/tasks/DEV-055.md`. **LƯU Ý ĐÃ XONG**: đã chạy `scripts/seed-rbac.ts` (user xác nhận)
  để 3 permission `ASSET_MAINTENANCE_PLAN_*` có trong DB — vẫn cần gán tay qua UI "Phân quyền" cho
  IT/PHONG_VAT_TU_TTB (script không tự gán role, quyết định DEV-041).
- **[CẬP NHẬT 2026-09-15] Mục B3 (Quản lý vật tư tiêu hao/Inventory) đã DONE** — user chọn phương án ĐẦY
  ĐỦ (tồn kho theo TỪNG khoa/phòng ban, ĐẦY ĐỦ lịch sử giao dịch nhập/xuất, CÓ cảnh báo tồn kho thấp tự
  động) qua AskUserQuestion trước khi code. Module hoàn toàn mới, độc lập với `Asset` — 2 model mới
  `ConsumableItem` (tồn kho running-balance theo item+department) + `ConsumableTransaction` (giao dịch
  nhập/xuất BẤT BIẾN). API mount tại `/api/inventory` (`items`, `items/:id`, `items/:id/transactions`,
  `alerts/run`). Permission mới `CONSUMABLE_VIEW/CREATE/UPDATE/TRANSACTION_CREATE/ALERTS_TRIGGER` (IT +
  PHONG_VAT_TU_TTB đủ cả 5; USER chỉ VIEW). Cảnh báo tồn kho thấp: cron 08:15 hằng ngày, gửi 1 lần tới
  role PHONG_VAT_TU_TTB (kênh chính, gate việc đánh dấu đã gửi) + broadcast thêm tới đúng phòng ban sở
  hữu vật tư (best-effort). UI: mục sidebar riêng "Vật tư tiêu hao" (`/app/inventory` danh sách +
  `/app/inventory/:id` chi tiết/nhập-xuất/lịch sử). Chi tiết: `docs/development/tasks/DEV-056.md`.
  **LƯU Ý ĐÃ XONG**: đã chạy `scripts/seed-rbac.ts` (user xác nhận) — 5 permission mới có trong DB
  (84 đã tồn tại, 0 role bị đồng bộ lại). Vẫn cần gán tay qua UI "Phân quyền" cho IT/PHONG_VAT_TU_TTB.
- **[CẬP NHẬT 2026-09-16] Mục B4 (Quản lý nhà cung cấp & hợp đồng bảo trì) đã DONE** — user chọn phương
  án ĐẦY ĐỦ ở cả 3 câu hỏi scoping (2 domain riêng Vendor+Contract, 1 hợp đồng ↔ NHIỀU tài sản, CÓ cảnh
  báo tự động). Module hoàn toàn mới — `Vendor` (NCC) + `Contract` (`assets: ObjectId[]` nhúng trực
  tiếp, KHÔNG collection trung gian riêng). API mount tại `/api/vendors` + `/api/contracts`. Permission
  mới `VENDOR_VIEW/CREATE/UPDATE` + `CONTRACT_VIEW/CREATE/UPDATE/ALERTS_TRIGGER` (IT + PHONG_VAT_TU_TTB
  đủ cả 7; USER chỉ VIEW cả 2). Cảnh báo hợp đồng sắp hết hạn: cron 08:20 hằng ngày, CHỈ gửi tới role
  PHONG_VAT_TU_TTB (không broadcast theo phòng ban asset, khác B3 — quản lý hợp đồng là việc tập trung).
  UI: 2 mục sidebar riêng "Nhà cung cấp"/"Hợp đồng bảo trì" + section CHỈ ĐỌC mới trong `AssetDetailPage`.
  Component mới `AssetMultiPicker` (chọn nhiều asset, KHÔNG sửa `AssetPicker` single-select có sẵn). Chi
  tiết: `docs/development/tasks/DEV-057.md`. **LƯU Ý ĐÃ XONG**: đã chạy `scripts/seed-rbac.ts` (user xác
  nhận) — 7 permission mới có trong DB (89 đã tồn tại, 0 role bị đồng bộ lại). Vẫn cần gán tay qua UI
  "Phân quyền" cho IT/PHONG_VAT_TU_TTB.
  **Nhóm B5-B7 và Nhóm C/D VẪN CHƯA được duyệt/implement.**

## Security fix — 2026-08-30: ISS-01/SEC-05/SEC-08 RESOLVED

- **TASK-001** (`docs/tasks/TASK-001.md`) đã implement: `update()` trong `backend/src/services/users/users.service.ts` giờ chặn tuyệt đối gán `role.name === "ADMIN"` (trước đây bất kỳ user có `USER_UPDATE` có thể tự thăng cấp lên ADMIN — Critical Risk #1 toàn dự án), và gọi `clearPermissionCache()` khi role thực sự đổi (đóng luôn SEC-08).
- Phạm vi thay đổi: đúng 1 file, 1 hàm (`update()`), không đụng `assignRole()` (vẫn dead code), không đụng `create()`.
- **Chưa xử lý (ghi nhận UNKNOWN mới)**: `create()` (`users.service.ts:25-66`) vẫn không chặn tạo user mới với `role: ADMIN` trực tiếp — chưa rõ đây là chủ đích thiết kế (đường hợp pháp duy nhất tạo ADMIN) hay cùng 1 lớp lỗ hổng chưa được xử lý. Cần quyết định ở task riêng nếu muốn xử lý.
- **Test**: KHÔNG có automated test (dự án chưa cài Jest — xem mục Jest ở trên). Đã chạy `npx tsc --noEmit` (PASS). Người dùng chủ động chọn không thiết lập testing cho task này — **hành vi runtime sau fix CHƯA được xác minh bằng request HTTP thật**, chỉ xác nhận đúng bằng code review + type-check.
- Đã cập nhật đồng bộ: `docs/12_ISSUES_AND_RISKS.md` (ISS-01), `docs/09_SECURITY_ANALYSIS.md` (SEC-05, SEC-08), `docs/07_AUTH_RBAC_ANALYSIS.md` (§9.2, §9.3).

## Security hardening — 2026-08-30: TASK-002 (mở rộng TASK-001)

- **Việc 1**: `create()` (`users.service.ts`) giờ cũng chặn tạo user mới với `role: ADMIN` (đối xứng với `update()` đã fix ở TASK-001). **Hệ quả quan trọng**: sau 2 fix này, KHÔNG còn endpoint API nào trong hệ thống có thể tạo/gán role ADMIN — muốn tạo ADMIN mới phải thao tác trực tiếp trong MongoDB.
- **Việc 2**: thêm permission mới `USER_ASSIGN_ROLE` + endpoint mới `PATCH /api/users/:id/role` (wire lại `assignRole()` — trước đây dead code). **Chưa gán permission này cho role nào trong DB thật** — cần làm thủ công qua RBAC API nếu muốn dùng. **Chưa cập nhật OpenAPI** cho endpoint mới.
- **Việc 3**: đã chạy audit read-only trên MongoDB dev (`127.0.0.1:27017/hospital_documents`) — chỉ có đúng 1 user ADMIN (tài khoản gốc, không có audit trail tạo qua API — tạo trực tiếp trong DB), không tìm thấy bằng chứng ISS-01 từng bị khai thác trên môi trường này. Không kiểm tra được production (nếu có, UNKNOWN).
- **Việc 4 (runtime test qua HTTP) KHÔNG được thực hiện** — theo lựa chọn tường minh của người dùng (chỉ chọn Việc 1-3).
- **Cập nhật thêm (cùng ngày, theo yêu cầu tiếp theo)**: đã bổ sung OpenAPI (`openAPI.yaml`) cho endpoint mới `PATCH /api/users/{id}/role`; đã tạo Permission `USER_ASSIGN_ROLE` và gán cho Role `IT` trong DB dev (ghi dữ liệu thật, không phải chỉ đọc).
- **Phát hiện quan trọng khi kiểm tra DB dev để gán permission**: chỉ `ADMIN` đang thực sự giữ `USER_UPDATE` trong DB này (không phải `IT` như thiết kế "trên giấy" ở `rolePermission.map.ts`) — rủi ro thực tế ISS-01 trên DB dev này trước đây là THẤP. Chỉ đúng cho DB dev đã kiểm tra, KHÔNG suy ra được cho production (UNKNOWN).
- Chi tiết đầy đủ: `docs/tasks/TASK-002.md`.

## Code Review — 2026-08-30: REVIEW-00 (Foundation/Cross-cutting)

- Đã review bootstrap (`server.ts`/`app.ts`), middleware pipeline toàn cục, error handling, validation, config, shared cache/utils. Kết quả đầy đủ: `docs/module-reviews/00_FOUNDATION_CODE_REVIEW.md`, chỉ mục: `docs/review-index/CODE_REVIEW_INDEX.md`.
- **7 finding mới/xác nhận lại** (0 CRITICAL): RV00-01 (HIGH) — file upload qua `/api/upload` KHÔNG được serve qua HTTP (không có `express.static` cho `/uploads`, giải quyết UNKNOWN từ Phase 03); RV00-02 (MEDIUM) — `errorHandler` lộ `err.message` thô cho lỗi 500 không xác định; RV00-03 (LOW-MEDIUM) — `/api-docs` public hoàn toàn không auth; RV00-04 (LOW, đã biết) — 2 rate-limiter trùng cấu hình cho `/api/auths`; RV00-05 (LOW-MEDIUM) — `JWT_SECRET` không fail-fast khi thiếu; RV00-06/07 (INFO) — dead code + giới hạn cache single-instance đã biết, xác nhận lại chưa đổi.
- Tất cả finding còn ở trạng thái **OPEN** (chỉ review, chưa fix — đúng yêu cầu KHÔNG sửa code của task này).
- Xác nhận: source hiện tại (`5b58fb1`) khớp hoàn toàn với Phase 02/03 ở khu vực foundation — không phát hiện thay đổi nào giữa `f4ce8e9` và `5b58fb1` trong các file đã đọc.

## Code Review — 2026-08-30: REVIEW-01 (Authentication)

- Đã review toàn bộ `auths.service.ts`, `auth.controller.ts`, `auth.routes.ts`, `auths.dto.ts`, `refreshToken.model.ts`, `passwordResetToken.model.ts`, `auth.helper.ts`. Kết quả đầy đủ: `docs/module-reviews/01_AUTH_CODE_REVIEW.md`.
- **2 finding quan trọng (HIGH/MEDIUM-HIGH), 0 CRITICAL**:
  - **RV01-01 (HIGH)**: `refresh()` không bọc `jwt.verify()` trong try/catch — khi refresh token hết hạn/hỏng, lỗi JWT thô rơi vào nhánh "unknown error" của `errorHandler` (RV00-02) → client nhận **500** kèm message lỗi thư viện (vd "jwt expired") thay vì 400/401 như thiết kế các nhánh lỗi khác trong cùng hàm.
  - **RV01-02 (MEDIUM-HIGH)**: Refresh token được lưu **PLAINTEXT** trong `RefreshToken` collection (không hash) — khác hẳn `PasswordResetToken` (đã hash SHA-256). Nếu DB bị lộ, attacker có ngay token dùng được trong tới 7 ngày mà không cần crack gì.
  - RV01-03 (MEDIUM): không có refresh token rotation → không phát hiện được reuse khi token bị đánh cắp (mở rộng chi tiết cho Phase 07 §9.5).
  - RV01-04/05/06: thấp hơn, chi tiết đầy đủ trong file review.
- Tất cả finding ở trạng thái **OPEN** (chỉ review, chưa fix — đúng yêu cầu KHÔNG sửa code của task này).
- Kết luận riêng theo yêu cầu: password reset token lifecycle THIẾT KẾ TỐT, không có vấn đề mới; refresh token reuse KHÔNG có bảo vệ nào; refresh token invalidation hoạt động ở hầu hết luồng trừ `changePassword()` (đã biết từ Phase 07).

## Code Review — 2026-08-30: REVIEW-02 (RBAC/Authorization)

- Đã review `rbac.service.ts`, `rbac.controller.ts`, `rbac.routes.ts`, `rbac.dto.ts`, `Role/Permission/Policy` model, `authorizePermission.middleware.ts`, `permission.cache.ts`, `permission.service.ts`. Kết quả đầy đủ: `docs/module-reviews/02_RBAC_CODE_REVIEW.md`.
- **1 finding CRITICAL mới, quan trọng nhất từ đầu dự án tới nay ngoài ISS-01 (đã fix)**:
  - **RV02-01 (CRITICAL, impact — Probability LOW trên DB dev đã kiểm tra, UNKNOWN cho production)**: `updateRoleService()` (`rbac.service.ts`) **không có bất kỳ guard nào** chặn việc đổi `name` của Role thành/khỏi chuỗi `"ADMIN"`. Vì cơ chế "Super Admin bypass" ở `authorizePermission.middleware.ts` chỉ so khớp CHUỖI `role.name === "ADMIN"` (không so `_id`, không có cờ hệ thống riêng), một ADMIN (hoặc bất kỳ ai có permission `ROLE_UPDATE`) có thể: (1) đổi tên Role ADMIN hiện tại sang tên khác, rồi (2) đổi tên 1 Role khác (bất kỳ) thành `"ADMIN"` — tạo ra 1 role "ADMIN" mới hoàn toàn hợp lệ về mặt DB (ràng buộc `unique` trên `name` không ngăn được thao tác tuần tự này). Đây là vector **persistence/backdoor**: nếu tài khoản ADMIN gốc sau này bị thu hồi quyền, role "ADMIN" bí mật vẫn tồn tại và tiếp tục cấp bypass đầy đủ. Xác minh read-only trên DB dev: hiện chỉ Role `ADMIN` giữ permission `ROLE_UPDATE` (giống pattern `USER_UPDATE` ở ISS-01 trước khi fix).
  - RV02-02 (MEDIUM): `denyPermissions` hoàn toàn vô tác dụng với user role ADMIN (bypass chạy trước khi đọc deny list) — inconsistency, không phải bug mới nhưng chưa từng được ghi cụ thể.
  - RV02-03 (HIGH, cross-ref ISS-04/SEC-13): NoSQL operator injection qua `resource`/`action` filter ở `getPermissionService`/`getPolicieService` **vẫn còn nguyên**, chưa được vá dù các phần khác của RBAC đã hardening đáng kể.
  - **RV02-04 (positive finding)**: lỗ hổng mass-assignment "B13" (Role update cho phép gửi kèm `permissions`, bypass `ROLE_ASSIGN_PERMISSIONS`) mà comment trong source từng ghi nhận **ĐÃ ĐƯỢC VÁ hoàn toàn** bằng 2 lớp độc lập (DTO chỉ cho `name` + whitelist service). Không tìm thấy vết tích của lỗ hổng này trong Phase 07/09/12 — có thể đã được vá trước hoặc trong giai đoạn giữa 2 commit `f4ce8e9`→`5b58fb1` mà project chưa từng diff chi tiết.
- **CHƯA FIX bất kỳ finding nào** ở review này (đúng yêu cầu chỉ review, không sửa code).
- Xác nhận riêng theo yêu cầu "Authenticated ≠ Authorized": không route RBAC nào thiếu `authorizePermission`, nhưng RV02-01/RV02-02 là 2 biến thể "authenticated nhưng bị coi nhầm là authorized-cho-mọi-thứ" ở tầng logic sâu hơn tầng route.

## Code Review — 2026-08-30: REVIEW-03 (Users & UserAudit)

- Đã review `users.service.ts`, `userAudits.service.ts`, `user.controller.ts`, `userAudit.controller.ts`, `user.routes.ts`, `userAudit.routes.ts`, `users.dto.ts`, `userAudit.dto.ts`. Kết quả đầy đủ: `docs/module-reviews/03_USERS_CODE_REVIEW.md`.
- **3 finding HIGH mới, 0 CRITICAL**:
  - **RV03-01 (HIGH, impact CRITICAL nếu bị khai thác)**: `resetPassword()` (Users, admin reset mật khẩu cho user khác) **THIẾU HẲN** safeguard chặn ADMIN mà chính docstring của hàm mô tả rõ ("Nếu role là ADMIN => không cho reset password"). Nếu `USER_RESET_PASSWORD` từng được cấp cho role khác ADMIN (kịch bản rất phổ biến — vd IT/helpdesk), người đó có thể đặt lại mật khẩu ADMIN rồi đăng nhập — account takeover hoàn chỉnh. Xác minh DB dev: hiện chỉ ADMIN giữ quyền này (an toàn tạm thời, giống pattern ISS-01/RV02-01).
  - **RV03-02/RV03-03 (HIGH)**: Mở rộng phạm vi ISS-04 (NoSQL operator injection) sang 2 vị trí CHƯA từng được liệt kê — `users.service.ts:getList()` (main Users list) và toàn bộ `userAudit.routes.ts` (cả 3 route `validateQuery` đều bị comment out dù DTO đã viết sẵn hoàn chỉnh, chỉ cần bỏ comment). UserAudit còn thêm rủi ro resource-exhaustion do `limit` không bị chặn tối đa ở endpoint JSON list.
  - RV03-04 (MEDIUM)/RV03-05 (LOW): gap validate Department khi update, field `isActive` ở UpdateUserDTO bị bỏ qua âm thầm — chi tiết trong file review.
- **Positive finding quan trọng**: Users module KHÔNG có hard-delete ở bất kỳ đâu (chỉ soft-delete qua `disable()`) — loại bỏ hoàn toàn rủi ro kiểu ISS-02 cho riêng domain này.
- Tất cả finding ở trạng thái **OPEN** (chỉ review, chưa fix — đúng yêu cầu KHÔNG sửa code của task này).

## Code Review — 2026-08-30: REVIEW-04 (Departments)

- Đã review `departments.service.ts`, `department.controller.ts`, `department.routes.ts`, `departments.dto.ts`, `department.model.ts` + dependency (`Asset`, `AssetAssignmentHistory`, `User`, `Document` model field `department`). Kết quả đầy đủ: `docs/module-reviews/04_DEPARTMENTS_CODE_REVIEW.md`.
- **1 finding HIGH mới, 0 CRITICAL** — trả lời trực tiếp câu hỏi "xóa Department có để lại orphan reference không": **CÓ**.
  - **RV04-01 (HIGH)**: `deleteDepartmentService()` chỉ check `User`(isActive)/`Document` trước khi hard-delete, **KHÔNG check `Asset`** (field `department` là `required: true` trên model) và **KHÔNG check `AssetAssignmentHistory`** (`fromDepartment`/`toDepartment`) — xóa Department chắc chắn để lại orphan ObjectId reference trên 2 model này, gây sai lệch dashboard/KPI theo khoa và populate trả `null` âm thầm.
  - RV04-02 (MEDIUM): check User trước khi xóa chỉ xét `isActive:true` — user đã bị vô hiệu hóa nhưng còn `department=id` không được tính, nếu sau đó được `restore()` sẽ mang theo department orphan.
  - RV04-03 (MEDIUM): DTO Department (`CreateDepartmentDTO`/`UpdateDepartmentDTO`/`QueryDepartmentDTO`) viết đầy đủ nhưng **chưa từng được wire** vào route (không phải bị comment out như Users/UserAudit ở REVIEW-03 — ở đây là chưa từng gắn từ đầu); DTO còn có field `isActive`/`description` không tồn tại trên model.
  - RV04-04 (MEDIUM): filter `keyword`/`code`/`name` dùng `$regex` trực tiếp từ input không escape — ReDoS tiềm ẩn (impact thấp vì bảng Department nhỏ).
  - RV04-05/RV04-06 (LOW): update trùng `code` không pre-check → lộ raw Mongo E11000 error (liên hệ RV00-02); tái dùng `UserAudit` cho Department làm giảm khả năng truy vết — chi tiết trong file review.
- Tất cả finding ở trạng thái **OPEN** (chỉ review, chưa fix — đúng yêu cầu KHÔNG sửa code của task này).

## Code Review — 2026-08-30: REVIEW-05 (Documents / Core Business)

- Đã review `document.route.ts`, `workflow.routes.ts`, `document.controller.ts`, `workflow.controller.ts`, `documents.dto.ts`, `workflow.dto.ts`, `document.service.ts`, `workflow.service.ts`, `documents.validator.ts`, `documents.mapper.ts`, `documents.query.ts`, `documents.constants.ts`, `document.model.ts`, `workflowInstance.model.ts`, `workflowTemplate.model.ts`, `documentRules.ts`, `generateDocumentCode.ts`/`getNext.ts`/`withTransaction.ts`. Kết quả đầy đủ: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md`.
- **Xác nhận quan trọng**: `document.service.ts` đã được refactor đáng kể từ baseline Phase 03/04/08 (1113→591 dòng) với nhiều hardening chủ động (whitelist filter, escape regex, ownership theo department ở Update, transaction đầy đủ, audit trail kể cả Restore) — domain này hiện tốt hơn hẳn RBAC/Users/Departments đã review trước đó về mặt input validation. `workflow.service.ts` vẫn 1120 dòng nhưng **dòng 616→1120 (~500 dòng) là code chết bị comment nguyên khối** (bản cũ trước khi thêm transaction) — RV05-09.
- **1 finding CRITICAL MỚI** (nghiêm trọng nhất chuỗi review tới nay xét về business logic thuần, không phải RBAC):
  - **RV05-01 (CRITICAL)**: `DOCUMENT_RULES.CONFIRM_STATUS.referenceSubType` (`documentRules.ts`) yêu cầu reference phải là `PROPOSE_INK`, nhưng `syncAssetOnDocumentApproved()` (`workflow.service.ts`) khi duyệt xong lại hard-code tìm document gốc với `subType: PROPOSE_REPAIR` — 2 điều kiện mâu thuẫn khiến `proposalDoc` luôn `null`, `resolveAssetMaintenanceService` **không bao giờ được gọi**. Hệ quả: Asset từng chuyển `UNDER_MAINTENANCE` qua `PROPOSE_REPAIR` **kẹt vĩnh viễn**, không có lỗi nào lộ ra (bọc try/catch, return sớm im lặng), dashboard/KPI theo trạng thái Asset sai lệch. Chưa xác nhận rule đúng là gì (UNKNOWN nghiệp vụ) nhưng evidence code mâu thuẫn là CONFIRMED chắc chắn.
- **2 finding HIGH kế thừa, xác nhận VẪN CÒN MỞ** dù đã có nửa vời fix: RV05-02 (=ISS-09, `POST /documents/proposal` vẫn thiếu `authorizePermission("DOCUMENT_CREATE")`, comment vẫn y nguyên); RV05-03 (=ISS-08, pagination `GET /documents` vẫn hỏng — điểm đáng chú ý: `QueryDocumentDTO` **đã được viết lại đúng hoàn chỉnh** với `z.coerce.number()` nhưng `validateQuery(QueryDocumentDTO)` vẫn bị comment ở route, fix đã "sẵn sàng" nhưng chưa "nối dây").
- **1 finding HIGH mới**: RV05-04 — không có department-scoping khi ĐỌC Document (List/Detail), dù CÓ khi SỬA (`updateDocumentService` check `callerDepartment`) — bất kỳ user có `DOCUMENT_VIEW` có thể xem toàn bộ document mọi phòng ban. UNKNOWN đây có phải chủ đích hay thiếu sót.
- RV05-05 (=ISS-02, hard-delete theo tháng không check reference, không đổi), RV05-06 (mới — soft-delete Document không chặn/đồng bộ WorkflowInstance đang pending của chính nó, approver vẫn approve được document đã bị ẩn), RV05-07 (race condition TOCTOU khi chặn trùng đề xuất sửa chữa cho 1 asset, POTENTIAL RISK), RV05-08 (=Phase04 §9.3, WorkflowInstance vẫn 0 index, không đổi), RV05-10 (=ISS-26, delete-by-month vẫn thiếu validateBody, không đổi).
- **Positive findings**: transaction đầy đủ nhất quán, whitelist filter (`buildDocumentFilter`) + escape regex là mẫu hình bảo mật tốt (đã khuyến nghị Phase 12 nhân rộng sang domain khác), audit trail đầy đủ kể cả Restore, `documentCode` chống trùng đúng chuẩn (Counter + atomic `$inc`), role-per-step ở `approveStep`/`rejectStep` đã được implement thật (dù comment đầu `workflow.routes.ts` nói "chưa xử lý" — documentation drift, không phải lỗ hổng thật).
- Tất cả finding ở trạng thái **OPEN** (chỉ review, chưa fix — đúng yêu cầu KHÔNG sửa code của task này).

## Code Review — 2026-08-30: REVIEW-06 (Asset Management)

- Đã review toàn bộ 5 tiểu module: Asset, Asset Assignment, Asset Category, Calibration, Medical Device — `asset.routes.ts`/`assetCategory.routes.ts`/`medicalDevice.routes.ts`, 5 controller, `assets.dto.ts`/`calibrationRecord.dto.ts`/`medicalDevice.dto.ts`, `assets.constants.ts`, 9 service file (`assetDevice/*`, `medicalDevice/*`), 5 model. Kết quả đầy đủ: `docs/module-reviews/06_ASSETS_CODE_REVIEW.md`.
- **Nhận xét tổng quan**: domain `assets` là 1 trong những phần code CẨN THẬN NHẤT hệ thống tính tới nay — transaction đầy đủ và đúng, cơ chế `hasValidRecipients` chống silent-failure ở cả 2 cron cảnh báo (asset + medical device, áp dụng nhất quán từ bài học rút ra), dọn file mồ côi có điều kiện (cờ `committed`) ở calibration record, Excel import Asset tránh N+1 đúng chuẩn (pre-fetch category/department bằng `$in` + Map).
- **0 CRITICAL, nhưng 1 finding HIGH mới đáng chú ý nhất**:
  - **RV06-01 (HIGH)**: `UpdateAssetDTO`/`ASSET_UPDATE_WHITELIST` có `isActive` (khác `status`/`assignedTo`/`department` đã bị loại trừ đúng chủ đích) — `PUT /assets/:id` (chỉ cần `ASSET_UPDATE`) có thể set `isActive:false` trực tiếp, bỏ qua HOÀN TOÀN guard trạng thái của `deleteAssetService` (chặn xoá khi IN_USE/UNDER_MAINTENANCE), không set `deletedAt`/`deletedBy` (dữ liệu không nhất quán), và dùng sai permission (UPDATE thay vì DELETE).
- **1 finding HIGH khác**: RV06-02 — `getAllAssetsService`/`getAllAssetCategoriesService` KHÔNG escape regex cho `keyword` search (khác domain `documents` đã có `escapeRegex`) — ReDoS risk, bề mặt tấn công rộng (chỉ cần `ASSET_VIEW`).
- RV06-03 (=Phase04 §12.2/ISS-18, hard-delete Asset vẫn không check `Document.relatedAsset`, không đổi), RV06-04 (MEDIUM, POTENTIAL RISK — domain Asset hoàn toàn không có department-scoping ở Read lẫn Assignment, khác domain Document; UNKNOWN có phải chủ đích "quản lý tập trung" hay không), RV06-05 (LOW-MEDIUM, mới — ~280 dòng code chết comment nguyên khối cuối `assetAssignment.service.ts`, cùng dạng RV05-09), RV06-06 (LOW, AssetCategory vẫn thiếu index `parentCategory`, không đổi), RV06-07 (LOW, cross-ref PERF-09 không đổi), RV06-08 (LOW-MEDIUM, POTENTIAL RISK — không bắt riêng Mongoose `VersionError` khi assign/transfer/return đồng thời, lỗi sẽ rơi vào nhánh 500 mặc định RV00-02 thay vì 409 rõ ràng).
- Tất cả finding ở trạng thái **OPEN** (chỉ review, chưa fix — đúng yêu cầu KHÔNG sửa code của task này).

## Code Review — 2026-08-30: REVIEW-07 (Dashboard / KPI)

- Đã review toàn bộ 12 endpoint dashboard — `dashboard.route.ts`, `dashboard.controller.ts`, `dashboard.service.ts`/`assetDashboard.service.ts`/`medicalDeviceDashboard.service.ts`, `Queryparsing.util.ts`, `memoryCache.ts`. Kết quả đầy đủ: `docs/module-reviews/07_DASHBOARD_CODE_REVIEW.md`.
- **Nhận xét tổng quan**: domain đã qua 1 đợt refactor hiệu năng/chất lượng rõ rệt và tự document trong code — gộp `$facet` 1 lần thay vì quét 2 lần, sửa đúng bug filter department không cast ObjectId trong aggregate (trước đây silent no-op), whitelist `sortBy`, validate `month`/`year`/`fromDate`/`toDate` chặt, cache TTL 30s. **0 CRITICAL/HIGH mới** trong domain này — code sạch nhất trong các domain đã review tới nay (kể cả đã tự xoá hẳn ~250 dòng code chết, khác `workflow.service.ts`/`assetAssignment.service.ts` vẫn còn để lại).
- **Finding đáng chú ý nhất KHÔNG phải bug độc lập mà là bằng chứng liên domain**: RV07-05 — `topDamagedInkService` (KPI "top mực hỏng") group theo `DocumentSubType.CONFIRM_STATUS`, khớp với `documentRules.ts` (CONFIRM_STATUS→referenceSubType PROPOSE_INK) — củng cố thêm cho RV05-01 (CRITICAL, REVIEW-05) rằng nhiều khả năng `workflow.service.ts:syncAssetOnDocumentApproved` (hard-code tìm PROPOSE_REPAIR cho CONFIRM_STATUS) mới là phần sai, không phải `documentRules.ts`. Cần đọc kèm RV05-01 khi xử lý.
- RV07-01 (MEDIUM, POTENTIAL RISK — không có department-scoping ở 11/12 endpoint dashboard trừ `admin-summary`, cùng dạng RV05-04/RV06-04, UNKNOWN có phải chủ đích), RV07-02 (LOW-MEDIUM — mở rộng PERF-03: `Asset` cũng thiếu index `isActive` cho dashboard, không chỉ `Document`), RV07-03 (LOW, mới — cache dashboard có sẵn cơ chế invalidate theo prefix nhưng KHÔNG được gọi ở bất kỳ đâu, chỉ dựa TTL 30s), RV07-04 (LOW — 2 pattern `runPaginatedAggregate` song song, tự ghi nhận trong code), RV07-06 (LOW-MEDIUM, POTENTIAL RISK, mới — `$unwind: "$meta.items"` không có `preserveNullAndEmptyArrays`, document thiếu/sai kiểu `meta.items` bị âm thầm loại khỏi KPI mà không cảnh báo).
- Tất cả finding ở trạng thái **OPEN** (chỉ review, chưa fix — đúng yêu cầu KHÔNG sửa code của task này).

## Code Review — 2026-08-30: REVIEW-08 (Import / Export Excel)

- Đã review `excel.route.ts`, `excel.controller.ts`, `excel.service.ts` (996 dòng, đọc toàn văn), `importhistory.model.ts`, `excel.constants.ts`, `importHeaderValidator.helper.ts`, `importStatus.helper.ts`, `buildMapReports.ts`, `upload.middleware.ts`, đối chiếu `error.middleware.ts`. Kết quả đầy đủ: `docs/module-reviews/08_IMPORT_EXPORT_CODE_REVIEW.md`.
- **0 CRITICAL/HIGH mới**. Xác nhận lại KHÔNG ĐỔI: PERF-07 (Import Document Excel — N+1 transaction per-row, tối đa 5000 transaction/file, nay xác nhận đây là ĐÁNH ĐỔI CÓ CHỦ ĐÍCH ghi rõ trong comment, không phải sơ suất), PERF-08 (`buildMapFromReports` vẫn tải toàn bộ CONFIRM_STATUS/CHECK_DAMAGE hệ thống không lọc phạm vi export), SEC-16 (upload chỉ check extension, không check magic-byte — rủi ro thấp cho riêng luồng Excel vì dùng memoryStorage, không ghi đĩa).
- **1 finding MEDIUM mới**: RV08-01 — lỗi từ `multer` (sai định dạng file `.pdf`/`.docx`, hoặc vượt 5MB) KHÔNG được `error.middleware.ts` nhận diện riêng (không có nhánh `MulterError`) → rơi vào nhánh 500 "lỗi không xác định" thay vì 400 — dễ tái hiện (chỉ cần gửi sai file), áp dụng cho MỌI route dùng `uploadExcel` (Document import, Department sync, Asset import — REVIEW-06).
- RV08-04 (LOW-MEDIUM, POTENTIAL RISK, mới — dò trùng lặp Proposal khi import (`Document.findOne` theo title/department/createdAt/deviceName) chạy TRƯỚC transaction, không atomic → 2 import đồng thời cùng dòng dữ liệu có thể tạo trùng lặp thay vì create+update), RV08-07 (LOW, mới — ~207 dòng code chết comment nguyên khối trong `excel.service.ts`, cùng dạng RV05-09/RV06-05).
- **Finding quan trọng nhất về mặt business logic**: RV08-06 — `excel.service.ts` (CẢ import lẫn export) dùng nhất quán cặp `PROPOSE_INK ↔ CONFIRM_STATUS` — đây là bằng chứng ĐỘC LẬP THỨ 2 (sau RV07-05) và ở nơi xử lý dữ liệu THẬT nhiều nhất, củng cố mạnh cho RV05-01 (CRITICAL, REVIEW-05): nghiêng rõ về hướng lỗi nằm ở `workflow.service.ts:syncAssetOnDocumentApproved` (giả định CONFIRM_STATUS↔PROPOSE_REPAIR), không phải `documentRules.ts`. **3 vị trí độc lập trong code** (documentRules.ts, dashboard KPI, import/export Excel) đều nhất quán CONFIRM_STATUS↔PROPOSE_INK — chỉ `workflow.service.ts` lệch.
- **RV08-08 (positive/clarification)**: làm rõ formula injection (SEC-15) chỉ áp dụng cho export CSV (domain UserAudit, ngoài phạm vi module này) — export `.xlsx` thật qua ExcelJS ở đây rủi ro THẤP HƠN NHIỀU do OOXML tách biệt cell công thức/cell text, không tự động diễn giải `=...` như CSV.
- Tất cả finding ở trạng thái **OPEN** (chỉ review, chưa fix — đúng yêu cầu KHÔNG sửa code của task này).

## Code Review — 2026-08-30: REVIEW-09 (File Upload)

- Đã review `upload.routes.ts`, `upload.controller.ts`, `upload.service.ts`/`upload.middleware.ts`/`upload.validator.ts` (services/upload), `upload.model.ts`, đối chiếu toàn bộ `app.ts`/`server.ts` cho static serving. Kết quả đầy đủ: `docs/module-reviews/09_UPLOAD_CODE_REVIEW.md`.
- **Câu trả lời trực tiếp câu hỏi đặc biệt "user có truy cập được file người/phòng ban khác không?"**: **CÓ, HOÀN TOÀN KHÔNG BỊ CHẶN** — đây là domain có nhiều finding HIGH nhất tính tới nay (4 HIGH), khác hẳn domain Assets/Dashboard/Excel vừa review (0-1 HIGH).
- **4 finding HIGH, chuỗi nhân-quả liên kết chặt**:
  - **RV09-01 (HIGH)**: `POST /api/upload` gọi `createUploader()` KHÔNG truyền `allowedTypes` → chấp nhận MỌI loại file (không chỉ "chỉ check MIME hời hợt" như SEC-17 đã ghi, mà HOÀN TOÀN KHÔNG check gì) — đối chứng: `certificateUploader` (calibration, REVIEW-06) gọi ĐÚNG với `allowedTypes` tường minh, chứng minh `createUploader` không có vấn đề, chỉ route `/api/upload` quên truyền.
  - **RV09-02 (HIGH)**: `saveFilesToDB` KHÔNG BAO GIỜ set `uploadedBy` dù model có field này và `req.user` sẵn có ở controller — file upload qua `/api/upload` hoàn toàn KHÔNG CÓ CHỦ SỞ HỮU trong DB. Đây là tiền đề gốc của 2 finding dưới.
  - **RV09-03 (HIGH)**: `GET /api/upload` (`getFiles`) trả về TOÀN BỘ file mọi user, không filter `uploadedBy`, không phân trang.
  - **RV09-04 (HIGH)**: `GET /api/upload/:id` và `DELETE /api/upload/:id` — IDOR đầy đủ, không check ownership — bất kỳ user có `DELETE_FILE` **xoá được file của bất kỳ ai khác**, không cần liên quan gì tới file đó.
- RV09-05 (MEDIUM, =SEC-16 không đổi — path traversal qua `file.originalname` không sanitize), RV09-06 (MEDIUM, mới — `getFiles` không phân trang), RV09-07 (LOW-MEDIUM, kế thừa Phase 09 — `upload.controller.ts` không dùng `catchAsync`/`ApiError`, khác 100% mọi controller khác đã review), RV09-08 (LOW, mới — `validateFiles` viết đầy đủ nhưng không bao giờ được gọi, dead code), RV09-10 (LOW, =SEC-18 không đổi — không dọn file mồ côi).
- **RV09-09 (INFO, quan trọng nhất về đánh giá rủi ro tổng thể)**: xác nhận lại RV00-01 — KHÔNG có `express.static`/`res.download`/`res.sendFile`/`createReadStream` nào trong toàn bộ codebase cho `/uploads` → giảm nhẹ đáng kể tác động RV09-01/03/04 (không tải được nội dung file THẬT qua chính app này) — NHƯNG nếu hạ tầng triển khai thực tế (Nginx/reverse proxy, ngoài phạm vi source code) serve tĩnh thư mục `backend/uploads/`, mọi authorization ở tầng Node bị bỏ qua hoàn toàn, biến các finding IDOR ở trên thành khai thác được trực tiếp qua URL không cần đăng nhập. **UNKNOWN quan trọng nhất**: cấu hình hạ tầng thực tế — cần xác nhận với đội triển khai.
- Tất cả finding ở trạng thái **OPEN** (chỉ review, chưa fix — đúng yêu cầu KHÔNG sửa code của task này).

## Code Review — 2026-08-30: REVIEW-10 (Notification)

- Đã review `notification.routes.ts`, `notification.controller.ts`, `notification.service.ts` (304 dòng, đọc toàn văn), `notification.model.ts`/`notification.types.ts`, `notification.dto.ts`, `shared/utils/mailer.ts`. Kết quả đầy đủ: `docs/module-reviews/10_NOTIFICATION_CODE_REVIEW.md`.
- **Nhận xét tổng quan**: đây là module có tư duy IDOR TỐT NHẤT toàn hệ thống tính tới nay — MỌI hàm đọc/sửa/xoá (`markAsRead`, `markAllAsRead`, `deleteNotification`, `getNotificationsForUser`) đều filter cứng theo `recipient === userId` ngay trong query, có comment giải thích rõ đây là "điểm chặn IDOR quan trọng nhất". 0 CRITICAL.
- **1 finding HIGH mới, nghiêm trọng nhất module**: RV10-01 — `GET /api/notifications` vẫn có `validateQuery(QueryNotificationDTO)` bị comment out (cùng mẫu hình lặp lại nhiều lần ở dự án), nhưng hậu quả NẶNG HƠN ISS-08 (Documents): với request phổ biến nhất (không kèm query param nào), `page`/`limit` là `undefined` → `skip = NaN` → khả năng cao request đơn giản nhất tới endpoint dùng nhiều nhất (badge chuông) LỖI HẲN (INFERRED, cần test runtime để xác nhận chính xác hành vi MongoDB driver). Đồng thời filter `isRead=true/false` qua query string CONFIRMED hỏng hoàn toàn (string "true" không khớp field Boolean thật trong Mongo — luôn trả rỗng).
- **1 finding MEDIUM mới đáng chú ý**: RV10-02 — nội dung email (`sendEmailForNotification`) nhúng thẳng `title`/`message` vào `html` không escape — dữ liệu này bắt nguồn từ field free-text người dùng (VD `Document.title`) → rủi ro HTML/email injection, và nếu FE render `notification.message` bằng `dangerouslySetInnerHTML` có thể là stored XSS thật (UNKNOWN, FE ngoài phạm vi repo).
- RV10-03 (MEDIUM, mới — không có retry/dead-letter cho email gửi thất bại, lỗi chỉ log rồi mất vĩnh viễn), RV10-04 (LOW-MEDIUM, mới — `mailer.ts` không fail-fast khi thiếu env SMTP, cross-ref RV00-05), RV10-05 (LOW — `CreateNotificationDTO.resourceType` thiếu `"Asset"`, vô hại vì DTO chưa từng được `.parse()` ở đâu), RV10-06 (LOW, POTENTIAL RISK — không có idempotency check khi tạo Notification, nhưng bản thân module không có lỗi độc lập, chỉ "không có lớp phòng thủ cuối" nếu tầng nghiệp vụ gốc có race condition).
- Tất cả finding ở trạng thái **OPEN** (chỉ review, chưa fix — đúng yêu cầu KHÔNG sửa code của task này).

## Code Review — 2026-08-30: REVIEW-11 (Performance Monitoring)

- Đã review `performance.middleware.ts`, `performanceLogBuffer.ts`, `apiPerformance.model.ts`, `performance.controller.ts`, `performance.routes.ts`, đối chiếu `app.ts` (vị trí mount) và `database.shutdown.ts` (graceful flush). Kết quả đầy đủ: `docs/module-reviews/11_PERFORMANCE_CODE_REVIEW.md`.
- **Xung đột với tài liệu lịch sử, đã xử lý theo CLAUDE.md §3**: `docs/05_API_ANALYSIS.md` (Phase 05) ghi `GET /performances/dashboard` "check role.name===ADMIN cứng trong controller" — đọc trực tiếp source HIỆN TẠI xác nhận **KHÔNG CÓ** check này. Tài liệu Phase 05 đã lỗi thời ở điểm này; nguồn sự thật là source code (RV11-01).
- **2 finding HIGH mới**:
  - **RV11-01 (HIGH)**: `GET /api/performances/dashboard` chỉ có `authenticate`, KHÔNG có bất kỳ check phân quyền nào (route/controller đều thiếu) — permission `PERFORMANCE_VIEW` được nhắc trong comment nhưng CHƯA TỪNG được định nghĩa trong `permission.constant.ts`. Bất kỳ user đăng nhập nào cũng xem được dashboard hiệu năng toàn hệ thống.
  - **RV11-02 (HIGH)**: `endpoint` ghi theo `req.route.path` KHÔNG bao gồm tiền tố mount router (`req.baseUrl`) — hành vi CHUẨN của Express, không phải bug — khiến hàng chục domain khác nhau dùng chung pattern phổ biến (`/:id`, `/`, `/:id/read`...) bị GỘP LẪN vào cùng 1 nhóm thống kê trong `$group: {_id:"$endpoint"}`. Đây là lỗi làm hỏng chính mục đích cốt lõi của dashboard (biết endpoint NÀO chậm) — nghiêm trọng nhất về "Metrics correctness" trong module này.
- RV11-03 (MEDIUM, mới — fallback `req.originalUrl` khi route không match tạo `endpoint` cardinality cao, làm loãng dữ liệu, xảy ra với MỌI request 404 vì middleware luôn log 100% lỗi), RV11-04 (LOW — index trùng lặp trên `createdAt`, 1 plain + 1 TTL, dư thừa), RV11-05 (LOW — `from`/`to` query không validate trước `new Date()`).
- **Positive nổi bật**: batch+sampling là thiết kế hiệu năng tốt nhất chuỗi review tới nay (giảm 50-100 lần round-trip DB), đã tự phát hiện và XOÁ HẲN field `dbTime`/`serviceTime`/`controllerTime` luôn=0 (dọn dẹp triệt để thay vì giữ "cho có vẻ đầy đủ"), TTL 30 ngày có cảnh báo triển khai kỹ, graceful shutdown flush được wire đúng, không log dữ liệu nhạy cảm.
- Tất cả finding ở trạng thái **OPEN** (chỉ review, chưa fix — đúng yêu cầu KHÔNG sửa code của task này).

## Code Review — 2026-08-31: REVIEW-14 (Config / Dependencies / Build)

- Đã review `package.json`, `package-lock.json`, `tsconfig.json`, `server.ts`, `config/database/*`, `config/swagger/swagger.ts`, `scripts/`, `.env.example`. Kết quả đầy đủ: `docs/module-reviews/14_CONFIG_CODE_REVIEW.md`.
- **1 finding HIGH — nghiêm trọng nhất, ẢNH HƯỞNG TRỰC TIẾP KHẢ NĂNG BUILD/DEPLOY, cập nhật quan trọng cho ghi chú cũ ở dòng "README đề cập `npm run seed:...`" (2026-08-30) phía trên:**
  - Ghi chú cũ (2026-08-30) từng nhận định việc `backend/scripts/` thiếu trong "bản clone sạch dùng để phân tích Phase 01" chỉ là khác biệt môi trường phân tích. REVIEW-14 xác nhận đây **KHÔNG PHẢI** hiện tượng cục bộ của môi trường phân tích — mà là 1 GAP THẬT trong chính repo git: `.gitignore` (dòng `scripts`) chặn TOÀN BỘ thư mục `backend/scripts/`, khiến 5/8 file trong đó (`copy-static-assets.js`, `seed-rbac.ts`, `repair-orphaned-user-roles.ts`, `seed-medical-devices.ts`, `backup-mongo.ps1`) **CHƯA TỪNG được `git add`**, chỉ tồn tại trên máy làm việc hiện tại.
  - Hậu quả cụ thể đã xác minh: `package.json` script `"build": "tsc && node scripts/copy-static-assets.js"` phụ thuộc trực tiếp file KHÔNG có trong git. `npm run build` trên bất kỳ máy nào clone lại repo (CI, máy đồng nghiệp mới, server deploy) sẽ **THẤT BẠI ngay** ("Cannot find module"), và theo đúng comment tự tài liệu hoá trong chính file đó, nếu thiếu nó thì production sẽ **crash ngay lúc khởi động** (ENOENT `openAPI.yaml` trong `dist/`, lỗi tính năng quên mật khẩu do thiếu `forgotPassword.ejs`). Không có CI/CD nào trong repo (đã xác nhận lại — vẫn đúng như Memory đã ghi trước đây) để bắt lỗi này trước khi xảy ra thật.
  - Cũng đồng nghĩa: `seed-rbac.ts` (script seed RBAC đang dùng thật, đã review nội dung ở REVIEW-13) và `backup-mongo.ps1` (script backup MongoDB) hiện **KHÔNG có bản backup nào ngoài máy hiện tại** — nếu máy này gặp sự cố, 2 script quan trọng này mất vĩnh viễn, không thể khôi phục từ git.
  - **KHUYẾN NGHỊ CẤP THIẾT (chưa thực hiện — cần người có thẩm quyền phê duyệt)**: sửa `.gitignore` để không ignore nguyên cả thư mục `scripts/` (chỉ ignore đúng thứ cần ignore), rồi `git add` 5 file đang thiếu.
- **4 finding MEDIUM khác đáng chú ý**: (1) 5 dependency xác nhận không dùng ở đâu trong `src/` (`docx`, `swagger-jsdoc`, `mongoose-to-swagger`, `file-saver` — browser-only, sai runtime hoàn toàn cho backend Node — và `@tailwindcss/vite` — Vite/Tailwind plugin, dấu hiệu contamination từ package.json frontend khác); (2) `fs`/`path` được cài như npm package dù là module built-in Node (`fs@0.0.1-security` là "security holding package" rỗng hoàn toàn) — không gây lỗi runtime (Node ưu tiên core module khi resolve) nhưng là dependency thừa/khó hiểu khi audit; (3) `CLIENT_URL` không fail-fast — khi thiếu, `cors({origin: process.env.CLIENT_URL, credentials:true})` rơi vào FAIL-OPEN (`Access-Control-Allow-Origin: *`) thay vì fail-closed, cùng nhóm nguyên nhân gốc với `RV00-05`/`RV10-04` (thiếu validate tập trung biến môi trường bảo mật lúc khởi động) nhưng hướng lỗi nguy hiểm hơn (nới lỏng bảo mật âm thầm thay vì báo lỗi rõ ràng); (4) `registerMongoLogger()` không bao giờ được gọi trong `server.ts` — toàn bộ tính năng debug/slow-query-log Mongo (được `.env.example` tài liệu hoá rất chi tiết qua `MONGO_DEBUG`/`MONGO_SLOW_MS`) chưa từng hoạt động thật.
- Tất cả finding ở trạng thái **OPEN** (chỉ review, chưa fix, không upgrade package nào — đúng yêu cầu của task này).

## Code Review — 2026-08-31: REVIEW-13/REVIEW-15 (API Contract — Implemented vs OpenAPI)

- Đã đối chiếu API THỰC SỰ IMPLEMENTED (15 file route, 117 endpoint) với `backend/src/docs/openAPI.yaml` (117 operation) trên cả 12 domain — không review lại business logic. Kết quả đầy đủ: `docs/module-reviews/15_API_CONTRACT_REVIEW.md` (nội dung này CHÍNH LÀ REVIEW-13 "API contract & OpenAPI consistency" trong kế hoạch gốc — chỉ khác tên file output so với quy ước, xem ghi chú ở `CODE_REVIEW_INDEX.md`).
- **Kết quả tổng quan tích cực bất ngờ**: tồn kho endpoint (path+method) và Authentication (public vs cần Bearer token) **KHỚP TUYỆT ĐỐI 100%** trên toàn bộ 117 endpoint/12 domain — không có endpoint nào lệch giữa doc và code ở 2 trục này.
- **1 finding NGHIÊM TRỌNG MỚI, chưa từng được phát hiện ở REVIEW-03 (Users) hay REVIEW-05 (Documents)** — chỉ lộ ra khi đối chiếu chéo route code với `permission.constant.ts` (bài tập đặc thù của REVIEW-13/15): **3 endpoint dùng chuỗi permission KHÔNG TỒN TẠI trong catalog thật**:
  - `GET /api/users` kiểm tra `"USER_READ"` (đúng ra là `USER_VIEW`).
  - `GET /api/users/{id}` kiểm tra `"USER_DETAIL"` (đúng ra là `USER_VIEW_DETAIL`).
  - `GET /api/documents/{id}` kiểm tra `"DOCUMENT_DETAIL"` (đúng ra là `DOCUMENT_VIEW_DETAIL`).
  - Cả 3 chuỗi này **không hề tồn tại** trong `PERMISSIONS` (`shared/constants/permission.constant.ts`) — `seed-rbac.ts` chỉ seed permission theo `Object.values(PERMISSIONS)`, nên **không Permission document nào mang 3 tên này từng được tạo trong DB, dưới bất kỳ hình thức nào**. Hệ quả: 3 endpoint này **chỉ ADMIN mới gọi được** (bypass qua `role.name === "ADMIN"`, không đọc permission string) — kể cả khi role khác được cấu hình "đúng" permission tương ứng. Xác nhận cụ thể: role `IT` **ĐÃ được gán đúng** `DOCUMENT_VIEW_DETAIL` trong `rolePermission.map.ts` nhưng **hoàn toàn vô dụng** vì route thật kiểm tra `"DOCUMENT_DETAIL"` — nghĩa là **trong thực tế, không ai ngoài ADMIN từng xem được chi tiết 1 Document qua đúng endpoint `GET /api/documents/{id}`**, dù thiết kế phân quyền trên giấy nói khác.
  - OpenAPI **COPY Y HỆT** 3 chuỗi sai này vào `summary` (dòng 232, 323, 1072) — nên xét thuần "doc khớp code" đây là MATCH, nhưng là **MATCH-mà-cả-2-cùng-sai**, không phải bằng chứng hệ thống hoạt động đúng.
- **3 vị trí DOCUMENTATION DRIFT đáng chú ý (hướng AN TOÀN — làm hệ thống trông kém bảo mật hơn thực tế, nhưng vẫn cần sửa)**: OpenAPI ở `POST /api/workflows/templates` (áp dụng ngầm cho cả nhóm `/api/workflows/*`), `POST /api/export/import-proposal`, `POST /api/export/departments/sync-from-excel` đều còn giữ 1 khối "GHI CHÚ TỪ REVIEW BẢO MẬT" nói "chỉ yêu cầu `authenticate`, CHƯA/KHÔNG có `authorizePermission`" — nhưng đọc trực tiếp code HIỆN TẠI xác nhận **CẢ 3 NHÓM ROUTE NÀY ĐÃ CÓ ĐẦY ĐỦ `authorizePermission`** từ lâu. Đáng chú ý: **bản thân `workflow.routes.ts` cũng có 1 comment đầu file cùng lỗi** ("CHỦ Ý KHÔNG THÊM authorizePermission ở file này") dù code ngay bên dưới đã gắn đủ cho toàn bộ 9 route — 3 lớp tài liệu (comment source + OpenAPI + có thể cả nhận thức người review kế tiếp) cùng lỗi thời theo 1 hướng, trong khi code thực tế đã được vá an toàn hơn.
- **1 nhóm DOCUMENTATION DRIFT hệ thống ở tầng Validation**: 13 endpoint có `validateQuery(...)` bị comment trong route (đã biết rải rác từ RV03/05/08/10), nhưng OpenAPI chỉ có ĐÚNG 1/13 (`GET /api/documents`) ghi chú rõ "KHÔNG thực sự được Zod validate" — 12 endpoint còn lại (Users list, Workflow pending, Notifications list, Assets list x2, AssetCategory list, RBAC list x3, UserAudit x3) vẫn khai `parameters` với kiểu dữ liệu cụ thể như đã được server validate, không cảnh báo gì.
- Tất cả finding ở trạng thái **OPEN** (chỉ review, không sửa OpenAPI, không sửa source — đúng yêu cầu của task này).

## Code Review — 2026-08-31: REVIEW-12/REVIEW-16 (Database Cross-Domain)

- Chạy dưới nhãn "REVIEW-16 — DATABASE CROSS-DOMAIN" nhưng đây CHÍNH LÀ REVIEW-12 "Database cross-domain" còn TODO trong kế hoạch gốc (xem ghi chú tại `CODE_REVIEW_INDEX.md`). Phạm vi: KHÔNG review lại field/index/model đơn lẻ (đã có Phase 04) — chỉ trace lỗi/rủi ro tại điểm giao giữa các module theo 3 chuỗi: `User→Department→Document→Workflow`, `User→Asset→Assignment→Department`, `MedicalDeviceProfile→CalibrationRecord`. Kết quả đầy đủ: `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md`.
- **1 finding HIGH mới (RV16-01)**: hard-delete Asset (`hardDeleteAssetService`) để lại `MedicalDeviceProfile`/`CalibrationRecord` mồ côi **vĩnh viễn** — không có bất kỳ service delete nào cho `MedicalDeviceProfile` tồn tại trong toàn bộ codebase (grep xác nhận `services/assets/medicalDevice/medicalDevice.service.ts` chỉ có create/get/update). Nghiêm trọng hơn RV06-03 đã biết (Document.relatedAsset — ít nhất còn sửa được qua Update): ở đây dữ liệu mồ côi không có đường dọn nào kể cả thủ công qua API.
- **2 finding MEDIUM/LOW mới**: (1) RV16-02 — `updateUserService` chỉ validate `Department` tồn tại khi request đồng thời đổi `role` thành USER; nếu chỉ đổi `department` (không kèm `role`), `user.department` có thể bị gán 1 ObjectId không tồn tại mà không lỗi nào được ném ra — gây `populate` trả `null` âm thầm và làm hỏng ràng buộc ownership-theo-department ở `updateDocumentService`. (2) RV16-03 — `disable()` User không đồng bộ `Asset.assignedTo`: tài sản vẫn "đang cấp phát" cho 1 user đã bị khoá vô thời hạn, dù `assignAssetService`/`transferAssetService` CÓ validate `isActive` tại thời điểm ghi.
- **Kết luận cấu trúc quan trọng**: domain Assignment (Asset↔User↔Department) có phòng thủ TỐT ở chiều "tạo mới" (`assertUserExists`/`assertDepartmentExists`) nhưng KHÔNG có phòng thủ nào ở chiều "huỷ nguồn" (xoá Department — RV04-01, disable User — RV16-03) — đây là root cause chung, gợi ý pattern sửa thống nhất thay vì vá riêng lẻ từng nơi.
- Review cũng liên kết lại (không cấp ID mới) các finding đơn-domain đã có để xác nhận chuỗi `Document→Workflow→Asset` có ít nhất 4 điểm hở độc lập (RV05-01 CRITICAL, RV05-04, RV05-05/06, Phase04 §13.2 transaction ngoài phạm vi) — không phải 1 lỗi đơn lẻ mà là đặc điểm thiết kế: mọi ràng buộc trong hệ thống đều là "write-time check", không có "delete/update-time back-reference check" tương ứng.
- **Kế hoạch gốc 15 review (REVIEW-00→14) nay đã HOÀN THÀNH 100%** — chỉ còn REVIEW-15 (Cron, ad-hoc) và REVIEW-16-ad-hoc (Shared, ad-hoc) là ngoài kế hoạch gốc, cả 2 đã DONE từ trước.
- Tất cả finding ở trạng thái **OPEN** (chỉ review, không sửa database, không sửa source — đúng yêu cầu của task này).

## Phase 14 — Analysis Audit — 2026-08-31

- Đã audit các kết luận quan trọng của Phase 01→13 so với source hiện tại, dựa trên 16 module review (REVIEW-00→16) + `docs/20_GLOBAL_SECURITY_REVIEW.md` + `docs/21_GLOBAL_ARCHITECTURE_REVIEW.md` (không đọc lại toàn bộ 13-phase gốc, đúng SKILL.md Rule 07). Kết quả đầy đủ: `docs/14_ANALYSIS_AUDIT.md`.
- **Kết luận tổng quan**: baseline Phase 01-13 có độ chính xác CAO — đại đa số finding CONFIRMED không đổi hoặc chỉ cần mở rộng phạm vi/sắc thái (PARTIALLY CONFIRMED). TOP 10 Issues (Phase 12) vẫn đúng 90% (chỉ ISS-01 đổi trạng thái RESOLVED, ISS-06 cần thêm sắc thái "đánh đổi có chủ đích" thay vì oversight).
- **1 finding INCORRECT được xác nhận và đính chính**:
  - OLD: `docs/05_API_ANALYSIS.md` (Phase 05) ghi nhận `GET /api/performances/dashboard` "check `role.name===ADMIN` cứng trong controller".
  - NEW: REVIEW-11 (`RV11-01`) đọc trực tiếp source hiện tại xác nhận **KHÔNG CÓ** check này — route chỉ có `authenticate`, permission `PERFORMANCE_VIEW` được nhắc trong comment nhưng chưa từng định nghĩa trong `permission.constant.ts`. Bất kỳ user đăng nhập nào cũng xem được dashboard hiệu năng toàn hệ thống — đã phân loại HIGH trong Global Security Review.
  - REASON: source code là nguồn sự thật (CLAUDE.md §3); không xác định được source đã bị sửa sau Phase 05 hay Phase 05 ghi sai từ đầu (UNKNOWN, ngoài phạm vi audit).
- **2 CRITICAL finding vẫn OPEN, KHÔNG có trong baseline Phase 01-13 gốc** (phát sinh từ module review sau này, cần ưu tiên nếu chuyển sang sửa code):
  - `RV02-01` — rename Role thành `"ADMIN"` tạo backdoor persistence, độc lập với ISS-01 (đã fix), KHÔNG bị ảnh hưởng bởi TASK-001/002.
  - `RV05-01` — mâu thuẫn `documentRules.ts` (CONFIRM_STATUS↔PROPOSE_INK) vs `workflow.service.ts:syncAssetOnDocumentApproved` (hard-code PROPOSE_REPAIR) khiến Asset không bao giờ đồng bộ sau khi duyệt xong CONFIRM_STATUS — củng cố bởi 3 bằng chứng độc lập khác (Dashboard KPI, Excel import/export).
- **Working-tree hiện tại đã đối chiếu khớp 100%** với mô tả TASK-002 đã ghi (6 file, +127 dòng, 0 dòng xoá — đúng nội dung `PATCH /api/users/:id/role` + `USER_ASSIGN_ROLE` + OpenAPI).
- Không có refactor/sửa code nào được thực hiện trong Phase 14 (chỉ audit + tạo tài liệu).

## Phase 15 — Architecture Review — 2026-08-31

- Đọc trực tiếp `02_ARCHITECTURE.md`, `03_BACKEND_ANALYSIS.md`, `05_API_ANALYSIS.md` (toàn văn) + `14_ANALYSIS_AUDIT.md` + `21_GLOBAL_ARCHITECTURE_REVIEW.md` (đã có sẵn từ trước). Kết quả đầy đủ: `docs/15_ARCHITECTURE_REVIEW.md`. Tài liệu này chính là `docs/15_ARCHITECTURE_REVIEW.md` mà CLAUDE.md §4/SKILL.md §3 liệt kê là "có thể tồn tại" — nay ĐÃ TỒN TẠI.
- **Không phát hiện circular dependency** — xác nhận LẦN THỨ 3 độc lập (Phase 02, REVIEW-00, Global Architecture Review), Phase 15 không tìm thêm evidence mâu thuẫn.
- **Finding kiến trúc MỚI quan trọng nhất (HIGH)**: `ARCH-27` — Service layer (Documents/Users/Notifications) ngầm giả định Middleware `validateQuery` đã coerce `page`/`limit` string→number, nhưng route thực tế bị comment `validateQuery` — không có type-system nào ràng buộc hợp đồng ngầm này. Đây là root-cause kiến trúc của bug pagination đã biết (ISS-08 và 2 domain khác) — KHÔNG chỉ là 3 bug riêng lẻ mà là 1 pattern thiếu ràng buộc giữa Route↔Service. `Asset` domain là ngoại lệ DUY NHẤT làm đúng (`parseInt` tường minh, không phụ thuộc Middleware).
- **5 finding MỚI khác (MEDIUM/LOW)**: `ARCH-28` (`.env.example` không đồng bộ biến thực dùng — `MONGO_MAX_POOL_SIZE`/`MIN_POOL_SIZE` thiếu tài liệu, `CLIENT_URL` khai trùng 2 lần); `ARCH-29` (`validateParams(IdParamDTO)` thiếu nhất quán ở RBAC/Departments); `ARCH-30` (không có structured logger — toàn console.*, tự nhận trong code); `ARCH-33` (domain Upload cohesion thấp, thêm 1 dead code mới: `upload.validator.ts:validateFiles`); `ARCH-34` (2 hàm validate cũ lỗi thời `validateStatusTransition`/`validateStatusPermission` còn tồn tại song song logic mới ở `documents.validator.ts`); `ARCH-35` (2 cấu hình Multer riêng biệt không dùng chung factory).
- **Điểm tích cực mới xác nhận**: `05_API_ANALYSIS.md` §9 — OpenAPI/routes khớp TUYỆT ĐỐI 87 path/116 operation, mức đồng bộ tài liệu-code cao bất thường so với phần còn lại hệ thống.
- Không có sửa code/refactor nào được thực hiện.

## Phase 16 — Refactoring Plan — 2026-08-31

- Chuyển finding đã verify (TD-01→30, ISS-01→10, + finding mới từ module review/Global Review/Phase 14-15) thành 24 refactor candidate (REF-001→024) có cấu trúc đầy đủ (evidence, affected files, API/DB/security impact, risk, effort, priority, rollback). Kết quả đầy đủ: `docs/16_REFACTORING_PLAN.md`. **KHÔNG có code nào được sửa** — đây thuần là kế hoạch.
- **3 refactor CRITICAL** (chưa implement, cần làm sớm nhất):
  - `REF-001` — đóng backdoor persistence "rename Role thành ADMIN" (`RV02-01`) — độc lập, effort SMALL, risk LOW, nên làm NGAY.
  - `REF-002` — sửa mâu thuẫn business rule `CONFIRM_STATUS`↔`PROPOSE_INK`/`PROPOSE_REPAIR` (`RV05-01`) — **BẮT BUỘC xác nhận nghiệp vụ thật + rà soát dữ liệu Asset đang kẹt TRƯỚC khi code**, không tự suy đoán.
  - `REF-003` — hard-delete Document theo tháng không check tham chiếu ngược (ISS-02/TD-02) — cần quyết định chặn cứng hay chuyển soft-delete.
- **7 refactor HIGH** đáng chú ý: `REF-004` (bật lại `authorizePermission("DOCUMENT_CREATE")`, effort thấp nhất nhóm CRITICAL/HIGH — nên làm sớm), `REF-005` (safeguard ADMIN cho `resetPassword()` Users), `REF-006` (khôi phục ranh giới Route↔Service cho pagination — root cause `ARCH-27`, gộp NoSQL injection fix), `REF-008` (domain Upload IDOR chain), `REF-009` (Asset hard-delete referential integrity), `REF-010` (quyết định số phận ABAC — effort LARGE, risk HIGH, cần spike/approval riêng TRƯỚC khi code, KHÔNG nên vội).
- **Thứ tự thực hiện đề xuất (8 đợt)**: Đợt 1 security quick-win (REF-005,001,007,004) → Đợt 2 referential integrity sweep (REF-009,014,003) → Đợt 3 API boundary hardening (REF-006+011+022) → Đợt 4 business logic (REF-002, sau khi xác nhận nghiệp vụ) → Đợt 5 Upload overhaul (REF-008+015) → Đợt 6 cải thiện có kiểm soát (REF-012,017) → Đợt 7 quyết định kiến trúc lớn (REF-010,016 — cần approval riêng) → Đợt 8 dọn dẹp (REF-018→024).
- **Refactor LỚN đã chia sub-task** (không mega-refactor): `REF-006` (4 sub-task theo nhóm route), `REF-008` (4 sub-task write-path→read-path→ownership→response format), `REF-010` (spike trước, implement theo domain sau — RỦI RO CAO NHẤT toàn kế hoạch, cần approval kiến trúc), `REF-016` (điều tra lý do gốc→benchmark→implement), `REF-018` (4 nhóm dead-code).
- Không có REF nào được implement — mọi mục vẫn ở trạng thái KẾ HOẠCH, chờ yêu cầu tường minh theo từng REF/TASK cụ thể.

## Phase 17 — Security Hardening Plan — 2026-08-31

- Đọc `09_SECURITY_ANALYSIS.md`, `07_AUTH_RBAC_ANALYSIS.md` (toàn văn) + `12_ISSUES_AND_RISKS.md` (TOP 10) + `14_ANALYSIS_AUDIT.md`, tổng hợp theo 9 trục (Authentication/Authorization/RBAC/Input/API/File/Data/Secret/Audit Logging) thành security hardening plan có format chuẩn (`SEC-XXX` kèm field `Attack Preconditions` — MỚI so với Phase 09). Kết quả đầy đủ: `docs/17_SECURITY_HARDENING_PLAN.md`. **Không sửa code, không exploit, không penetration test.**
- **Đã cấp ID chính thức `SEC-28→42`** cho 15 finding trước đây chỉ có `RVxx-yy`/chưa formalize (không tạo trùng lặp với `SEC-01→27` gốc Phase 09) — quan trọng nhất: `SEC-28` (=`RV02-01`, CRITICAL, rename Role→ADMIN backdoor), `SEC-29` (=`RV03-01`, HIGH, resetPassword thiếu safeguard ADMIN), `SEC-30→33` (=`RV09-01→04`, HIGH×4, chuỗi IDOR domain Upload), `SEC-34` (=`RV05-04`, HIGH, Document thiếu department-scoping khi đọc), `SEC-35` (=`RV06-01`, HIGH, Asset isActive bypass whitelist), `SEC-36` (=`RV06-02`, mở rộng `SEC-14` lên HIGH — ReDoS Asset), `SEC-37` (=`RV11-01`, HIGH, performance dashboard không có authorization — đính chính finding Phase 05 sai).
- **1 finding đính chính formalize lại**: `SEC-37` xác nhận `docs/05_API_ANALYSIS.md` (Phase 05) từng ghi SAI rằng `GET /api/performances/dashboard` có check `role===ADMIN` — source hiện tại KHÔNG CÓ authorization nào (đã ghi OLD/NEW/REASON ở Phase 14, nay chính thức có SEC-ID).
- **Kết luận quan trọng nhất**: có **3 đường account-takeover ADMIN độc lập** đã xác định trong toàn bộ quá trình review — chỉ 1 đã RESOLVED (SEC-05/ISS-01, TASK-001), **2 vẫn OPEN** (`SEC-28` rename Role, `SEC-29` resetPassword) — mỗi đường cần fix RIÊNG, không có 1 fix chung nào đóng cả 3.
- 16 security task đề xuất theo thứ tự ưu tiên (Mục 16 của tài liệu), đối chiếu chi tiết với `docs/16_REFACTORING_PLAN.md` (REF-001, REF-004, REF-005, REF-006+011, REF-008, REF-009, REF-010, REF-012, REF-017).
- Không có finding nào bị chứng minh INCORRECT ở phase này ngoài việc formalize lại `SEC-37` (đã biết từ Phase 14).

## Phase 18 — Testing Strategy — 2026-08-31

- Đọc `package.json`, kiểm tra `git log` cho `jest.config.js`/`*.test.ts`, đọc 4 file `dist/src/**/__tests__/*.test.js` (gitignored, sót lại từ build cũ) + `12_ISSUES_AND_RISKS.md`/`11_TECHNICAL_DEBT.md` (đoạn liên quan testing). Kết quả đầy đủ: `docs/18_TESTING_STRATEGY.md`. **Không viết test, không sửa source, không cài dependency.**
- **Đính chính OUTDATED cho `ISS-07`/`TD-09`/`TD-26`**: baseline cũ ghi "Jest cấu hình đầy đủ (`jest.config.js`+`ts-jest`) nhưng 0 file test". Thực tế hiện tại (2026-08-31):
  - OLD: Jest đã cấu hình, chỉ thiếu file test.
  - NEW: `jest.config.js` đã bị **xoá khỏi git ở commit `5b58fb1`**; `package.json` hiện **không có `jest`/`ts-jest`/`@types/jest`** trong `devDependencies`, không có script `test`. Toolchain test hiện **không cài đặt được** chứ không chỉ "thiếu file".
  - Bằng chứng mới: 4 file `dist/src/**/__tests__/*.test.js` (mtime 2026-08-22, nằm trong `dist/` gitignored) chứng minh **4 bộ test ĐÃ TỪNG được viết và chạy được** (auth register/login/refresh, `authorizePermission` middleware RBAC+ABAC, `workflow.service` approveStep/rejectStep, `permission.cache` TTL) — nhưng source `.test.ts` **chưa bao giờ được commit vào git** (`git log --diff-filter=A` rỗng) nên đã mất khỏi working tree, chỉ còn bản compiled làm "hoá thạch".
  - REASON: source code + git history là nguồn sự thật (CLAUDE.md §3); tình trạng đã thay đổi giữa lúc Phase 01/12 viết và hiện tại — không rõ ai/khi nào xoá `jest.config.js` (UNKNOWN, ngoài phạm vi audit).
- **Kết luận quan trọng nhất**: 4 file `dist/*.test.js` là tài sản có giá trị cao (blueprint kỹ thuật tốt, đặc biệt `authorizePermission.middleware.test.js` — chính bộ test này bằng chứng hoá cơ chế bypass `role.name==="ADMIN"` mà `SEC-28`/`RV02-01` khai thác) nhưng **có nguy cơ mất vĩnh viễn** nếu thư mục `dist/` bị xoá/build lại — nên khôi phục thành `.test.ts` và commit vào git là hành động ưu tiên số 1, trước khi viết bất kỳ test mới nào.
- **0 test tồn tại** cho domain Document (đang mang bug CONFIRMED `RV05-01` CRITICAL), domain Upload (chuỗi IDOR `SEC-30→33`), và toàn bộ 116 endpoint ở tầng API/integration.
- 19 test case đề xuất (`TEST-001→019`) phân theo P0-P3, gắn trực tiếp với `REF-XXX`/`SEC-XXX` đã có — không tạo review trùng lặp.
- Không có test/refactor nào được thực hiện ở phase này.

## Phase 19 — Improvement Roadmap — 2026-08-31

- Đọc toàn văn `docs/14_ANALYSIS_AUDIT.md`, `docs/15_ARCHITECTURE_REVIEW.md`, `docs/16_REFACTORING_PLAN.md`, `docs/17_SECURITY_HARDENING_PLAN.md`, `docs/18_TESTING_STRATEGY.md` — gộp toàn bộ finding đã verify (không tạo finding mới) thành roadmap thực thi. Kết quả đầy đủ: `docs/19_IMPROVEMENT_ROADMAP.md`. **Không refactor, không implement, không sửa code.**
- **6 task P0 (Critical)** — `TASK-003→008` (candidate, chưa tạo file thật): đóng backdoor rename Role→ADMIN (REF-001/SEC-28), safeguard `resetPassword()` ADMIN (REF-005/SEC-29), bật lại authorization `POST /documents/proposal` (REF-004/SEC-06), khôi phục toolchain Jest + cứu 4 test suite mồ côi (TASK-006, **điều kiện tiên quyết cho mọi task khác**), sửa business rule CONFIRM_STATUS (REF-002/RV05-01, cần xác nhận nghiệp vụ trước), hard-delete Document/tháng thiếu check tham chiếu (REF-003/ISS-02).
- **Cập nhật Current Development Status**: dự án ở trạng thái "biết rõ vấn đề (19 phase phân tích đầy đủ), CHƯA hành động" — 0 REF/TEST/TASK nào đã implement tính đến 2026-08-31. Toàn bộ 24 refactor candidate (REF-001→024) + 19 test case (TEST-001→019) + roadmap 7-stage đều ở trạng thái KẾ HOẠCH.
- **Top Priorities** (theo thứ tự thực thi đề xuất — `docs/19_IMPROVEMENT_ROADMAP.md` Mục 17): (0) TASK-006 khôi phục test toolchain trước tiên; (1) 3 task đóng account-takeover ADMIN (TASK-003/004/005); (2) TASK-008 hard-delete Document; (3) TASK-007 CONFIRM_STATUS (sau khi có xác nhận nghiệp vụ); (4) Stage 3 Upload overhaul + API boundary hardening.
- **Current Recommended Task**: `TASK-006` (khôi phục toolchain Jest + cứu `dist/*.test.js` thành `.test.ts`, commit vào git) — effort SMALL, risk LOW, không phụ thuộc gì, là nền tảng an toàn cho mọi task Security/Business tiếp theo.
- **Known Risks** (không đổi, đã có ở Phase 14/17, nhắc lại làm risk hàng đầu của roadmap): false sense of security do ISS-01 đã fix dễ khiến hiểu nhầm toàn bộ vấn đề privilege-escalation đã đóng — thực tế `SEC-28`/`SEC-29` vẫn OPEN; dữ liệu Role/Permission THẬT ở production chưa xác minh (chỉ audit DB dev) — ảnh hưởng trực tiếp mức độ nghiêm trọng thực tế cần đánh giá lại khi có access production.
- **Next Action**: chờ người dùng chỉ định TASK cụ thể để bắt đầu TASK-BASED DEVELOPMENT (CLAUDE.md §9) — khuyến nghị bắt đầu bằng `TASK-006`, không tự động triển khai bất kỳ REF/TASK nào.
- Đã cập nhật `docs/SESSION_HANDOFF.md` (Current Stage: POST-ANALYSIS ROADMAP, Completed: Phase 14→19, Next: TASK-BASED DEVELOPMENT).

## Bảo trì tài liệu — 2026-08-31: hợp nhất `docs/15_ARCHITECTURE_REVIEW.md` vào `docs/21_GLOBAL_ARCHITECTURE_REVIEW.md`

- Theo yêu cầu người dùng: `docs/21_GLOBAL_ARCHITECTURE_REVIEW.md` (viết TRƯỚC Phase 15) tự ghi chú "`docs/15_ARCHITECTURE_REVIEW.md` không tồn tại" — ghi chú này đã OUTDATED từ khi Phase 15 tạo ra file đó. Đã đọc toàn văn `docs/15_ARCHITECTURE_REVIEW.md` và cập nhật lại `docs/21_GLOBAL_ARCHITECTURE_REVIEW.md`: sửa ghi chú đầu file, gộp 9 finding mới (`ARCH-27→35`) vào đúng mục phân loại tương ứng (Layer Violations, Coupling, Cohesion, Duplicate Logic, Shared Leakage, Inconsistent Patterns), cập nhật Mục 0 (Executive Summary — thêm hệ thống vấn đề thứ 5: ranh giới Route↔Service không type-safe), Mục 11 (bảng tổng hợp mức độ, nay 35 finding), Mục 12 (bổ sung 3 điểm mạnh mới: Asset pagination đúng, OpenAPI đồng bộ cao, chống enumeration/timing attack).
- Không tạo finding mới từ suy đoán — toàn bộ nội dung thêm vào lấy nguyên từ `docs/15_ARCHITECTURE_REVIEW.md` đã có sẵn evidence. Không sửa code, không refactor.
- `docs/21_GLOBAL_ARCHITECTURE_REVIEW.md` nay là bản tổng hợp ĐẦY ĐỦ NHẤT về kiến trúc (35 finding, `ARCH-01→35`), thay thế vai trò tham chiếu duy nhất trước đây — các tài liệu sau này (Phase 16/19) đã trích dẫn `ARCH-27` từ `15_ARCHITECTURE_REVIEW.md` vẫn hợp lệ vì ID không đổi.

## Chuyển sang DEVELOPMENT STAGE — 2026-08-31: `docs/development/00_DEVELOPMENT_ROADMAP.md`

- Đọc `docs/23_CODE_REVIEW_ROADMAP.md` (bản tổng hợp cuối cùng đã dedup toàn bộ 17 module review + `docs/20/21/22`) và `docs/19_IMPROVEMENT_ROADMAP.md` — không đọc lại repository, không re-review module. Tổng hợp thành `docs/development/00_DEVELOPMENT_ROADMAP.md` (đã tạo `docs/development/` + `docs/development/tasks/` rỗng).
- **27 improvement item** (`IMP-001→027`) chi tiết đầy đủ template (Title/Area/Source Finding/Evidence/Problem/Impact/Priority/Effort/Module/Dependencies/Risk/Task) + 7 nhóm LOW gộp gọn, gom thành **25 development task** (`DEV-001→025`), ưu tiên Security > Data integrity > Critical business logic > API stability > Performance > Testing > Maintainability > Refactoring > Cosmetic.
- **6 task P0** (DEV-001/002/003/004/005/006): đóng backdoor rename Role→ADMIN, safeguard resetPassword ADMIN, bật lại authorization proposal, khôi phục toolchain test (blocker), sửa business rule CONFIRM_STATUS, hard-delete Document/tháng.
- Chưa tạo file `docs/development/tasks/DEV-XXX.md` nào — đúng yêu cầu, chỉ tạo roadmap ở bước này.
- **Next Action**: chờ người dùng chỉ định 1 DEV-XXX cụ thể để tạo task file + bắt đầu implement (khuyến nghị DEV-004 trước tiên).

## Pre-Development Preflight — 2026-08-31: `docs/development/00_PRE_DEV_PREFLIGHT.md`

- Xác minh 4 nhóm assumption trước khi bắt đầu DEV-XXX, KHÔNG sửa code, KHÔNG implement DEV-001/004. Kết quả đầy đủ: `docs/development/00_PRE_DEV_PREFLIGHT.md`.
- **Phát hiện mới quan trọng**: `backend/.env` (dev, cục bộ) có `MONGO_URI` với `replicaSet=rs0` — **xác nhận môi trường DEV đã đúng yêu cầu tiên quyết cho `withTransaction()`** (trước đây ghi UNKNOWN chung chung ở Phase 02/04/14 — nay thu hẹp UNKNOWN xuống CHỈ CÒN production).
- RBAC production data và hạ tầng triển khai thật (serve tĩnh `/uploads`) **vẫn UNKNOWN** — không thể xác minh trong phạm vi repo (không có kết nối production, không có Dockerfile/nginx config nào tồn tại — hạ tầng triển khai chưa được định nghĩa, không phải "có nhưng chưa đọc").
- Git/environment/toolchain: working tree khớp 100% trạng thái đã biết (6 file TASK-002 chưa commit), `npx tsc --noEmit` PASS 0 lỗi, npm registry khả dụng (mạng OK để cài `jest`), 4 file test mồ côi vẫn còn nguyên trong `dist/`.
- **Kết luận: KHÔNG có blocker nào cho DEV-004** — sẵn sàng bắt đầu khi được yêu cầu.

## DEV-001 — Fix Role→ADMIN Privilege Escalation — 2026-08-31: ✅ DONE

- **`SEC-28`/`RV02-01` (CRITICAL, backdoor rename Role→"ADMIN") — RESOLVED.** Sửa `updateRoleService()` (`backend/src/services/rbac/rbac.service.ts`): thêm 2 guard chặn (1) đổi tên role đang là `"ADMIN"` sang tên khác, (2) đổi tên role khác thành `"ADMIN"` — bảo lưu chuỗi `"ADMIN"` bất biến, đóng đúng vector `RV02-01` mà không cần sửa schema/middleware/type hay chạy migration DB (đã cân nhắc và loại bỏ hướng `isSystemRole` flag — xem lý do đầy đủ ở `docs/development/tasks/DEV-001.md`).
- **Chỉ 1 file thay đổi**: `backend/src/services/rbac/rbac.service.ts`. Không đổi API contract, DTO, schema.
- **Verification**: `npx tsc --noEmit` PASSED (0 lỗi). **NOT VERIFIED bằng automated test** (DEV-004/Jest toolchain đang DEFERRED) — chỉ có STATIC/MANUAL VERIFICATION qua 4 kịch bản trace source code (xem task file).
- **Kết luận bảo mật hệ thống cập nhật**: cả 2 đường account-takeover ADMIN đã biết mà KHÔNG bị ảnh hưởng bởi TASK-001/002 nay còn lại **1** (`SEC-29`/`RV03-01`, `resetPassword()` thiếu safeguard ADMIN — vẫn OPEN, thuộc DEV-002, CHƯA làm ở task này theo đúng scope).
- Task file đầy đủ: `docs/development/tasks/DEV-001.md`.

## DEV-004 — Restore Jest/Test Toolchain — 2026-08-31: ✅ DONE

- **Test infrastructure đã khôi phục hoàn toàn và CHẠY THẬT** (không phải tuyên bố suông): `jest ^29.7.0` + `ts-jest ^29.4.12` (đúng version tìm thấy trong git history `150acdf`) + `@types/jest ^29.5.14` thêm vào `backend/package.json`; `backend/jest.config.js` khôi phục nguyên văn từ git history (đã bị xoá ở `5b58fb1`); script `"test": "jest"` đã thêm.
- **4 bộ test mồ côi đã cứu thành công**: `authorizePermission.middleware.test.ts`, `auths.service.test.ts`, `workflow.service.test.ts`, `permission.cache.test.ts` — tái tạo từ `dist/**/__tests__/*.test.js`, đối chiếu khớp 100% với source hiện tại. **Kết quả chạy thật: 4/4 suite PASS, 35/35 test PASS.**
- **Phát hiện + sửa 1 vấn đề infrastructure**: `tsconfig.json` (production) thiếu `exclude` khiến `tsc --noEmit`/`npm run build` biên dịch lẫn cả `__tests__/` (thiếu type `jest`) → lỗi biên dịch chéo. Đã thêm `exclude: ["node_modules","dist","**/__tests__/**"]` vào `tsconfig.json` + `exclude: ["node_modules","dist"]` override ở `tsconfig.test.json` (để ts-jest vẫn transform được test file). `npx tsc --noEmit` cuối cùng PASS 0 lỗi.
- **Đính chính lịch sử qua git**: ngay tại thời điểm `jest.config.js` còn tồn tại (`150acdf`), `package.json` CHƯA BAO GIỜ có `jest`/`@types/jest` — chỉ có `ts-jest`. Toolchain gốc vốn không hoàn chỉnh, không phải "đã hoàn chỉnh rồi mất".
- Task file đầy đủ: `docs/development/tasks/DEV-004.md`.
- **Cập nhật trạng thái ISS-07/TD-09/TD-26** (Phase 01/11/12 baseline, đã đính chính OUTDATED ở Phase 18): nay **RESOLVED** — toolchain hoạt động, có 35 test PASS thật bảo vệ Auth/RBAC/Workflow (partial)/Permission cache.
- **Nền tảng đã sẵn sàng** cho DEV-002/003/005 (và mọi DEV-XXX khác liên quan Auth/RBAC/Workflow) — có thể viết thêm test case bảo vệ ngay khi implement, không còn phải NOT VERIFIED như DEV-001.

## DEV-001A — Harden Super Admin Identity — 2026-08-31: ✅ DONE (Phase A)

- **Tách Super Admin identity khỏi display name**: thêm `Role.isSystemRole: boolean` (default `false`), populate thêm ở `auth.middleware.ts`, đồng bộ type `Express.Request.user.role`. `isSystemRole` KHÔNG thể set/update qua bất kỳ API nào (`CreateRoleDTO`/`UpdateRoleDTO`/whitelist chỉ có `["name"]`, đã xác nhận không cần sửa thêm).
- **11 vị trí security decision** đổi từ `role.name === "ADMIN"` sang `role.isSystemRole === true || role.name === "ADMIN"` (Phase A — OR transitional, giữ literal làm lưới đỡ chống lockout): `authorizePermission.middleware.ts` (bypass chính), 4 guard `users.service.ts`, 2 `isAdmin` + 1 `deleteDocumentService` ở domain Document, 2 `isAdmin` domain Excel, 1 guard `dashboard.controller.ts`. Phát hiện thêm 2 vị trí ngoài 9 vị trí ở plan gốc (`dashboard.controller.ts`, `document.service.ts:deleteDocumentService`) qua search lại toàn bộ pattern `"ADMIN"`.
- **DEV-001 guard KHÔNG bị đụng tới** (không revert) — vẫn chặn rename literal `"ADMIN"`, độc lập, defense-in-depth với DEV-001A.
- **Migration script tạo mới nhưng CHƯA CHẠY** trên bất kỳ environment nào (kể cả dev): `backend/scripts/migrate-system-role-flag.ts` — idempotent, chỉ target đúng role `"ADMIN"`. Vì chưa chạy, `isSystemRole` toàn bộ role hiện tại = `false`/`undefined` — hệ thống vẫn hoạt động đúng nhờ fallback literal (đúng thiết kế Phase A, không lockout).
- **Phase B (xoá literal fallback) CHƯA thực hiện** — chờ migration chạy + xác nhận (`Role.countDocuments({isSystemRole:true})===1`) trên mọi environment trước khi cân nhắc.
- **Verification**: `npx tsc --noEmit` PASSED (0 lỗi). `npx jest` — 4/4 suite, 35/35 test PASS (dùng lại toolchain DEV-004, không có test nào bị breaking do fallback OR giữ nguyên hành vi cũ).
- Plan đầy đủ: `docs/development/DEV-001A_SUPER_ADMIN_IDENTITY_PLAN.md`. Task/implementation: `docs/development/tasks/DEV-001A.md`.

## DEV-002 — Safeguard ADMIN cho resetPassword() — 2026-08-31: ✅ DONE

- **`SEC-29`/`RV03-01` (HIGH, đường account-takeover ADMIN thứ 3) — RESOLVED.** `resetPassword()` (`backend/src/services/users/users.service.ts`) trước đây có docstring mô tả chặn ADMIN nhưng code không hề check — nay thêm guard `Role.isSystemRole===true || Role.name==="ADMIN"` (cùng pattern OR/Phase A đã dùng ở DEV-001A cho `disable()`/`assignRole()`/`create()`/`update()` cùng file).
- **Chỉ 1 file production thay đổi**: `users.service.ts`. +1 file test mới: `users.service/__tests__/users.service.test.ts` (5 test, TEST-005 trong testing strategy).
- **Verification**: `npx tsc --noEmit` PASSED (0 lỗi). **AUTOMATED TEST PASS** — 6 suite, 40/40 test (toolchain DEV-004).
- **Cả 3 đường account-takeover ADMIN đã biết nay đều RESOLVED**: `SEC-05`/ISS-01 (TASK-001/002), `SEC-28`/RV02-01 (DEV-001), `SEC-29`/RV03-01 (DEV-002).
- Task file đầy đủ: `docs/development/tasks/DEV-002.md`.
- **Lưu ý**: `docs/development/00_DEVELOPMENT_ROADMAP_v2.md` được yêu cầu tham chiếu nhưng KHÔNG tồn tại trong repo — đã dùng `00_DEVELOPMENT_ROADMAP.md` (bản duy nhất có) làm nguồn sự thật.

## DEV-003 — Bật lại authorization cho POST /api/documents/proposal — 2026-09-01: ✅ DONE

- **`SEC-06`/`RV05-02`/ISS-09 (P0, mọi user đăng nhập tạo được Document bất kể quyền) — RESOLVED.** `backend/src/routes/documents/document.route.ts` — bỏ comment `authorizePermission("DOCUMENT_CREATE")` ở route `POST /proposal` (route DUY NHẤT trong file thiếu authorization).
- **Dependency roadmap đã xử lý trước khi code**: audit RBAC DB dev thật (read-only, script tạm không commit) xác nhận `ADMIN`/`IT`/`USER` giữ `DOCUMENT_CREATE`, 4 role approver (`TRUONG_KHOA`/`DIEU_DUONG_TRUONG`/`BAN_GIAM_DOC`/`PHONG_VAT_TU_TTB`) không có — khớp thiết kế nghiệp vụ, bật guard không chặn nhầm luồng hợp lệ nào trên dev.
- **Chỉ 2 file thay đổi**: `document.route.ts` (1 dòng) + `openAPI.yaml` (xoá cảnh báo lỗi thời, thêm response `403`).
- **Verification**: `npx tsc --noEmit` PASSED (0 lỗi). `npx jest` — 5 suite, 40/40 test PASS (không có test riêng cho route Document, không bị ảnh hưởng).
- Task file đầy đủ: `docs/development/tasks/DEV-003.md`.
- **UNKNOWN chưa đổi**: dữ liệu RBAC production thật (đã ghi ở roadmap Mục 7 từ trước) — cần audit lại riêng ở production trước khi deploy.

## DEV-006 — Hard-delete Document/tháng → soft-delete hàng loạt — 2026-09-01: ✅ DONE

- **`H-06`/`ISS-02`/`RV05-05` (P0, dangling reference vĩnh viễn khi xoá Document theo tháng) — RESOLVED theo hướng SOFT-DELETE (quyết định nghiệp vụ của user).** `deleteDocumentsByMonthService()` (`backend/src/services/documents/document.service.ts`) đổi từ `Document.deleteMany` sang `Document.updateMany` (set `isActive=false/deletedAt/deletedBy`), ĐỒNG BỘ hoàn toàn pattern với `deleteDocumentService()` (xoá đơn lẻ).
- **Guard tham chiếu**: PROPOSAL còn REPORT active tham chiếu (`Document.referenceTo`) bị loại khỏi batch — dùng lại đúng `countReportsByProposal()` đã có (Missing Validation #5 cũ), tránh gãy `getReportsByProposalService()`. `WorkflowInstance.documentId`/`Notification.resourceId` KHÔNG còn dangling nhờ bản chất soft-delete (row Document vẫn tồn tại) — không cần sửa thêm, đã xác minh các query active-flow (`findActiveDocument`, `getActiveDocumentOrFail`, `findProposalById`, `getAllDocumentsService`, ...) đều lọc `isActive:true` sẵn.
- **API contract**: response `data` thêm field mới `skippedCount` (additive, không đổi/xoá `deletedCount`). Request body không đổi.
- **Verification**: `npx tsc --noEmit` PASSED (0 lỗi). `npx jest` — 5 suite, 40/40 test PASS (chưa có suite riêng cho `document.service.ts`, không bị ảnh hưởng; KHÔNG có test mới cho hàm này — không được yêu cầu ở task).
- **Finding ngoài scope, ĐÃ GHI NHẬN KHÔNG SỬA** (CLAUDE.md §26): bulk-delete-by-month thiếu guard ADMIN-only (khác `deleteDocumentService()`) — role `USER` cũng có `DOCUMENT_DELETE` theo seed data, có thể soft-delete hàng loạt document mọi phòng ban. Cần task riêng nếu muốn xử lý.
- Task file đầy đủ: `docs/development/tasks/DEV-006.md`.

## DEV-005 — Sửa business rule Asset đồng bộ (CHECK_DAMAGE↔PROPOSE_REPAIR) — 2026-09-01: ✅ DONE (sau 1 lần sửa sai + revert)

- **Lần 1 (SAI, đã REVERT)**: dựa vào `workflow.service.ts` hard-code, tôi suy luận nhầm `documentRules.ts` là bên sai và đổi `CONFIRM_STATUS.referenceSubType` sang `PROPOSE_REPAIR`. User phản hồi: phân tích document GỐC là `PROPOSE_INK ↔ CONFIRM_STATUS`, `PROPOSE_REPAIR ↔ CHECK_DAMAGE`. Đã REVERT `documentRules.ts` về đúng giá trị gốc.
- **Lần 2 (ĐÚNG, đã DONE)**: hỏi lại user, xác nhận (1) `CHECK_DAMAGE` là subType thực sự đóng luồng `PROPOSE_REPAIR` để sync Asset; (2) `CONFIRM_STATUS`/`PROPOSE_INK` KHÔNG liên quan `Asset.status`. **`C-02`/`RV05-01`/`ARCH-12` (P0, Asset kẹt vĩnh viễn UNDER_MAINTENANCE) — RESOLVED**: sửa `workflow.service.ts:syncAssetOnDocumentApproved()` — đổi điều kiện nhánh từ `CONFIRM_STATUS` sang `CHECK_DAMAGE` (KHÔNG đổi logic bên trong: cùng field `meta.repairResult`, cùng `resolveAssetMaintenanceService`). `documentRules.ts` giữ nguyên giá trị gốc (không sai).
- **Audit dữ liệu Asset đang kẹt** (bắt buộc theo roadmap, chạy 2 lần — theo cả 2 giả thuyết): DB dev — 2 Asset `UNDER_MAINTENANCE`, **0 asset bị kẹt do bug này** cả 2 lần → KHÔNG cần data remediation trên dev. Production UNKNOWN.
- **File thực sự sửa**: `workflow.service.ts` (1 điều kiện subType). `documentRules.ts` chỉ thêm comment, giá trị không đổi.
- **Verification**: `npx tsc --noEmit` PASSED (0 lỗi). `npx jest` 5 suite/40 test PASS — nhưng KHÔNG có test case nào cho `syncAssetOnDocumentApproved` (đã kiểm tra `workflow.service.test.ts`), nên full-suite PASS chỉ xác nhận không regression chỗ khác, KHÔNG xác nhận đúng fix bằng automated test.
- **Bài học ghi nhận**: lần 1 tôi suy luận business rule từ code có sẵn (`workflow.service.ts`) thay vì từ phân tích document gốc của chủ dự án — sai theo đúng cảnh báo CLAUDE.md §19 (không tự tạo business rule). Đã sửa quy trình: hỏi lại, KHÔNG tự đoán tiếp lần 2.
- Task file đầy đủ (có lịch sử revert, không giấu sai sót): `docs/development/tasks/DEV-005.md`.

## DEV-010 — Asset business-logic bypass fixes (whitelist + regex escape) — 2026-09-01: ✅ DONE

- **`IMP-014`/`H-07`/`SEC-35`/`RV06-01` (bypass soft-delete Asset qua `ASSET_UPDATE`) — RESOLVED**: bỏ `isActive` khỏi `ASSET_UPDATE_WHITELIST` (`assets.constants.ts`) và `UpdateAssetDTO` (`assets.dto.ts`, cả 2 lớp phòng thủ). Trước đây user chỉ cần `ASSET_UPDATE` (không cần `ASSET_DELETE`) tự đặt `isActive:false` qua `PUT/PATCH /assets/:id`, bỏ qua HOÀN TOÀN guard "không xoá asset IN_USE/UNDER_MAINTENANCE" + audit trail `deletedAt`/`deletedBy` mà `deleteAssetService()` làm đúng.
- **`IMP-015`/`H-08`/`SEC-36`/`RV06-02` (ReDoS/lỗi regex, 3 domain) — RESOLVED**: `escapeRegex()` (trước đây cục bộ trong `documents.mapper.ts`, chỉ Documents dùng) chuyển ra `shared/utils/regex.util.ts` để dùng chung; áp dụng cho toàn bộ `$regex` chưa escape ở Departments (`departments.service.ts`, 4 chỗ), RBAC (`rbac.service.ts`, 3 chỗ: Permission/Role/Policy search), Assets (`asset.service.ts`/`assetExcel.service.ts`/`assetCategory.service.ts`).
- **Verification**: `npx tsc --noEmit` PASSED (0 lỗi). `npx jest` — 5 suite, 40/40 test PASS (không suite nào test riêng 2 fix này, chỉ xác nhận không regression chỗ khác).
- **Finding ngoài scope, ĐÃ GHI NHẬN KHÔNG SỬA**: `users.service.ts:122` (search username) cùng lỗi thiếu `escapeRegex` nhưng domain Users không nằm trong "3 domain" roadmap liệt kê — cần task riêng. `ASSET_CATEGORY_UPDATE_WHITELIST` vẫn còn `isActive` (roadmap chỉ định "Asset", không phải "AssetCategory").
- Task file đầy đủ: `docs/development/tasks/DEV-010.md`.

## DEV-007 — Domain Upload: khắc phục chuỗi IDOR (IMP-007→010) — 2026-09-01: ✅ DONE

- **`IMP-007`/`H-09a`/`SEC-30`/`RV09-01` (không giới hạn loại file) — RESOLVED**: `upload.routes.ts` — `createUploader()` nay truyền `allowedTypes` (PDF/JPEG/PNG/.docx/.xlsx, xác nhận với user).
- **`IMP-008`/`H-09b`/`SEC-31`/`RV09-02` (file vô chủ) — RESOLVED**: `upload.service.ts:saveFilesToDB()` nay nhận `userId`, gán `uploadedBy`.
- **`IMP-009`/`H-09c`/`SEC-32`/`RV09-03` (trả toàn bộ file mọi user, không phân trang) — RESOLVED**: `getFiles()` nay filter theo `uploadedBy` (trừ ADMIN xem tất cả — xác nhận với user), thêm phân trang (`page`/`limit`), response đổi sang `{data, pagination}` (**breaking change**).
- **`IMP-010`/`H-09d`/`SEC-33`/`RV09-04` (IDOR đầy đủ) — RESOLVED**: `getFileDetail`/`deleteFile` nay chặn `403` nếu không phải chủ file (`uploadedBy`) hoặc ADMIN.
- **Chuỗi 4 fix liên kết chặt**: IMP-008 (gán chủ sở hữu) là tiền đề bắt buộc cho IMP-009/010 (không có chủ thì không check ownership được) — đã làm đúng thứ tự.
- **Verification**: `npx tsc --noEmit` PASSED (0 lỗi). `npx jest` — 5 suite, 40/40 test PASS (không suite nào cho domain Upload, không xác nhận đúng fix bằng automated test). YAML `openAPI.yaml` đã validate qua `js-yaml` sau khi tự phát hiện+sửa 1 lỗi duplicate key do chính sửa lần đầu của tôi.
- **Finding ngoài scope, ĐÃ GHI NHẬN KHÔNG SỬA**: file upload TRƯỚC fix không có `uploadedBy` (chỉ ADMIN xem được, chưa audit DB); lỗi Multer vẫn rơi vào `500` chung (đã có task riêng `DEV-017`/`IMP-023`); module Upload chưa dùng `ApiError`/`catchAsync` chuẩn hoá (refactor lớn hơn scope).
- Task file đầy đủ: `docs/development/tasks/DEV-007.md`.

## DEV-009 — Spike kiến trúc ABAC (Activate/Remove) — 2026-09-01: ✅ DECIDED (không code)

- **`IMP-013`/`H-03`+`H-13`/`SEC-07`/ISS-03/`ARCH-06` (ABAC dead runtime) — Đã xác nhận LẠI trên source hiện tại: vẫn 100% dead (grep `enablePolicies` trong `routes/**`: 0 kết quả), không đổi so với Phase 07/module-review RBAC.
- **Evidence bổ sung**: evaluator (`Policycondition.evaluator.ts`) đã hoàn chỉnh về kỹ thuật (an toàn, chống RCE, có unit test), `Policy` model + API quản trị (`rbac.service.ts`) đã đầy đủ — effort LARGE chủ yếu nằm ở việc CẦN business rule cụ thể cho từng domain, không phải viết lại hạ tầng.
- **Quyết định của người dùng (AskUserQuestion)**: chọn **Phương án A — Hoàn thiện/kích hoạt ABAC** (không chọn gỡ bỏ, không chọn hoãn).
- **QUAN TRỌNG**: quyết định này KHÔNG kèm implementation. Còn nhiều UNKNOWN cần xác nhận riêng trước khi code (domain nào làm trước, Policy condition thật theo business rule nào, cách seed Policy) — xem `docs/development/tasks/DEV-009.md` Mục 7 (Next Steps). Khuyến nghị tách task con theo domain (VD `DEV-009A`) thay vì 1 task lớn.
- Task file đầy đủ: `docs/development/tasks/DEV-009.md`.

## DEV-036 — Cấp `DEPARTMENT_VIEW`/`USER_VIEW` cho role `PHONG_VAT_TU_TTB` — 2026-09-07: ✅ DONE

- **Nguồn gốc**: user yêu cầu trực tiếp sửa Remaining Issue #2-3 đã ghi ở `FE-06.md`.
- **Root cause**: role `PHONG_VAT_TU_TTB` có `ASSET_CREATE`/`ASSET_ASSIGN` nhưng thiếu `DEPARTMENT_VIEW`/`USER_VIEW` — không chọn được khoa/phòng hay người dùng cụ thể khi tạo/cấp phát tài sản, dù role này CẦN thao tác liên phòng ban (đã xác nhận qua comment sẵn có + DEV-034). Đối chiếu `IT` (role tương tự đã có 2 quyền này từ trước) xác nhận đây là thiếu sót lúc tạo role, không phải giới hạn cố ý.
- **Fix**: cấp thẳng `DEPARTMENT_VIEW`+`USER_VIEW` cho role (không dùng Policy hẹp như DEV-034 — bản chất là quyền tham chiếu để CHỌN, không phải xem 1 resource cụ thể). Đồng bộ DB qua API `assign-permissions` (25→27 permission).
- **Verify**: HTTP thật (`phongkhth`) — `GET /departments`/`GET /users` từ 403 → 200.
- Task file đầy đủ: `docs/development/tasks/DEV-036.md`.

## DEV-035 — Asset: thêm filter `isActive` + khôi phục qua UI — 2026-09-07: ✅ DONE

- **Nguồn gốc**: user yêu cầu trực tiếp sửa Remaining Issue #1 đã ghi ở `FE-06.md`.
- **Root cause**: `getAllAssetsService` HARD-CODE `filter.isActive=true`, `QueryAssetDTO` không có field này — sau khi xoá mềm 1 Asset, không cách nào (kể cả ADMIN) xem/khôi phục lại qua UI dù `PATCH /:id/restore` vẫn hoạt động.
- **Fix**: thêm `isActive` vào `QueryAssetDTO` + `getAllAssetsService` (CÙNG pattern `QueryDocumentDTO`/`getAllDocumentsService` đã có sẵn) — mặc định `true` chỉ khi client không truyền. Cố tình KHÔNG sửa `getAssetByIdService` (giữ parity với Document — detail vẫn luôn 404 với record đã xoá ở CẢ 2 domain, hành vi nhất quán có sẵn). FE: filter "Hiển thị" + cột "Hoạt động" + action Khôi phục ở `AssetsListPage`.
- **Verify**: HTTP thật full lifecycle (tạo → xoá mềm → ẩn khỏi list mặc định → hiện với `isActive=false` → khôi phục → hiện lại mặc định) — dữ liệu test đã xoá vĩnh viễn.
- Task file đầy đủ: `docs/development/tasks/DEV-035.md`.

## DEV-034 — Fix role `PHONG_VAT_TU_TTB` không xem được chi tiết đề xuất đang chờ chính họ duyệt — 2026-09-06: ✅ DONE

- **Nguồn gốc**: user báo lỗi trực tiếp kèm 2 screenshot (tài khoản `phongkhth`, role `PHONG_VAT_TU_TTB`) — bấm vào đề xuất trong "Hộp thư chờ duyệt" → điều hướng thẳng tới `/403` (route client-side, chưa hề gọi API).
- **Root cause (2 lỗi cộng dồn)**: (1) `rolePermission.map.ts` — role `PHONG_VAT_TU_TTB` (thêm ở "Giai đoạn 3") THIẾU HẲN `DOCUMENT_VIEW` từ lúc tạo, khác 3 role duyệt khác — chặn cứng route FE `documents/*` VÀ backend `GET /documents` (list, chỉ RBAC, không có ABAC dự phòng). (2) Kể cả có `DOCUMENT_VIEW`, `GET /documents/:id` vẫn chặn document LIÊN PHÒNG BAN qua Policy `document-view-detail-same-department` (DEV-009A) — đúng rủi ro đã CẢNH BÁO TRƯỚC ở DEV-009A Mục 2.3/10.6, giờ xác nhận THẬT: role này thẩm định kỹ thuật cho MỌI khoa, không chỉ khoa của chính họ.
- **Phát hiện phụ**: DB thật đã LỆCH khỏi source cho đúng role này — có `DOCUMENT_VIEW_DETAIL` (rộng, không có trong source) nhưng THIẾU `WORKFLOW_REJECT` (có trong source) — nguyên nhân chính xác `UNKNOWN`, khả năng cao là seed cũ chưa từng đồng bộ lại.
- **Fix**: (a) thêm `DOCUMENT_VIEW` vào RBAC của `PHONG_VAT_TU_TTB`; (b) Policy ABAC MỚI, dùng chung cho MỌI role: `document-view-detail-pending-approver` (`resource.pendingApproverRole === user.role.name`) — `loadDocument.middleware.ts` gắn thêm `pendingApproverRole` (role của bước đang "pending", từ `WorkflowInstance` mới nhất theo document) vào `req.resource`, KHÔNG persist DB; (c) đồng bộ lại DB qua API `assign-permissions` (bỏ `DOCUMENT_VIEW_DETAIL` rộng, thêm `DOCUMENT_VIEW` + `WORKFLOW_REJECT`) — KHÔNG chạy `seed-rbac.ts` (cùng lý do DEV-009A/DEV-027).
- **Verification (HTTP thật, tài khoản `phongkhth`)**: xem đúng document trong screenshot gốc → 200; `GET /documents` list → 200; document KHÁC phòng ban + workflow test "pending" đúng bước `PHONG_VAT_TU_TTB` → 200 (Policy mới hoạt động); CÙNG document sau khi xoá workflow test → 403 (xác nhận Policy không mở tràn lan). `tsc`/`jest` (16 suite/97 test) PASS. Dữ liệu test + token đã dọn sạch.
- **Remaining**: `BAN_GIAM_DOC` (bước duyệt cuối, cũng cần duyệt liên phòng ban) có khả năng CAO gặp bug tương tự về lý thuyết — Policy mới đã tự động áp dụng cho role này (không cần sửa thêm code) nhưng CHƯA có bằng chứng HTTP thật xác nhận, ghi nhận `UNKNOWN`.
- Task file đầy đủ: `docs/development/tasks/DEV-034.md`.

## DEV-033 — Fix dropdown "Khoa/Phòng" trống khi tạo đề xuất (role USER thiếu `DEPARTMENT_VIEW`) — 2026-09-06: ✅ DONE

- **Nguồn gốc**: user báo lỗi trực tiếp kèm screenshot — trang "Tạo đề xuất mới", dropdown "Khoa/Phòng" trống hoàn toàn (tài khoản `thuykhth`, role USER).
- **Root cause**: `GET /departments` yêu cầu `DEPARTMENT_VIEW` — trong 2 role có `DOCUMENT_CREATE` (`IT`, `USER`), CHỈ `IT` có `DEPARTMENT_VIEW`. Xác nhận qua HTTP thật: `GET /departments` (thuykhth) → 403. Bug có từ FE-04, không phải regression của DEV-030/031/032.
- **Quyết định**: KHÔNG cấp `DEPARTMENT_VIEW` cho USER (mở quyền không cần thiết) — thay vào đó khoá field `department` về đúng khoa của chính người tạo (`user.department`, có sẵn từ `GET /users/me`, không cần API mới) khi role không có `DEPARTMENT_VIEW`. Khớp đúng nghiệp vụ: USER chỉ tạo đề xuất cho khoa mình; IT (role duy nhất khác có `DOCUMENT_CREATE`) giữ dropdown đầy đủ vì cần tạo đề xuất cho thiết bị của khoa KHÁC.
- **Fix**: `useDepartments` hook thêm `enabled` option; `DocumentCreatePage` hiển thị 3 nhánh (dropdown đầy đủ / khoá về khoa mình / cảnh báo nếu tài khoản thiếu department); `DocumentsListPage` tắt luôn query thừa cho non-admin (dropdown filter đã ẩn từ DEV-030 nhưng hook vẫn gọi ngầm).
- **Verification**: `typecheck`/`lint`/`build` PASS; xác nhận qua HTTP thật root cause (403) + shape dữ liệu `user.department` khớp đúng cách FE đọc. Chưa verify bằng trình duyệt thật (không có công cụ).
- **Phát hiện phụ chưa sửa**: `createDocumentService` không kiểm tra `department` gửi lên phải khớp department người tạo — 1 client tuỳ ý vẫn gửi được department bất kỳ (lỗ hổng tương tự DEV-009A/030 nhưng ở chiều CREATE) — ghi nhận, ngoài phạm vi báo lỗi UI lần này.
- Task file đầy đủ: `docs/development/tasks/DEV-033.md`.

## DEV-032 — Sửa quy trình duyệt "Duyệt giấy tờ đề xuất 3 cấp" (role duyệt sai, không ai duyệt được) — 2026-09-06: ✅ DONE

- **Nguồn gốc**: user yêu cầu trực tiếp sau khi FE-05 phát hiện template có bước không ai duyệt được ("chỉnh sửa lại giúp tôi phần tài khoản, quyền trong quy trình duyệt. Kiểm tra lại giúp tôi").
- **2 vấn đề phát hiện**: (1) bước 1 role="USER" — role USER không có RBAC `WORKFLOW_APPROVE`/`WORKFLOW_REJECT` (xác nhận qua DB thật, không chỉ code) → không ai duyệt được, workflow kẹt vĩnh viễn; (2) bước 3 role="ADMIN" — lẫn vai trò quản trị hệ thống với thẩm quyền phê duyệt nghiệp vụ cao nhất, không khớp thiết kế đã ghi RÕ trong comment `rolePermission.map.ts` (TRUONG_KHOA "bước đầu quy trình", PHONG_VAT_TU_TTB "đứng SAU Trưởng khoa, TRƯỚC Ban Giám đốc", BAN_GIAM_DOC "bước duyệt CUỐI CÙNG").
- **Verify trước khi sửa**: xác nhận qua DB thật (không chỉ file code) cả 5 role duyệt (TRUONG_KHOA/DIEU_DUONG_TRUONG/BAN_GIAM_DOC/PHONG_VAT_TU_TTB/IT) đều tồn tại + có thật quyền APPROVE/REJECT; xác nhận 0 workflow instance thật nào từng dùng template lỗi này (an toàn tuyệt đối để sửa, không cần migrate).
- **Fix**: DATA-ONLY (không đổi code/RBAC) — cập nhật 3 field `steps[].role`+`steps[].name` của đúng 1 `WorkflowTemplate` document: bước 1 USER→TRUONG_KHOA, bước 2 IT→PHONG_VAT_TU_TTB, bước 3 ADMIN→BAN_GIAM_DOC. Cân nhắc phương án cấp quyền cho USER thay vì sửa template — KHÔNG chọn vì tác động rộng không cần thiết (biến mọi user thường thành approver), trong khi vấn đề thật chỉ là 1 template bị gán sai role.
- **HTTP verify THẬT**: `POST /workflows/submit` với template đã sửa → 200, trả đúng 3 role mới; đã dọn sạch dữ liệu test.
- **Giới hạn đã biết**: `steps[].role` là string đơn, không phân biệt được khoa lâm sàng (TRUONG_KHOA) vs khoa điều dưỡng (DIEU_DUONG_TRUONG) — cần 2 template riêng hoặc nâng schema nếu muốn hỗ trợ cả 2, chưa làm ở task này.
- Task file đầy đủ: `docs/development/tasks/DEV-032.md`.

## DEV-031 — Fix regression: route FE `documents/:id` chặn cứng 100% non-admin (hệ quả DEV-009A) — 2026-09-06: ✅ DONE

- **Nguồn gốc**: TỰ PHÁT HIỆN khi chuẩn bị lập kế hoạch FE-05 (đọc lại `routes/index.tsx`), không phải yêu cầu trực tiếp của user — đã báo trước khi sửa.
- **Root cause**: route `/app/documents/:id` gate bằng `ProtectedRoute permission={DOCUMENT_VIEW_DETAIL}` (viết ở FE-04, TRƯỚC khi DEV-009A resume cùng ngày). DEV-009A đã gỡ `DOCUMENT_VIEW_DETAIL` khỏi RBAC của 5 role thường, thay bằng ABAC Policy theo từng document — permission này KHÔNG BAO GIỜ còn xuất hiện trong `user.permissions[]` tĩnh (`GET /users/me`) của non-admin. `usePermission()`/`ProtectedRoute` chỉ đọc danh sách tĩnh đó, không biết gì về ABAC per-resource → chặn CỨNG 100% non-admin khỏi xem BẤT KỲ document nào, kể cả tài liệu cùng khoa mà backend cho phép (200, đã verify ở DEV-009A/DEV-030).
- **Xác nhận qua HTTP thật**: `GET /users/me` (token `thuykhth`, role USER) → có `DOCUMENT_VIEW`, KHÔNG có `DOCUMENT_VIEW_DETAIL` — đúng khớp root cause.
- **Fix**: bỏ wrapper `ProtectedRoute permission={DOCUMENT_VIEW_DETAIL}` quanh route `:id`, chỉ còn thừa hưởng guard `DOCUMENT_VIEW` của nhóm cha `documents/` — backend (RBAC ADMIN bypass + ABAC department Policy) là ranh giới an toàn thật, `DocumentDetailPage` đã có `ErrorState` xử lý 403 sẵn từ FE-04, không cần code mới. Đúng nguyên tắc `FE_UI_DEVELOPMENT_ROADMAP.md` Mục 5 ("Permission UI chỉ là UX; backend vẫn là security boundary").
- **Verification**: frontend `typecheck`/`lint` PASS. Chưa verify bằng trình duyệt thật (không có công cụ điều khiển browser trong phiên) — khuyến nghị user tự xác nhận trực quan.
- **Bài học quy trình**: khi 1 task backend đổi permission (DEV-009A) mà route FE khác đang gate cứng theo, cần rà route/guard liên quan NGAY trong task đó — ghi nhận cho các task ABAC/RBAC tương lai.
- Task file đầy đủ: `docs/development/tasks/DEV-031.md`.

## DEV-030 — Department-scoping cho `GET /documents` (danh sách) + `GET /assets/:id/documents` — 2026-09-06: ✅ DONE

- **Nguồn gốc**: yêu cầu trực tiếp của user — "user nào login vào chỉ được cho phép thấy các tài liệu đề xuất, sửa chữa của user thuộc khoa đó". Đây chính là khoảng trống đã ghi nhận (không sửa) ở DEV-009A: chỉ đóng ABAC cho `GET /:id`, List (`GET /documents`) vẫn thấy được tài liệu MỌI phòng ban.
- **Quyết định user (AskUserQuestion)**: giới hạn áp dụng cho **TẤT CẢ role thường, kể cả 3 role duyệt** (TRUONG_KHOA/DIEU_DUONG_TRUONG/BAN_GIAM_DOC) — đồng bộ 100% với rule đã có ở chi tiết (DEV-009A), không phân biệt role duyệt hay không.
- **Root cause**: `getAllDocumentsService()` coi `department` là filter TUỲ CHỌN do client tự truyền qua query string, không ràng buộc gì với department người gọi — không truyền thì thấy tất cả.
- **Fix**: đổi signature `getAllDocumentsService` sang nhận `{query, callerDepartment, isAdmin}` (đồng bộ pattern `UpdateDocumentPayload` có sẵn), ép `filter.department = callerDepartment` cho non-admin SAU KHI build filter từ query (ghi đè bất kỳ giá trị client truyền), fail-closed về `null` nếu user thiếu `department`. Sửa 2 call site: `document.controller.ts::getAllDocuments` và `asset.controller.ts::getAssetDocuments` (route `GET /assets/:id/documents` gọi CHUNG service này — nếu bỏ sót sẽ là đường vòng bypass hoàn toàn).
- **HTTP verify THẬT đợt 1** (tài khoản `thuykhth`): không filter → chỉ thấy 22 doc cùng khoa; cố truyền `?department=<khoa khác>` → vẫn chỉ thấy đúng khoa mình, override bị bỏ qua.
- **[CẬP NHẬT — đợt 2 cùng ngày, user yêu cầu "làm phần còn tồn đọng luôn nhé"]**:
  - Đóng nốt `GET /:proposalId/reports` (`getReportsByProposalService`): thêm check `proposal.department._id !== callerDepartment` cho non-admin (lưu ý `department` ở đây đã populate thành object, khác `document.department` raw ObjectId ở chỗ khác cùng file).
  - Điều tra `Delete`/`Restore`: KHÔNG sửa — `Delete` chỉ ADMIN thực hiện được thật sự (service tự chặn cứng dù RBAC route cấp `DOCUMENT_DELETE` cho role USER — bất nhất RBAC/service PRE-EXISTING, ngoài scope, đã ghi nhận); `Restore` đã check ownership theo `createdBy`, CHẶT HƠN department-scoping. Cả 2 đã đủ an toàn, không cần đổi.
  - Ẩn dropdown filter "Khoa/Phòng" cho non-admin ở `DocumentsListPage.tsx` (chọn khoa khác giờ vô tác dụng với non-admin, gây hiểu nhầm nếu để dropdown hoạt động).
  - **Verify live nhánh ADMIN** (tài khoản admin thật do user cung cấp): `GET /documents` không filter → thấy 271 doc, 13 department khác nhau; `?department=<khoa cụ thể>` → lọc đúng 22 doc của khoa đó (filter admin vẫn hoạt động bình thường); `GET /:proposalId/reports` proposal khác khoa → 200 (ADMIN không bị chặn). Cả 2 token test (`thuykhth`+`admin`) đã chủ động revoke qua `/auths/logout` (DEV-029) sau khi xong.
  - Verification: `tsc`/`jest` backend PASS (16/97, không đổi số lượng); frontend `typecheck`/`lint`/`build` đều PASS.
- Task file đầy đủ (đã cập nhật đủ 2 đợt): `docs/development/tasks/DEV-030.md`.

## DEV-029 — Fix `POST /auths/logout` trả 500 (thiếu body → không revoke được refresh token) — 2026-09-06: ✅ DONE

- **Nguồn gốc**: user báo lỗi trực tiếp kèm screenshot DevTools (request `logout` status 500, UI vẫn tự logout được).
- **Root cause (BUG thật)**: `frontend/src/api/auth.api.ts::logout()` gọi `POST /auths/logout` không kèm body → `backend/src/controllers/auth/auth.controller.ts:50` đọc `req.body.refreshToken` không guard → `req.body` là `undefined` (không Content-Type vì không có data) → `TypeError` không được nhận diện bởi `error.middleware.ts` → rơi vào nhánh fallback → 500. Route `/logout` (`auth.routes.ts:39`) là route DUY NHẤT nhận body trong file nhưng thiếu `validateBody` (khác `/refresh-token` cùng shape). UI vẫn "logout được" chỉ vì `useLogout.ts` luôn xoá local state ở `onSettled` bất kể lỗi API — che mất hệ quả thật: `RefreshToken.revoked` KHÔNG BAO GIỜ được set `true`, refresh token cũ vẫn còn hiệu lực server-side sau khi logout (security impact thật, không chỉ cosmetic).
- **Fix**: FE gửi kèm `{refreshToken: tokenStorage.getRefreshToken()}` trong body `logout()`; BE thêm `validateBody(RefreshTokenDTO)` (tái dùng DTO có sẵn, không tạo mới) cho route `/logout`, cùng pattern `/refresh-token`.
- **Verification**: backend `tsc` 0 lỗi + `jest auth` 4 suites/28 tests PASS; frontend `typecheck` 0 lỗi + `lint` sạch; user tự test live trên UI thật sau khi restart backend, xác nhận OK.
- Task file đầy đủ: `docs/development/tasks/DEV-029.md`.

## DEV-009A — Kích hoạt ABAC domain Document (GET /:id, department-scoping) — 2026-09-06: ✅ DONE (resumed từ PAUSED 2026-09-01)

- **Nguồn gốc**: con của DEV-009 (Phương án A), đã PLANNED đầy đủ + 3 quyết định business rule xác nhận với user từ 2026-09-01 (xem entry cũ bên dưới), PAUSED theo yêu cầu user, RESUMED theo yêu cầu user ở phiên này.
- **Re-verify source trước khi code** (5 ngày đã trôi qua): permission string bug (`DOCUMENT_DETAIL`→`DOCUMENT_VIEW_DETAIL`) hoá ra đã được **DEV-013 sửa từ trước** (task khác) — chỉ còn thiếu phần wiring ABAC (`enablePolicies`/`loadDocument`). Toàn bộ evidence khác (evaluator, middleware, Policy model) không đổi so với lúc PLANNED.
- **Code**: `document.route.ts` (`GET /:id` thêm `loadDocument`+`authorizePermission(...,{enablePolicies,resource:"document",action:"view_detail"})`, `validateParams` đặt TRƯỚC `loadDocument` — tránh regression CastError cho ID sai format, khác thứ tự trong plan gốc); `rolePermission.map.ts` (bỏ `DOCUMENT_VIEW_DETAIL` khỏi 5 role: IT/USER/TRUONG_KHOA/DIEU_DUONG_TRUONG/BAN_GIAM_DOC); `policy.model.ts` (+index `{resource:1,action:1}`); `seed-rbac.ts` (+`seedPolicies()`, không git-track).
- **Áp dụng DB dev**: KHÔNG chạy `seed-rbac.ts` (rủi ro reset toàn bộ role) — dùng `POST /rbac/roles/:id/assign-permissions` targeted cho đúng 5 role (verify trước/sau: chỉ mất `DOCUMENT_VIEW_DETAIL`, 0 permission khác đổi) + `POST /rbac/policies` tạo Policy `document-view-detail-same-department` — cùng pattern targeted-API đã dùng ở DEV-027.
- **HTTP verify THẬT lần đầu cho nhánh ABAC** (dùng tài khoản `admin` + user thật `thuykhth`, role USER): xem document CÙNG phòng ban → 200; KHÁC phòng ban → 403; ADMIN bypass cả 2 → 200/200; `:id` sai format → 400 (không CastError); `:id` không tồn tại → 404. Tất cả đúng thiết kế.
- **Verification**: `npx tsc --noEmit` 0 lỗi, `npx jest` 16 suite/97 test PASS (không đổi số lượng — không viết test mới cho ABAC theo đúng plan gốc, vẫn 0% automated coverage nhánh này, đã ghi nhận từ đầu).
- Task file đầy đủ: `docs/development/tasks/DEV-009A.md` (Mục 10 — Execution Log).

## DEV-028 — Bổ sung `GET /workflows/templates` (đọc-only) — 2026-09-05: ✅ DONE

- **Nguồn gốc**: phát hiện khi code FE-04 (Documents Core UI) — action "Submit vào workflow" (`POST /workflows/submit`) cần chọn `templateId`, nhưng chỉ có `POST /workflows/templates` (tạo), KHÔNG có route GET nào liệt kê lại `WorkflowTemplate` đã tạo — và không có seed script nào tạo template mẫu.
- **Xử lý**: hỏi user qua `AskUserQuestion` (bỏ qua Submit hay bổ sung endpoint) — user chọn bổ sung endpoint.
- **Fix (additive, THUẦN ĐỌC)**: thêm `getAllWorkflowTemplatesService()` (`workflow.service.ts`, `find({isActive:true}).select(...).sort({name:1})`) + controller `getTemplates` + route `GET /workflows/templates` (permission `WORKFLOW_VIEW` — dùng lại, KHÔNG tạo permission mới). Không đổi bất kỳ hàm/route nào khác trong file.
- **Verification**: `npx tsc --noEmit` 0 lỗi, `npx jest` 16 suite/**97 test PASS** (từ 96, +1). HTTP verify: `GET /workflows/templates` → 200, trả về 4 template thật đã tồn tại sẵn trong DB dev (tạo thủ công trước đó, chưa từng truy xuất lại được qua API).
- Task file đầy đủ: `docs/development/tasks/DEV-028.md`.

## DEV-027 — Fix critical `validateQuery` bug (Express 5) + RBAC: IT thêm USER_VIEW/USER_VIEW_DETAIL — 2026-09-05: ✅ DONE

- **Nguồn gốc**: phát hiện khi bắt đầu code FE-03 (Users/Departments UI thật) — `GET /rbac/roles` trả 500 khi tra permission ID.
- **Bug nghiêm trọng (không kế hoạch)**: `validateQuery` middleware (`validate.middleware.ts`) gán trực tiếp `req.query = result.data` — nhưng Express **5.2.1** định nghĩa `req.query` là accessor CHỈ CÓ getter (`express/lib/request.js:217`, `defineGetter`, không có `set`) → throw `TypeError` → MỌI route dùng `validateQuery` crash 500 generic (`UNKNOWN_ERROR`). Đã verify HTTP thật TRƯỚC fix: `GET /users`, `GET /documents`, `GET /rbac/roles` đều 500 — bug hệ thống, ảnh hưởng toàn bộ list/pagination endpoint có `validateQuery` (không chỉ 1 domain).
- **Fix**: dùng `Object.defineProperty(req, "query", {value, writable:true, configurable:true, enumerable:true})` thay vì gán `=` trực tiếp (an toàn vì Express khai báo property này `configurable:true`). `validateBody`/`validateParams` không đổi (`req.body`/`req.params` không phải accessor, không bị lỗi này).
- **Test mới**: `validate.middleware.test.ts` (file trước đây CHƯA có test) — 5 test, gồm 1 test mô phỏng chính xác accessor getter-only của Express 5 để bug không tái diễn mà không bị bắt.
- **RBAC (theo yêu cầu user)**: role `IT` được cấp thêm `USER_VIEW`+`USER_VIEW_DETAIL` (chỉ xem, KHÔNG CRUD) — trước đó 0 role ngoài ADMIN có 2 permission này, khiến trang Users chỉ ADMIN dùng được. Áp dụng vào DB dev qua **API RBAC sẵn có** (`POST /rbac/roles/:id/assign-permissions`, chỉ đổi role IT), KHÔNG chạy `scripts/seed-rbac.ts` (script đó reset TOÀN BỘ mọi role, rủi ro cao hơn không cần thiết). Source `rolePermission.map.ts` cũng được cập nhật để khớp.
- **Verification**: `npx tsc --noEmit` 0 lỗi, `npx jest` 16 suite/**96 test PASS** (từ 91, +5, không regression). HTTP verify SAU fix: `GET /users`/`GET /documents`/`GET /rbac/roles` đều 200 (cùng token, cùng backend instance tự respawn qua `ts-node-dev`). IT role xác nhận có 45 permission (43 cũ + 2 mới).
- Task file đầy đủ: `docs/development/tasks/DEV-027.md`.

## DEV-026 — Backend RBAC Micro-Fix: `GET /users/me` effective permissions — 2026-09-05: ✅ DONE

- **Nguồn gốc**: blocker phát hiện trong FE-00 verification (Frontend Project Bootstrap) — `docs/frontend/tasks/FE-00.md` Mục 10.1.
- **Root cause**: `getMeService()` (`users.service.ts`) chỉ populate `role.name`, KHÔNG trả `role.isSystemRole` và KHÔNG có field permission đã tính (`extraPermissions`/`denyPermissions` chỉ ObjectId thô) — trong khi logic tính effective permission ĐÃ tồn tại sẵn (`getCachedPermissions()`/`getUserEffectivePermissions()`, dùng ở `authorizePermission.middleware.ts`), chỉ chưa từng expose ra `/users/me`.
- **Fix (additive, KHÔNG breaking)**: `getMeService()` populate thêm `role.isSystemRole` (field có sẵn ở Role model) + gọi `getCachedPermissions()` để trả thêm `permissions: string[]` (effective, đã resolve tên). `extraPermissions`/`denyPermissions` GIỮ NGUYÊN dạng ObjectId thô như cũ. REUSE 100% logic RBAC có sẵn — không viết logic tính permission mới, không tạo cache thứ hai, không special-case ADMIN.
- **OpenAPI**: thêm `Role.isSystemRole`, schema mới `MeResponseUser` (chỉ dùng cho `/users/me`, không đổi schema `User` dùng chung).
- **Test mới**: 4 test (`users.service.test.ts`, describe `getMeService`) — user không tồn tại/bị vô hiệu hoá, permission trả đúng + field cũ giữ nguyên, ADMIN không special-case.
- **Verification**: `npx tsc --noEmit` 0 lỗi, `npx jest` 15 suite/**91 test PASS** (từ 87, +4, không regression), `npm run build` PASS. HTTP verify: unauthenticated 401 KHÔNG đổi (verify request thật). Nhánh authenticated 200 (permissions[] xuất hiện đúng) **NOT VERIFIED** — thiếu tài khoản test, chủ động không tự tạo user trong DB thật.
- **FE follow-up còn lại (ngoài scope task này)**: `frontend/src/hooks/usePermission.ts` (tạo ở FE-00) vẫn stub cũ (`hasPermission()` luôn `false` cho non-ADMIN) — cần 1 FE task riêng cập nhật đọc `user.permissions` thật.
- Task file đầy đủ: `docs/development/tasks/DEV-026.md`.

## DEV-025 — API response consistency (P3, task cuối cùng roadmap) — 2026-09-02: ✅ DONE

- **ARCH-17** (LOW) — `shared/types/express.d.ts:req.user.permissions` không phản ánh vòng đời 2 giai đoạn thật (luôn `[]` ngay sau `authenticate`, chỉ đúng sau `authorizePermission`) — thêm comment giải thích rõ, KHÔNG đổi type (narrowing sẽ over-engineer cho rủi ro LOW chưa có evidence bug thật).
- **ARCH-21 RESOLVED** (LOW-MEDIUM, TOCTOU) — `excel.service.ts:importDocumentsExcel` — dò trùng lặp Proposal (`Document.findOne`) trước đây chạy TRƯỚC `withTransaction`, không atomic → 2 import đồng thời cùng dòng dữ liệu có thể tạo trùng lặp. Nay đọc lại NGAY BÊN TRONG transaction (`.session(session)`) — đúng pattern đã có sẵn cho `existingReport` trong cùng hàm. `action` (create/update) nay xác định TRONG transaction.
- **ARCH-23 RESOLVED** (LOW-MEDIUM) — `upload.controller.ts` — bọc response theo convention chung `{success, message?, data?}`: `uploadFiles`/`getFiles`/`deleteFile` thêm `success:true`; `getFileDetail` trước trả THẲNG document Mongoose (`res.json(file)`, không wrapper) nay bọc `{success:true, data:file}`.
- **ARCH-31 RESOLVED** (LOW) — `rbac.service.ts` (3 vị trí) + `users.service.ts` (1 vị trí) đổi `totalPage`→`totalPages`, khớp đa số domain khác VÀ khớp field đã document sẵn trong `openAPI.yaml` (2 domain này lệch khỏi CẢ 2 nguồn sự thật, không chỉ cosmetic).
- **Test mới**: `services/excel/__tests__/excel.service.test.ts` (3 test, cho ARCH-21 — thay đổi hành vi thật duy nhất trong task) — gồm 1 regression guard cốt lõi: `Document.findOne` phải chạy SAU `withTransaction` (theo `invocationCallOrder`) và dùng đúng session, chống ai đó vô tình đưa check ra ngoài transaction trở lại.
- **Verification**: `npx tsc --noEmit` PASSED 0 lỗi. `npx jest` 15 suite/87 test PASS (từ 14/84, không regression).
- **Task cuối cùng P3 Stage 6** — toàn bộ 25 development task (DEV-001→025) đã DONE, chỉ còn `DEV-009A` PAUSED.
- Task file đầy đủ: `docs/development/tasks/DEV-025.md`.

## DEV-024 — Cân nhắc structured logger (Observability, P3) — 2026-09-02: ✅ DONE (đánh giá, không đổi code)

- `ARCH-30` (không có structured logger, toàn bộ log qua `console.*`) — xác nhận LẠI CONFIRMED trên source hiện tại (`error.middleware.ts` tự thừa nhận trong comment "KHÔNG phải structured logger thực thụ"), không có log rotation/aggregation.
- Finding gốc tự nêu điều kiện: chỉ cấp thiết khi có **kế hoạch scale ngang nhiều instance**. Đây là quyết định nghiệp vụ/hạ tầng, không suy ra được từ source — đã hỏi qua AskUserQuestion.
- **Quyết định của người dùng**: **chưa có kế hoạch scale** → giữ nguyên `console.*`, KHÔNG thêm dependency mới (winston/pino), KHÔNG đổi code — cùng tinh thần DEV-020 (investigation-only).
- Lý do: thêm dependency khi chưa có nhu cầu thật vi phạm CLAUDE.md §11 (existing-first)/§12 (no over-engineering)/§25 (dependency phải có lý do cần thiết).
- Nếu sau này có kế hoạch scale ngang → quay lại ARCH-30 làm baseline, mở task riêng thêm `pino` tại `error.middleware.ts`/`database.events.ts`.
- Task file đầy đủ: `docs/development/tasks/DEV-024.md`.

## DEV-023 — Dọn dead code tích luỹ + hợp nhất duplicate config (P3) — 2026-09-02: ✅ DONE

- **Xoá hẳn 5 file 100% dead** (xác nhận LẠI 0 tham chiếu qua grep, không tin mù quáng danh sách cũ): `shared/errors/errorHandler.ts` (deprecated error handler cũ), `config/database/mongo.logger.ts` (registerMongoLogger không được gọi), `services/upload/upload.validator.ts` (validateFiles, đã biết dead từ DEV-017), `shared/constants/permission.descriptors.ts` (RBAC descriptor trùng lặp, comment sai), `shared/constants/workflow-docs.ts` (mồ côi sau khi xoá 2 hàm dùng nó).
- **ARCH-34 RESOLVED**: `documents.validator.ts:validateStatusTransition/validateStatusPermission` — xác nhận 0 caller, xoá (đóng đúng TODO tự ghi trong code).
- **ARCH-08/11/15 RESOLVED**: xoá ~1000 dòng code chết bị comment nguyên khối trong `workflow.service.ts` (506 dòng), `assetAssignment.service.ts` (281 dòng), `excel.service.ts` (207 dòng, đúng vùng giữa file — xác nhận code thật `listImportHistory`/`syncDepartmentFromExcel` vẫn nguyên sau khối xoá).
- **ARCH-26 RESOLVED**: hợp nhất 2 rate-limiter trùng cấu hình — xoá `authLimiter` (mount rộng `/api/auths/*`, `app.ts`), dùng `authRateLimiter` tường minh ở từng route (`auth.routes.ts`), thêm cho `/reset-password` (trước đây chỉ được bảo vệ ngầm qua limiter chung vừa gỡ).
- **QUAN TRỌNG — KHÔNG XOÁ (khác danh sách gốc REF-018)**: `middlewares/loadDocument.middleware.ts` — GIỮ LẠI vì đây chính là middleware DEV-009A (ABAC domain Document, đang PAUSED) cần dùng; `rolePermission.map.ts`/`ROLE_PERMISSIONS` — GIỮ LẠI vì DEV-021 đã xác nhận `seed-rbac.ts` (không git-track) THẬT SỰ dùng nó (finding gốc liệt kê 2 mục này là dead đã OUTDATED).
- **KHÔNG SỬA (đánh giá, không phải dead code thật)**: ARCH-02/03 (quan sát kiến trúc, không có recommendation), ARCH-35 (2 Multer config, finding tự nhận chấp nhận được), `database.ts`'s "~55 dòng" (đã lỗi thời, hiện chỉ ~20 dòng docstring, không phải code chết).
- **Verification**: `npx tsc --noEmit` PASSED 0 lỗi (xác nhận không còn tham chiếu tới 5 file đã xoá). `npx jest` 14 suite/84 test PASS — không regression.
- Task file đầy đủ (bảng verify từng mục tiêu): `docs/development/tasks/DEV-023.md`.

## DEV-022 — RBAC edge-case cleanup (P3) — 2026-09-02: ✅ DONE

- **RV02-02 RESOLVED (documentation-only, đúng recommendation gốc)**: `denyPermissions` KHÔNG có tác dụng với user role ADMIN (bypass ở `authorizePermission.middleware.ts` bước 2 chạy TRƯỚC bước 3 nơi deny logic được áp dụng). Recommendation gốc chỉ yêu cầu ghi rõ comment (không phải lỗ hổng mở rộng quyền) — thêm comment ở `user.model.ts` (field `denyPermissions`) + `authorizePermission.middleware.ts` (bước 2), không đổi logic runtime.
- **RV06-08 RESOLVED**: `assetAssignment.service.ts` (`assignAssetService`/`transferAssetService`/`returnAssetService`) nay bắt riêng `mongoose.Error.VersionError` (race condition khi 2 request cùng sửa 1 Asset gần như đồng thời) qua helper `runAssignmentTransaction()`, trả `409 Conflict` rõ nghĩa thay vì lộ xuống 500 chung. An toàn dữ liệu không đổi (Mongoose versioning vẫn hoạt động như cũ), chỉ cải thiện UX response.
- **Test tự động mới**: `permission.service.test.ts` (mới, xác nhận deny logic đúng cho user thường) + mở rộng `authorizePermission.middleware.test.ts` (ADMIN bypass bỏ qua denyPermissions) cho RV02-02; `assetAssignment.service.test.ts` (mới, 3 test: VersionError→409, lỗi khác giữ nguyên, luồng thành công) cho RV06-08.
- **Verification**: `npx tsc --noEmit` PASSED 0 lỗi. `npx jest` 14 suite/84 test PASS.
- Task file đầy đủ: `docs/development/tasks/DEV-022.md`.

## DEV-021 — Password/token policy + input validation còn thiếu (P3) — 2026-09-02: ✅ DONE

- **Task bundle 10 finding** (`SEC-01/02/03/04/09/11/12/17/22/23`) — mỗi finding VERIFY LẠI trên source hiện tại trước khi sửa (không tin mù quáng finding cũ từ Phase 09).
- **SEC-01 RESOLVED**: `changePassword()` nay thu hồi toàn bộ `RefreshToken`, cùng pattern 3 luồng đổi mật khẩu còn lại.
- **SEC-02 RESOLVED**: nâng `min(5)`→`min(8)` cho MỌI field đặt mật khẩu MỚI (`RegisterDTO`, `CreateUserDTO`, `ChangePasswordDTO.newPassword`, `ResetPasswordDTO.newPassword`) — KHÔNG đụng `LoginDTO.password`/`ChangePasswordDTO.oldPassword` (tránh khoá đăng nhập user có mật khẩu ngắn cũ). Phát hiện thêm: `resetPasswordByAdmin` trước đây KHÔNG có validate nào — thêm `ResetPasswordByAdminDTO` mới.
- **SEC-03 RESOLVED**: `server.ts` thêm fail-fast cho `JWT_SECRET`/`JWT_REFRESH_SECRET`.
- **SEC-04 RESOLVED**: `generateAccessToken()` siết chữ ký còn đúng `{id}` — phát hiện doc-comment cũ đã tuyên bố "chỉ gồm {id}" nhưng code thực tế vẫn truyền `role`/`department` ở cả `login()`/`refresh()` (comment/code không khớp). Dọn hệ quả: bỏ populate lồng `role`/`department` không cần thiết trong `refresh()`.
- **SEC-09 — OUTDATED, đã tự resolved**: `scripts/seed-rbac.ts` (không git-track) hiện đã import + dùng `ROLE_PERMISSIONS` đúng như finding đề xuất — không có gì để sửa.
- **SEC-11 RESOLVED (phần còn lại)**: validateParams đã DONE ở DEV-013; nay thêm `validateBody` cho Departments — phát hiện 2 DTO có sẵn (`departments.dto.ts`) đã LỆCH schema thật (`description`/`isActive` không tồn tại trong `department.model.ts`), sửa lại đúng trước khi wire.
- **SEC-12 RESOLVED**: thêm `DeleteDocumentsByMonthDTO`, wire vào `DELETE /delete-by-month`.
- **SEC-17/SEC-22 — HOÃN theo quyết định user** (AskUserQuestion): SEC-17 cần dependency mới (`file-type`), SEC-22 cần xác nhận hạ tầng có reverse proxy hay không (user xác nhận: không có/chưa chắc) — cả 2 để ngoài scope, không đoán bừa.
- **SEC-23 RESOLVED**: `error.middleware.ts` nhánh fallback + `upload.controller.ts:uploadFiles` không còn trả `err.message` gốc ra client khi lỗi 500 không xác định — log đầy đủ server-side, trả message generic.
- **Verification**: `npx tsc --noEmit` PASSED 0 lỗi. `npx jest` ban đầu 5 suite/40 test PASS.
- **[CẬP NHẬT cùng ngày] Bổ sung test tự động theo yêu cầu user** ("trước khi sang task khác"): 6 file test mới (`dto/auth`, `dto/users`, `dto/departments`, `dto/documents`, `shared/helpers/auth.helper`, `middlewares/error.middleware`, `src/__tests__/server.env`) + mở rộng `users.service.test.ts` (thêm describe `changePassword`) — phủ 7/8 finding đã sửa (SEC-01/02/03/04/11/12/23; SEC-09 không có gì để test vì không sửa code). `npx jest` sau bổ sung: **12 suite, 78/78 test PASS**. Chi tiết từng test/finding: `docs/development/tasks/DEV-021.md` (mục "Test tự động MỚI").
- Task file đầy đủ (bảng verify từng finding, quyết định user, evidence, bảng test mới): `docs/development/tasks/DEV-021.md`.

## DEV-020 — Điều tra + benchmark Excel batch transaction (Document import) — 2026-09-02: ✅ DONE (spike, không đổi code)

- **`IMP-027`/`ARCH-20` — ĐÃ ĐIỀU TRA, KẾT LUẬN: GIỮ NGUYÊN**: `importDocumentsExcel()` mở 1 transaction/dòng (N+1) — xác nhận LẠI đây là đánh đổi CÓ CHỦ ĐÍCH (partial-success: 1 dòng lỗi không kéo sập cả file, comment giải thích rõ trong code).
- **Benchmark THẬT** (dev DB, replica set 1 node, collection tạm KHÔNG đụng model thật, tự dọn dẹp hoàn toàn — xác nhận qua `listCollections` sau khi chạy): per-row transaction chậm hơn **~4x** so với 1 transaction/cả file, và **~100-150x** so với không dùng transaction. Ước tính ngoại suy ở `MAX_IMPORT_ROWS=5000`: per-row ~26s, 1-transaction/file ~6s, không-transaction ~0.2s (số liệu ngoại suy tuyến tính, chưa đo trực tiếp ở N=5000).
- **Quyết định của user (AskUserQuestion, 3 lựa chọn)**: chọn **giữ nguyên, KHÔNG đổi code** — lý do: đánh đổi tốc độ lấy partial-success là chủ đích đã document rõ, và import Excel không phải hot-path tần suất cao (khác `WorkflowInstance`/dashboard đã xử lý ở DEV-018).
- **KHÔNG có thay đổi code nào** — đúng chỉ định roadmap (DEV-020 chỉ điều tra) và quyết định cuối của user.
- Task file đầy đủ (kèm bảng số liệu benchmark, giới hạn benchmark, phương pháp): `docs/development/tasks/DEV-020.md`.

## DEV-019 — Chuẩn hoá `.env.example` khớp biến thực dùng — 2026-09-02: ✅ DONE

- **`IMP-026`/`ARCH-28` — RESOLVED**: `backend/.env.example` (1) gộp `CLIENT_URL` từ khai TRÙNG LẶP 2 lần còn 1 dòng, sửa comment sai ("Frontend cấu hình port" → thực tế backend dùng thật cho CORS `origin` + link email reset password, bắt buộc từ DEV-014); (2) thêm `MONGO_MAX_POOL_SIZE`/`MONGO_MIN_POOL_SIZE` (dùng thật ở `database.ts`, trước đây thiếu hoàn toàn); (3) thêm cảnh báo rõ trước `MONGO_DEBUG`/`MONGO_SLOW_MS`: `registerMongoLogger()` (đọc 2 biến này) xác nhận qua grep là dead code — KHÔNG được gọi ở đâu, set 2 biến này hiện không có tác dụng.
- **Xác nhận lại, KHÔNG cần sửa**: `JWT_EXPIRES_IN` đã comment-out đúng thực tế (biến chết thật) — không phải discrepancy.
- **KHÔNG sửa**: `registerMongoLogger()` dead code (wire lại hay dọn hẳn thuộc `DEV-023`, ngoài phạm vi DEV-019 chỉ đồng bộ tài liệu); không có script tự động kiểm đồng bộ (`TEST-019`, P3, chưa có task riêng).
- Chỉ sửa 1 file `backend/.env.example` — không đụng code TS, không đụng `.env` thật.
- **Verification**: `npx tsc --noEmit` PASSED 0 lỗi. `npx jest` 5 suite/40 test PASS (không đổi code nên không kỳ vọng khác biệt — chạy để xác nhận không có tác dụng phụ ngoài ý muốn).
- Task file đầy đủ: `docs/development/tasks/DEV-019.md`.

## DEV-018 — Performance: index WorkflowInstance/Document/Asset + sửa metric endpoint sai — 2026-09-02: ✅ DONE

- **`IMP-024`/ISS-05+RV05-08 (WorkflowInstance COLLSCAN) — RESOLVED**: thêm `workflowInstanceSchema.index({status:1, createdAt:1})` — trước đây model KHÔNG có index nào ngoài `_id`; `getPendingApprovalsForRole()` (hộp thư chờ duyệt, tần suất cao) filter `status:"pending"` + sort `createdAt` COLLSCAN toàn bộ collection. Ghép `createdAt` vào cùng index (không chỉ `{status:1}` như khuyến nghị tối thiểu gốc) để phục vụ cả `$match` lẫn `sort`.
- **`IMP-024`/PERF-03+RV07-02 (Document/Asset thiếu index isActive) — RESOLVED**: thêm `{isActive:1, deletedAt:1, createdAt:-1}` cho CẢ `Document` (đã biết từ Phase 10) VÀ `Asset` (mở rộng phạm vi mới RV07-02) — `dashboard.service.ts`/`assetDashboard.service.ts` lọc `{isActive:true, deletedAt:null}` ở 8+ vị trí, trước đây không index nào chứa 2 field này.
- **`IMP-025`/RV11-02 (endpoint metric gộp nhầm domain) — RESOLVED**: `performance.middleware.ts` — `endpoint: req.route?.path || req.originalUrl` (thiếu `req.baseUrl`, hành vi CHUẨN của Express nhưng gộp lẫn hàng chục domain dùng chung pattern phổ biến VD `"/:id"` vào cùng 1 nhóm thống kê) → sửa thành `${req.baseUrl}${req.route.path}` khi route khớp, giữ fallback `req.originalUrl` khi không khớp.
- **Lưu ý deploy**: dữ liệu `ApiPerformance` cũ (trước deploy) vẫn giữ format `endpoint` thiếu `baseUrl` cho tới khi TTL 30 ngày tự xoá — không migrate ngược (không cần thiết).
- **KHÔNG làm**: chưa chạy `explain("executionStats")` xác nhận IXSCAN thật trên MongoDB (cần dữ liệu đủ lớn + kết nối DB thật) — chỉ xác nhận đúng shape truy vấn bằng code review.
- **Verification**: `npx tsc --noEmit` PASSED 0 lỗi. `npx jest` 5 suite/40 test PASS.
- Task file đầy đủ: `docs/development/tasks/DEV-018.md`.

## DEV-017 — Nhận diện riêng lỗi Multer trong error handler — 2026-09-01: ✅ DONE

- **`IMP-023`/`MEDIUM-13`(RV08-01) — RESOLVED**: `error.middleware.ts` thêm nhánh `err instanceof multer.MulterError` → 400 + message tiếng Việt (map 8 `ErrorCode`). Phát hiện thêm: lỗi sai ĐỊNH DẠNG file (ném từ `fileFilter` ở `uploadExcel`/`createUploader()`) KHÔNG phải instance `MulterError` (hành vi đã biết của multer — lỗi fileFilter không được wrap lại) → sửa riêng 2 nơi ném lỗi dùng `ApiError.badRequest` thay vì `Error` thô, được nhánh `ApiError` (đã có sẵn) xử lý đúng 400.
- **KHÔNG sửa**: `upload.validator.ts:validateFiles()` — xác nhận dead code (không gọi ở đâu), ngoài phạm vi thực tế của finding.
- **Verification**: `npx tsc --noEmit` PASSED 0 lỗi. `npx jest` 5 suite/40 test PASS (không suite nào test error.middleware.ts/upload middleware).
- Task file đầy đủ: `docs/development/tasks/DEV-017.md`.

## DEV-016 — Data integrity còn lại (soft-delete Document vs Workflow, Department validate, disable User↔Asset) — 2026-09-01: ✅ DONE

- **`IMP-022`/`MEDIUM-11`(RV05-06)/`MEDIUM-12`(RV16-02)/`RV16-03` — RESOLVED**: (1) `deleteDocumentService()` chặn soft-delete nếu `workflowStatus==="pending"` (quyết định người dùng: chặn, không tự động cancel WorkflowInstance); (2) `users.service.ts:update()` validate `Department` dựa trên `effectiveRole` (role mới nếu đổi, hoặc role hiện tại của user nếu không đổi) thay vì chỉ check khi `role` có trong payload — đóng bất đối xứng với `Role` (luôn validate); (3) `disable()` chặn nếu còn `Asset.exists({assignedTo:id, isActive:true})` (quyết định người dùng: chặn, không chỉ ghi nhận).
- **Business rule đã hỏi và xác nhận với người dùng** (2 câu, cả 2 finding gốc tự đánh dấu UNKNOWN): MEDIUM-11 chọn chặn (không tự cancel workflow); RV16-03 chọn chặn (không chỉ ghi nhận). MEDIUM-12 xử lý thẳng không cần hỏi (bug rõ ràng, bất đối xứng với Role validate).
- **KHÔNG sửa**: `deleteDocumentsByMonthService` (batch delete) — chỉ fix đơn lẻ theo đúng phạm vi RV05-06; DTO/controller/route/model/OpenAPI.
- **Verification**: `npx tsc --noEmit` PASSED 0 lỗi. `npx jest` 5 suite/40 test PASS — không suite nào test `update()`/`disable()`/`deleteDocumentService`, không xác nhận hành vi 3 check mới bằng automated test.
- Task file đầy đủ: `docs/development/tasks/DEV-016.md`.

## DEV-015 — Injection/output hardening (CSV formula, path traversal, HTML email) — 2026-09-01: ✅ DONE

- **`IMP-021`/`MEDIUM-07`/`MEDIUM-08`/`MEDIUM-10` — RESOLVED**: (1) `escapeCsvField()` (`userAudits.service.ts`) thêm prefix `'` cho field bắt đầu bằng `=`/`+`/`-`/`@`/tab, trước quy tắc quoting RFC 4180 cũ; (2) `upload.middleware.ts:storage.filename` dùng `path.basename(file.originalname)` trước khi ghép — đóng đồng thời `POST /api/upload` VÀ `certificateUploader` (Calibration, dùng chung `storage`); (3) file MỚI `shared/utils/html.util.ts:escapeHtml()` (không thêm dependency ngoài), áp dụng cho `notification.service.ts:sendEmailForNotification` (escape `message`) và `passwordReset.template.ts` (escape `fullName` cho bản HTML, giữ nguyên cho bản text thuần qua biến `greetingText` riêng).
- **KHÔNG sửa**: DTO, controller, route, model, OpenAPI — không đổi API contract.
- **Verification**: `npx tsc --noEmit` PASSED 0 lỗi. `npx jest` 5 suite/40 test PASS (không suite nào test riêng 3 khu vực này). Chưa test HTTP/SMTP thật.
- Task file đầy đủ: `docs/development/tasks/DEV-015.md`.

## DEV-014 — Auth hardening lớp 2 (refresh token hash, jwt.verify try/catch, CORS fail-fast) — 2026-09-01: ✅ DONE

- **`IMP-020`/`MEDIUM-05`/`MEDIUM-06`/`MEDIUM-09` — RESOLVED**: (1) `RefreshToken.token` giờ lưu HASH SHA-256 (dùng lại `hashResetToken()` đã có cho `PasswordResetToken` — đổi doc-comment, không đổi implementation/tên hàm) thay vì plaintext, ở cả 3 chỗ (`login` create, `refresh` findOne, `logout` findOneAndUpdate); (2) `refresh()` bọc `jwt.verify()` trong try/catch, map lỗi về `ApiError.unauthorized` (401) thay vì rơi 500 lộ message thư viện; (3) `server.ts` thêm fail-fast `if (!process.env.CLIENT_URL) throw new Error(...)`, cùng pattern PORT/MONGO_URI đã có — `app.ts` không đổi (fail-fast đảm bảo nó không bao giờ chạy thiếu biến này).
- **⚠️ Deployment impact quan trọng**: mọi `RefreshToken` cũ (plaintext, tạo trước khi deploy fix) sẽ KHÔNG còn khớp sau khi hash được áp dụng — mọi user đang login sẽ bị buộc đăng nhập lại ở lần `refresh()` tiếp theo sau deploy. Tác dụng phụ 1 lần, chấp nhận được, đã ghi rõ trong task doc.
- **UNKNOWN quan trọng chưa xác minh**: production ENV đã có `CLIENT_URL` hay chưa — nếu chưa, deploy sẽ làm server production crash ngay lúc khởi động (dev đã xác nhận có `CLIENT_URL` trong `.env`, an toàn).
- **KHÔNG sửa**: DTO, controller, route, model, `app.ts`.
- **Verification**: `npx tsc --noEmit` PASSED 0 lỗi. `npx jest` 5 suite/40 test PASS (test hiện có không assert giá trị field `token` cụ thể nên không cần sửa, nhưng cũng KHÔNG xác nhận hành vi hash/401/fail-fast mới — chưa có test riêng).
- Task file đầy đủ: `docs/development/tasks/DEV-014.md`.

## DEV-013 — RBAC/API contract hygiene (permission string, type-safety, validateParams) — 2026-09-01: ✅ DONE

- **`IMP-019`/`MEDIUM-04`/`ARCH-25`/`ARCH-29` — RESOLVED**: sửa đúng 3 permission string sai catalog (`USER_READ→USER_VIEW`, `USER_DETAIL→USER_VIEW_DETAIL`, `DOCUMENT_DETAIL→DOCUMENT_VIEW_DETAIL` ở `user.routes.ts`/`document.route.ts`, đồng bộ `openAPI.yaml`); nâng type-safety `authorizePermission()` dùng lại type `Permission` có sẵn (`permission.constant.ts:152`) thay vì `string` chung chung — chạy `tsc --noEmit` xác nhận **0 lỗi khác** ngoài 3 chỗ đã biết (không còn permission string nào lệch catalog trong toàn bộ codebase); thêm `validateParams(IdParamDTO)` nhất quán ở `rbac.routes.ts` (6 vị trí PUT/DELETE/assign-permissions) và `department.routes.ts` (3 route, trước đó không có gì).
- **Phát hiện mới trong lúc fix**: sau khi sửa permission string, `GET /api/users`/`GET /api/users/:id` **vẫn 403 với mọi non-ADMIN** — không role nào hiện giữ `USER_VIEW`/`USER_VIEW_DETAIL` trong `rolePermission.map.ts`. Đây là business decision chưa xác nhận (ADMIN-only chủ đích hay thiếu sót) — ghi nhận KHÔNG tự gán quyền, ngoài scope roadmap chỉ định cho DEV-013.
- **KHÔNG sửa**: DTO, controller, service, model, `permission.constant.ts`, `rolePermission.map.ts`.
- Phải sửa kèm `authorizePermission.middleware.test.ts` (dùng permission string giả để test, bị chặn bởi type mới) — chỉ đổi permission string dùng trong test, không đổi assertion/logic.
- **Verification**: `npx tsc --noEmit` PASSED 0 lỗi (2 lần). `npx jest` 5 suite/40 test PASS. Chưa test qua HTTP thật.
- Task file đầy đủ: `docs/development/tasks/DEV-013.md`.

## DEV-009A — Kích hoạt ABAC domain Document (GET /:id) — 2026-09-01: ⏸️ PAUSED (user chủ động tạm dừng, chuyển sang P2) → **✅ RESUMED và DONE 2026-09-06, xem entry đầu file (trước DEV-028) để biết chi tiết đầy đủ**

- Con của DEV-009 (Phương án A). Scope: chỉ `GET /api/documents/:id`, 4 file (`document.route.ts`, `rolePermission.map.ts`, `policy.model.ts`, `seed-rbac.ts`).
- **3 quyết định business rule đã xác nhận với người dùng qua AskUserQuestion** (không tự suy đoán): (1) sửa luôn bug permission string có sẵn `"DOCUMENT_DETAIL"` (không tồn tại trong catalog, đúng phải `DOCUMENT_VIEW_DETAIL`) — hiện khiến `GET /:id` LUÔN 403 với non-ADMIN; (2) bỏ hẳn `DOCUMENT_VIEW_DETAIL` khỏi role thường (cơ chế ABAC hiện tại là "cộng thêm" không phải "hạn chế" — không thể vừa giữ permission rộng vừa dùng Policy thu hẹp); (3) áp dụng rule "chỉ xem cùng phòng ban" cho **cả 5 role** kể cả 3 role duyệt (`TRUONG_KHOA`/`DIEU_DUONG_TRUONG`/`BAN_GIAM_DOC`) — đã CẢNH BÁO rủi ro có thể ảnh hưởng luồng duyệt liên phòng ban (chưa xác nhận được `BAN_GIAM_DOC` có cần duyệt toàn viện hay không), người dùng vẫn chọn áp dụng cả 5 role.
- Đã xác nhận: chạy `seed-rbac.ts` trên DB dev NGAY SAU khi code xong (để test thủ công có ý nghĩa).
- **Status thật (2026-09-01, cập nhật lần 2)**: user chủ động yêu cầu TẠM DỪNG DEV-009A ("để sau này phân tích làm sau"), chuyển hẳn sang làm P2 trước — KHÔNG phải approve hay reject, chỉ hoãn thời điểm. CHƯA có dòng code nào được sửa. Khi quay lại: đọc `docs/development/tasks/DEV-009A.md` (đã có đủ scope + 3 quyết định business rule đã xác nhận), không cần hỏi lại.
- Task file đầy đủ: `docs/development/tasks/DEV-009A.md`.

## DEV-012 — Referential integrity sweep (Department xoá, Asset hard-delete) — 2026-09-01: ✅ DONE

- **`IMP-017`/`H-12a`/`ARCH-05`/`RV04-01` (orphan reference khi xoá Department) — RESOLVED**: `deleteDepartmentService` trước đây chỉ check `User`/`Document`, thiếu check `Asset` dù `Asset.department` là field bắt buộc. Đã thêm `Asset.exists({ department: id })` cùng pattern với 2 check hiện có.
- **`IMP-018`/`H-12b`/`ARCH-05`/`MEDIUM-03`/`RV16-01` (mất dữ liệu kiểm định thiết bị y tế không thể khôi phục) — RESOLVED**: `hardDeleteAssetService` trước đây chỉ check `asset.isActive`, thiếu check `MedicalDeviceProfile` (không có cascade, xoá cứng Asset là mất vĩnh viễn hồ sơ kiểm định/hiệu chuẩn). Đã thêm `MedicalDeviceProfile.exists({ asset: id })`.
- **Business rule đã hỏi và xác nhận với người dùng**: `AssetAssignmentHistory` (log bất biến, append-only) **KHÔNG** được dùng làm điều kiện chặn xoá Department — chỉ check reference HIỆN TẠI (`Asset.department`), tránh khoá cứng không bao giờ xoá được Department từng có phát sinh luân chuyển tài sản.
- **OpenAPI đồng bộ**: thêm response `400` (trước đó thiếu hoàn toàn ở cả 2 endpoint dù đã có sẵn nhánh 400 khác từ trước — gap pre-existing) cho `DELETE /api/departments/{id}` và `DELETE /api/assets/{id}/permanent`, kèm mô tả điều kiện chặn.
- **KHÔNG sửa DTO/route/controller/model nào** — chỉ 2 service, giữ nguyên chữ ký hàm và API contract shape (chỉ thêm nhánh lỗi 400 mới).
- **Verification**: `npx tsc --noEmit` PASSED (0 lỗi). `npx jest` 5 suite/40 test PASS — **không có unit test nào cho `departments.service.ts`/`asset.service.ts`** trong 5 suite hiện có, PASS chỉ xác nhận không regression nơi khác, KHÔNG xác nhận hành vi 2 check mới. Chưa test qua HTTP thật.
- Task file đầy đủ: `docs/development/tasks/DEV-012.md`.

## DEV-011 — Định nghĩa + gắn quyền PERFORMANCE_VIEW — 2026-09-01: ✅ DONE

- **`IMP-016`/`H-10`/`SEC-37`/`RV11-01` (0 authorization ở Performance dashboard) — RESOLVED**: `GET /api/performances/dashboard` trước đây chỉ có `authenticate` — không có `authorizePermission` (route) lẫn check role nào trong controller, dù comment cũ tuyên bố "check ở controller" (KHÔNG BAO GIỜ implement). Định nghĩa permission mới `PERFORMANCE_VIEW` (`permission.constant.ts`), chỉ gán cho ADMIN (đúng ý định gốc, không mở rộng ngoài evidence), bật lại `authorizePermission("PERFORMANCE_VIEW")` ở route.
- **Không cần migration/seed DB** — ADMIN bypass permission check ở tầng middleware (`role.isSystemRole===true || role.name==="ADMIN"`), fix có hiệu lực ngay cho ADMIN không cần Permission record tồn tại trong DB.
- **Verification**: `npx tsc --noEmit` PASSED (0 lỗi). `npx jest` 5 suite/40 test PASS. Đã tự chạy self-check của `permission.descriptors.ts` — xác nhận entry mới (`PERFORMANCE_VIEW`) đúng, phát hiện thêm 1 mismatch CÓ SẴN TỪ TRƯỚC (`USER_ASSIGN_ROLE`, từ TASK-002) không do task này gây ra.
- **Finding ngoài scope, ĐÃ GHI NHẬN KHÔNG SỬA**: `permission.descriptors.ts` hiện KHÔNG được import/dùng ở bất kỳ đâu (kể cả `seed-rbac.ts` — dùng map mô tả riêng), mồ côi dù comment đầu file tuyên bố "bắt buộc" — đã biết là `ARCH-14`, có task riêng (`DEV-023`). `USER_ASSIGN_ROLE` thiếu descriptor cũng thuộc nhóm này.
- **Lưu ý cấu trúc**: `backend/scripts/` KHÔNG được git track (`.gitignore`) — thay đổi ở `seed-rbac.ts` (thêm mô tả `PERFORMANCE_VIEW`) có thật trên đĩa nhưng không xuất hiện trong `git diff`.
- Task file đầy đủ: `docs/development/tasks/DEV-011.md`.

## DEV-008 — Khôi phục validateQuery 13 route + đóng NoSQL injection query — 2026-09-01: ✅ DONE

- **`IMP-011`/`H-14`+`H-04`/`ARCH-27`/`SEC-13`/ISS-04/`SEC-10` (pagination bug + NoSQL injection, 7 domain) — RESOLVED**: bỏ comment `validateQuery(...)` ở đúng 13 route (Documents/Users/UserAudit×3/Assets×2/AssetCategory/Notifications/RBAC×3/Workflow) — toàn bộ 13 DTO tương ứng ĐÃ tồn tại sẵn, viết kỹ, khớp chính xác field mà service dùng; chỉ chưa bao giờ được wire vào route (comment ở nhiều file tuyên bố "đã sửa" nhưng code thật vẫn comment `//`).
- **`IMP-012`/`H-04`/`SEC-13` (NoSQL injection qua query) — RESOLVED bởi CÙNG 1 fix**: không service nào spread raw query vào Mongo filter (đã whitelist ở tầng service từ trước qua destructure field cụ thể) — lỗ hổng thực tế là field CHƯA ép kiểu (client gửi `?role[$ne]=null` lọt filter dạng object); `validateQuery` (Zod `z.string()`/`objectId()`) chặn đúng vector này.
- **KHÔNG sửa DTO/service nào** — chỉ 13 dòng bỏ comment, đúng 7 file route.
- **API breaking change (đúng cảnh báo roadmap)**: `sortBy` ngoài whitelist / `limit` vượt cap / `page` không phải số / field sai type → nay `400` thay vì âm thầm sai/lỗi ngầm như trước.
- **Verification**: `npx tsc --noEmit` PASSED (0 lỗi — xác nhận type đã khớp sẵn). `npx jest` 5 suite/40 test PASS — **KHÔNG có integration test qua HTTP/route thật** cho 13 route này, chỉ unit test tầng service; PASS chỉ xác nhận không regression ở service layer, KHÔNG xác nhận hành vi middleware khi request thật đi qua.
- **Finding ngoài scope, ĐÃ GHI NHẬN KHÔNG SỬA**: `user.routes.ts:46` dùng `authorizePermission("USER_READ")` — không khớp `USER_VIEW` đã định nghĩa trong `permission.constant.ts` — thuộc `IMP-019`/`DEV-013` (đã có task riêng).
- Task file đầy đủ: `docs/development/tasks/DEV-008.md`.

## Context init — 2026-08-30

Thực hiện theo `CLAUDE.md`/`SKILL.md` §39 (New Session Protocol) trước khi bắt đầu POST-ANALYSIS DEVELOPMENT STAGE lần đầu:

- Đọc CLAUDE.md, SKILL.md, PROJECT_MEMORY, SESSION_HANDOFF.md — không có task nào đang chạy.
- Xác minh lại source hiện tại so với 13-phase baseline: 2 conflict được tìm thấy và đã sửa ở trên (seed scripts thực ra có tồn tại trong `backend/scripts/` nhưng thiếu npm alias; cấu hình Jest hiện không có dependency Jest thực tế).
- Cấu trúc model (22 file)/route (15 file) khớp chính xác với con số Memory đã ghi — không phát hiện sai lệch khác trong phạm vi kiểm tra.
- Git: branch `main`, sạch, chỉ có untracked knowledge-base mới (`.claude/`, `CLAUDE.md`, `docs/`, `backend/CLAUDE.md` rỗng) — chưa commit.
- Không có task phát triển cụ thể nào được giao ở phiên này. Người dùng đã chọn hoàn thành việc đồng bộ Memory này trước khi giao task tiếp theo.
