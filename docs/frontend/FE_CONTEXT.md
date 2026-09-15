# FE CONTEXT — Entry Point cho Frontend Development

> Đọc file này ĐẦU TIÊN ở mỗi FE task. Ngắn gọn có chủ đích — chi tiết đầy đủ nằm ở các file liên kết cuối mỗi mục, KHÔNG copy lại ở đây.

## 1. Project overview

"Document Papper" — hệ thống quản lý tài liệu + tài sản/thiết bị y tế nội bộ (bệnh viện): đề xuất/biên bản qua workflow duyệt đa cấp, quản lý vòng đời tài sản (cấp phát/luân chuyển/kiểm định), RBAC (+ABAC chưa hoạt động runtime), dashboard/KPI.

## 2. Backend architecture summary

Node.js/Express/TypeScript, MongoDB/Mongoose, monolith layered theo domain (routes→middlewares→controllers→services→models). **25/25 development task đã DONE**, kết luận cuối: DEVELOPMENT COMPLETE WITH OPEN RISKS (`docs/30_DEVELOPMENT_COMPLETION_AUDIT.md`). Backend **KHÔNG được sửa** trong bất kỳ FE task nào trừ khi user yêu cầu rõ ràng.

## 3. Frontend architecture

React 18 + Vite + TypeScript (đã chốt). React Query + Zustand + React Router + Axios (đề xuất). Chi tiết layer/thư mục: `FE_ARCHITECTURE.md`.

## 4. API contract source

`backend/src/docs/openAPI.yaml` là contract chính thức, đã đối chiếu với source thật — không phát hiện conflict lớn ở lần cross-check này (KHÔNG có nghĩa là 100% mọi field đã được đối chiếu byte-by-byte). Diễn giải FE-friendly: `API_REFERENCE.md`.

## 5. Authentication

JWT thuần (không cookie), `accessToken` trả JSON body 8h, `refreshToken` 7 ngày KHÔNG rotate. Chi tiết đầy đủ + flow refresh/logout: `AUTH_RBAC_MAP.md` Mục 1, `DATA_FLOW.md` Mục 3.

## 6. RBAC

~75 permission (`permission.constant.ts`), 6 role. FE permission check CHỈ là UX guard, backend là ranh giới thật. 2 case đặc biệt PHẢI biết: (a) `USER_VIEW`/`USER_VIEW_DETAIL` hiện 0 role giữ; (b) ABAC/Policy CRUD hoạt động nhưng KHÔNG có tác dụng runtime. Chi tiết: `AUTH_RBAC_MAP.md`.

## 7. Document domain

Domain trung tâm nhất — 3 category, 6 subType, cặp nghiệp vụ quan trọng nhất `PROPOSE_REPAIR ↔ CHECK_DAMAGE` (tự động sync Asset khi duyệt xong, KHÔNG phải `CONFIRM_STATUS`). Chi tiết đầy đủ: `DOCUMENT_DOMAIN_MAP.md`.

## 8. Main backend domains

Auth, Users, Departments, RBAC (Permission/Role/Policy), Documents, Workflow, Assets (+Asset Category, Medical Device), Dashboard, Notifications, Audit Logs, Upload, Excel Import/Export, Performance. Đầy đủ endpoint từng domain: `API_REFERENCE.md`.

## 9. API conventions

Response phổ biến `{success,message?,data,pagination?}` nhưng KHÔNG đồng nhất 100% (1 số domain thiếu `success`, 1 ngoại lệ hoàn toàn ở Upload). Pagination: `{page,limit,total,totalPages}` (tên đã thống nhất). Chi tiết: `API_REFERENCE.md` phần đầu, `ERROR_HANDLING.md`.

## 10. Error conventions

`{success:false, message(an toàn hiển thị), errorCode, details?}` qua 1 middleware tập trung — ngoại lệ domain Upload. `details` có 2 shape khác nhau tuỳ nguồn lỗi (Zod vs Mongoose). Chi tiết: `ERROR_HANDLING.md`.

## 11. State management

Server state → React Query (mọi data từ API). Client state → Zustand (CHỈ auth session + UI state nhỏ). Local state → form/modal. Chi tiết: `STATE_MAPPING.md`.

## 12. Route/permission concept

`ProtectedRoute` (chặn cả route) + `PermissionGuard` (ẩn từng action) — cả 2 chỉ đọc permission từ `GET /users/me`, KHÔNG decode JWT. Route map đề xuất: `ROUTE_PERMISSION_MAP.md`.

## 13. UI requirements

17 nhóm màn hình (Auth, Dashboard, Users, Departments, Documents×3, Audit Logs, Profile, Assets, Asset Categories, Uploads, RBAC, Import/Export), mỗi màn hình có Purpose/Data source/API/Permission/Table/Filters/Actions/Forms/Validation/States. Chi tiết: `UI_REQUIREMENTS.md`.

## 14. Development rules (áp dụng CHO MỌI FE task, không lặp lại CLAUDE.md/SKILL.md)

- KHÔNG sửa backend/OpenAPI trừ khi được yêu cầu rõ ràng.
- KHÔNG tự tạo API/permission/enum không tồn tại trong source.
- KHÔNG suy diễn business rule — nếu chưa rõ, đánh dấu UNKNOWN và hỏi user.
- KHÔNG implement nhiều FE task cùng lúc nếu chưa được yêu cầu — mỗi FE-XXX là 1 task riêng (`docs/frontend/tasks/FE-XXX.md`, format ở cuối tài liệu roadmap khi được tạo lại — xem Mục 17).

## 15. Known backend limitations (ảnh hưởng trực tiếp thiết kế FE)

0 HTTP/E2E test tồn tại ở backend (mọi hành vi API trong bộ tài liệu này đến từ đọc source, chưa từng gọi thử request thật); Dashboard không validate query; refreshToken không rotate; ABAC chưa hoạt động runtime. Đầy đủ: `FRONTEND_MEMORY.md` Mục 6.

## 16. Known API inconsistencies

Response shape không đồng nhất 100% (Upload là ngoại lệ rõ nhất); `GET /users*` hiện 403 mọi non-ADMIN dù thiết kế permission là generic. Đầy đủ: `FRONTEND_MEMORY.md` Mục 6, `ERROR_HANDLING.md` Mục 6.

## 17. Source-of-truth rules

```
Runtime behavior (source code)  >  OpenAPI contract  >  Backend documentation cũ
```
Nếu OpenAPI ≠ source: ghi `OPENAPI_CONTRACT` (điều OpenAPI mô tả) và `SOURCE_CODE_BEHAVIOR` (điều source thật làm) riêng biệt, KHÔNG tự chọn 1 bên âm thầm. FE code theo `SOURCE_CODE_BEHAVIOR` (nguồn sự thật runtime) trừ khi user chỉ định khác.

**Ghi chú lịch sử**: 4 file tài liệu FE tạo ở task trước (UI-00) đã bị user chủ động xoá để làm lại phân tích từ đầu — không phải sự cố. Nội dung roadmap FE-00→18 và design token (màu/typography) KHÔNG có trong bộ tài liệu hiện tại, cần task riêng nếu muốn tạo lại. Xem `FRONTEND_MEMORY.md` Mục 1.

## 18. Liên kết chi tiết (KHÔNG copy nội dung các file này vào đây)

- `FE_ARCHITECTURE.md` — stack, layer, cấu trúc thư mục.
- `API_REFERENCE.md` — toàn bộ endpoint, method/path/permission/body/response.
- `AUTH_RBAC_MAP.md` — authentication flow + permission/role đầy đủ.
- `DOCUMENT_DOMAIN_MAP.md` — business rule domain Document/Workflow.
- `ROUTE_PERMISSION_MAP.md` — route FE ↔ permission ↔ access.
- `STATE_MAPPING.md` — server/client/local state.
- `DATA_FLOW.md` — luồng dữ liệu, auth flow, file upload/download.
- `UI_REQUIREMENTS.md` — yêu cầu chức năng từng màn hình.
- `ERROR_HANDLING.md` — error architecture + FE recommendation.
- `SHARED_COMPONENTS_LIBRARY.md` — component dùng chung.
- `FRONTEND_MEMORY.md` — trạng thái phát triển, quyết định, vấn đề tồn đọng (cập nhật liên tục).
- `FE_KNOWLEDGE_BASE_AUDIT.md` — audit coverage lần tạo bộ tài liệu này.
- `FE_FOUNDATION_SPEC.md` — coding contract chính thức (stack/folder/API layer/state/RBAC/routing/DoD...), đọc SAU các file trên, TRƯỚC khi code FE-01.
- `tasks/FE-00.md`, `tasks/FE-01.md`, `tasks/FE-02.md`, `tasks/FE-03.md`, `tasks/FE-04.md` — nhật ký từng FE task đã code (bootstrap, auth+app shell+design system, RBAC UI foundation, Users/Departments UI thật, Documents Core UI).
- `phases/FE-01_MICRO_FIX_SESSION_RESTORE.md` — micro-fix Session Restore (bug thật đã confirmed + sửa, xem `FRONTEND_MEMORY.md` Mục 1).
