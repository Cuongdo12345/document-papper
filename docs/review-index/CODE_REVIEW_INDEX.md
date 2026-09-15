# CODE REVIEW INDEX

> Chỉ mục toàn bộ code review theo module (REVIEW-00 → REVIEW-16). Khác với 13-phase historical analysis (`docs/0X_*.md`) — review này đi sâu từng module theo source hiện tại, thực hiện TUẦN TỰ khi có yêu cầu, không tự động chạy hàng loạt.
>
> Nguồn xác định module: cấu trúc thực tế `backend/src/{routes,controllers,services,models}/` (11 domain controller/service + `documents` tách riêng phần Workflow + `assets` tách riêng Medical Device/Calibration) và `backend/src/{middlewares,shared,config}/` (foundation, đã review ở REVIEW-00).
>
> KHÔNG review/sửa source code khi tạo/cập nhật riêng file index này.

## Quy ước

- **Priority**: CRITICAL / HIGH / MEDIUM / LOW — dựa trên mức độ rủi ro đã biết từ 13-phase analysis (`docs/12_ISSUES_AND_RISKS.md`) và mức độ trung tâm của module trong kiến trúc (Phase 02 §7 Module Dependencies), không phải suy đoán.
- **Status**: TODO / IN_PROGRESS / DONE / BLOCKED.
- **Output document**: `docs/module-reviews/<ID>_<TÊN>.md` — chỉ tạo khi review đó thực sự chạy.
- ID finding trong mỗi review dùng prefix riêng `RVxx-YY` (xem `CODE_REVIEW_SUMMARY.md`).

## Bảng chỉ mục

| ID | Module | Domain source chính | Priority | Status | Output document |
|---|---|---|---|---|---|
| REVIEW-00 | Foundation / Cross-cutting | `server.ts`, `app.ts`, `middlewares/`, `shared/`, `config/` | CRITICAL | ✅ DONE | `docs/module-reviews/00_FOUNDATION_CODE_REVIEW.md` |
| REVIEW-01 | Authentication | `routes\|controllers\|services/auth/`, `models/auth/` | CRITICAL | ✅ DONE | `docs/module-reviews/01_AUTH_CODE_REVIEW.md` |
| REVIEW-02 | RBAC (Role/Permission/Policy/ABAC) | `routes\|controllers\|services/rbac/`, `models/rbac/` | CRITICAL | ✅ DONE | `docs/module-reviews/02_RBAC_CODE_REVIEW.md` |
| REVIEW-03 | Users & User Audit | `routes\|controllers\|services/users/`, `models/users/` | CRITICAL | ✅ DONE | `docs/module-reviews/03_USERS_CODE_REVIEW.md` |
| REVIEW-04 | Departments | `routes\|controllers\|services/departments/`, `models/departments/` | MEDIUM | ✅ DONE | `docs/module-reviews/04_DEPARTMENTS_CODE_REVIEW.md` |
| REVIEW-05 | Documents (CRUD core) + Workflow (duyệt đa cấp) — GỘP CHUNG khi thực thi | `routes\|controllers\|services/documents/` (kể cả `workflow.routes.ts`/`workflow.service.ts`), `models/documents/{document,workflowTemplate,workflowInstance}.model.ts` | HIGH | ✅ DONE | `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` |
| REVIEW-06 | Assets — TOÀN BỘ (core + Category + Assignment History + Medical Devices + Calibration) — GỘP CHUNG khi thực thi | `routes\|controllers\|services/assets/` (kể cả `assetDevice/`, `medicalDevice/`), `models/assets/*.model.ts` | MEDIUM | ✅ DONE | `docs/module-reviews/06_ASSETS_CODE_REVIEW.md` |
| REVIEW-07 | Dashboard | `routes\|controllers\|services/dashboard/` | LOW | ✅ DONE | `docs/module-reviews/07_DASHBOARD_CODE_REVIEW.md` |
| REVIEW-08 | Excel Export/Import & Import Audit | `routes\|controllers\|services/excel/`, `models/importAudit/` | MEDIUM | ✅ DONE | `docs/module-reviews/08_IMPORT_EXPORT_CODE_REVIEW.md` |
| REVIEW-09 | Upload (file quản lý chung) | `routes\|controllers\|services/upload/`, `models/uploadFiles/` | MEDIUM | ✅ DONE | `docs/module-reviews/09_UPLOAD_CODE_REVIEW.md` |
| REVIEW-10 | Notifications | `routes\|controllers\|services/notifications/`, `models/notifications/` | LOW | ✅ DONE | `docs/module-reviews/10_NOTIFICATION_CODE_REVIEW.md` |
| REVIEW-11 | Performance monitoring | `routes\|controllers\|services/performances/`, `models/apiPerformance/`, `shared/performance/` | LOW | ✅ DONE | `docs/module-reviews/11_PERFORMANCE_CODE_REVIEW.md` |
| REVIEW-12 | Database cross-domain (indexes, relationships, transactions) | toàn bộ `models/`, `shared/utils/withTransaction.ts` | HIGH | ✅ DONE | `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md` (thực thi dưới nhãn "REVIEW-16", tên file khác kế hoạch gốc — xem ghi chú bên dưới) |
| REVIEW-13 | API contract & OpenAPI consistency | `src/docs/openAPI.yaml` vs toàn bộ `routes/` | MEDIUM → **HIGH** (nâng theo finding thực tế) | ✅ DONE | `docs/module-reviews/15_API_CONTRACT_REVIEW.md` (tên file khác kế hoạch gốc — xem ghi chú bên dưới) |
| REVIEW-14 | Config / Dependencies / Build (Scripts, package.json, tsconfig, .env.example, deployment readiness) | `backend/package.json`, `backend/package-lock.json`, `backend/tsconfig.json`, `backend/server.ts`, `backend/src/config/`, `backend/scripts/`, `backend/.env.example` | LOW→**HIGH** (nâng theo finding thực tế — xem output document) | ✅ DONE | `docs/module-reviews/14_CONFIG_CODE_REVIEW.md` |
| REVIEW-15 | Cron / Background Jobs — ad-hoc, NGOÀI kế hoạch gốc 15-review (được yêu cầu riêng, không nằm trong REVIEW-00→14) | `backend/shared/cron/`, `services/assets/assetDevice/assetAlerts.service.ts`, `services/assets/medicalDevice/medicalDeviceAlerts.service.ts`, điểm gọi `registerCronJobs()` ở `backend/server.ts` | MEDIUM | ✅ DONE | `docs/module-reviews/12_CRON_CODE_REVIEW.md` |
| REVIEW-16 | Shared library (cache/constants/errors/helpers/performance/types/utils) — ad-hoc, NGOÀI kế hoạch gốc 15-review (được yêu cầu riêng) | `backend/src/shared/{cache,constants,errors,helpers,performance,types,utils}/` | MEDIUM | ✅ DONE | `docs/module-reviews/13_SHARED_CODE_REVIEW.md` |

> ⚠️ **Lưu ý trùng số file**: output document của REVIEW-15 (ad-hoc, mục dưới) có tên file bắt đầu bằng `12_` (`12_CRON_CODE_REVIEW.md`) vì được đặt tên tại thời điểm yêu cầu review dùng nhãn "REVIEW-12 — CRON" — nhãn đó KHÔNG khớp với REVIEW-12 trong bảng trên (Database cross-domain, vẫn TODO, chưa chạy, chưa có output document nào). Tương tự, output document của REVIEW-16 (ad-hoc, mục dưới) có tên file bắt đầu bằng `13_` (`13_SHARED_CODE_REVIEW.md`) — KHÔNG khớp REVIEW-13 trong bảng trên. Cả 2 đều thuần là trùng tên file, KHÔNG phải cùng 1 review — ID chính thức trong index này lần lượt là **REVIEW-15** (Cron) và **REVIEW-16** (Shared). REVIEW-12 (Database cross-domain) vẫn còn nguyên trạng TODO, sẽ tạo `12_DATABASE_CROSS_DOMAIN_CODE_REVIEW.md` khi thực hiện. Domain Cron trước đây đã được chạm sơ bộ trong REVIEW-06 (Assets) qua finding `RV06-07` (performance) — REVIEW-15 đào sâu toàn diện hơn (scheduling/idempotency/retry/concurrency/transaction/restart/timezone), không trùng lặp nội dung. Domain Shared (đúng nghĩa `shared/`) trước đây chỉ được chạm SƠ BỘ ở REVIEW-00 (Foundation, phạm vi rộng hơn gồm cả `middlewares/`/`config/`) — REVIEW-16 đào sâu toàn bộ 24 file trong `shared/`, không trùng lặp nội dung REVIEW-00.
>
> ⚠️ **REVIEW-12 (Database cross-domain) — ĐÃ CHẠY dưới nhãn "REVIEW-16"**: nội dung đúng y hệt mô tả gốc "Database cross-domain (indexes, relationships, transactions)", nhưng được yêu cầu dưới nhãn "REVIEW-16 — DATABASE CROSS-DOMAIN" và output file được chỉ định tường minh là `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md` (không theo quy ước đặt tên `12_DATABASE_CROSS_DOMAIN_CODE_REVIEW.md` đã ghi trong kế hoạch gốc, và không trùng nội dung với REVIEW-15/REVIEW-16 ad-hoc đã ghi ở trên — 3 nhãn "REVIEW-16" khác nhau đã từng xuất hiện xuyên suốt lịch sử review: 1 lần cho Shared library, 1 lần (đây) cho Database cross-domain; không gây nhầm lẫn nội dung vì mỗi lần đều có output document riêng, chỉ trùng CÁCH ĐẶT TÊN NHÃN tại thời điểm yêu cầu). Vì đây LÀ REVIEW-12 thật, bảng trên đã cập nhật Status = DONE ngay tại dòng REVIEW-12, trỏ tới file thật `16_DATABASE_CROSS_DOMAIN_REVIEW.md`.
>
> ⚠️ **REVIEW-13 (API contract & OpenAPI consistency) — KHÁC với 2 trường hợp trên**: review này ĐÃ THỰC SỰ CHẠY (nội dung đúng y hệt mô tả gốc "API contract & OpenAPI consistency | openAPI.yaml vs routes/"), nhưng được yêu cầu dưới nhãn "REVIEW-15 — API CONTRACT" và output file được chỉ định tường minh là `docs/module-reviews/15_API_CONTRACT_REVIEW.md` (không theo quy ước đặt tên `13_API_CONTRACT_CODE_REVIEW.md` đã ghi trong kế hoạch gốc). Vì đây LÀ REVIEW-13 thật (không phải review khác trùng số), bảng trên đã cập nhật Status = DONE ngay tại dòng REVIEW-13, trỏ tới file thật `15_API_CONTRACT_REVIEW.md` — không tạo thêm dòng REVIEW-17 cho trường hợp này.

> ⚠️ **Đổi số thứ tự so với kế hoạch gốc**: khi thực thi, REVIEW-05 gộp luôn Workflow (kế hoạch gốc tách REVIEW-06 riêng), REVIEW-06 gộp luôn Medical Devices/Calibration (kế hoạch gốc tách REVIEW-08 riêng) — 2 domain nhỏ (Workflow, Medical Devices/Calibration) do PHỤ THUỘC CHẶT vào domain cha (Documents, Assets) nên review cùng lúc cho có ngữ cảnh đầy đủ, không tách rời. Vì vậy REVIEW-07→09 (Dashboard/Excel/Upload) bị lùi số so với kế hoạch gốc (vốn đánh số 09/10/11), và REVIEW-12→16 gốc dồn lại thành REVIEW-10→14. KHÔNG có domain nào bị bỏ sót — chỉ đổi số thứ tự.

## Trạng thái tổng quan

- Tổng số review theo kế hoạch gốc: **15** (REVIEW-00 → REVIEW-14, đã gộp Workflow vào REVIEW-05 và Medical Devices/Calibration vào REVIEW-06 — xem ghi chú đổi số ở trên).
- Đã hoàn thành trong kế hoạch gốc: **15/15** — REVIEW-00 → REVIEW-14 đều DONE (REVIEW-12 Database cross-domain vừa hoàn thành, chạy dưới nhãn "REVIEW-16", output `16_DATABASE_CROSS_DOMAIN_REVIEW.md` — xem ghi chú ở trên).
- Ngoài kế hoạch gốc: **REVIEW-15 (Cron/Background Jobs)** ✅ DONE, **REVIEW-16-ad-hoc (Shared library)** ✅ DONE — cả 2 chạy theo yêu cầu riêng, xem ghi chú trùng số file ở trên.
- ⚠️ **REVIEW-14 phát hiện finding HIGH nghiêm trọng** ảnh hưởng khả năng build/deploy — xem `docs/00_PROJECT_MEMORY.md` và mục 0 (Tóm tắt điều hành) của `docs/module-reviews/14_CONFIG_CODE_REVIEW.md`.
- ⚠️ **REVIEW-13 phát hiện finding nghiêm trọng về Authorization** (3 chuỗi permission dùng ở route không tồn tại trong catalog `permission.constant.ts` — `USER_READ`, `USER_DETAIL`, `DOCUMENT_DETAIL`) — xem `docs/00_PROJECT_MEMORY.md` và mục 0/6.1 của `docs/module-reviews/15_API_CONTRACT_REVIEW.md`.
- ⚠️ **REVIEW-12 (Database cross-domain) phát hiện finding HIGH mới**: hard-delete Asset để lại `MedicalDeviceProfile`/`CalibrationRecord` mồ côi vĩnh viễn, không có bất kỳ service nào xoá được `MedicalDeviceProfile` — xem `docs/00_PROJECT_MEMORY.md` và mục B/RV16-01 của `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md`.

## Nguyên tắc thực hiện (nhắc lại theo CLAUDE.md/SKILL.md)

- Mỗi review chỉ chạy khi có yêu cầu tường minh, theo đúng thứ tự hoặc module cụ thể được chỉ định.
- Mỗi review: KHÔNG sửa code, KHÔNG chạy lại Phase 01→13, KHÔNG refactor.
- Sau mỗi review: cập nhật `Status` + `Output document` trong bảng trên, cập nhật `docs/review-index/CODE_REVIEW_SUMMARY.md`, cập nhật `docs/00_PROJECT_MEMORY.md` nếu có finding quan trọng (CRITICAL/HIGH).
