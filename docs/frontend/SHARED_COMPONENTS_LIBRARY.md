# SHARED COMPONENTS LIBRARY

> `FRONTEND_RECOMMENDATION` — xác định component dùng chung dựa trên UI_REQUIREMENTS.md (17 page/domain, phần lớn lặp lại đúng 1 bộ pattern: table+filter+CRUD+permission). KHÔNG code component ở đây — chỉ purpose/props khái niệm/states/permission behavior/data dependency.
>
> ✅ **IMPLEMENTED tại FE-01 (2026-09-05)**: `AppButton` (`components/ui/button.tsx`), `PageHeader`, `StatusBadge`, `LoadingState`, `EmptyState`, `ErrorState`, `AppModal`, `AppDrawer` (tất cả `components/shared/`), `PermissionGuard` (`components/auth/`). Chi tiết: `docs/frontend/tasks/FE-01.md`.
> ✅ **IMPLEMENTED tại FE-02 (2026-09-05)**: `PermissionBadge` (`components/auth/`, compose lại `StatusBadge`, format hiển thị permission string qua `utils/humanizePermission.ts` — KHÔNG dịch nghĩa tiếng Việt vì backend chưa có bảng mô tả). Chi tiết: `docs/frontend/tasks/FE-02.md`.
> ✅ **IMPLEMENTED tại FE-03 (2026-09-05)**: `DataTable`, `FilterBar`, `Pagination`, `ConfirmDialog` (tất cả `components/shared/`) — build khi có nhu cầu thật (Users/Departments UI). `FilterBar` là layout wrapper NHẸ (children-based), KHÔNG phải config-engine tổng quát (field set khác nhau nhiều giữa các domain — xây engine chung lúc mới 2 domain dùng là over-engineer). `ConfirmDialog` compose lại `AppModal`, hỗ trợ `requireTypedConfirm` (chưa dùng ở FE-03, để dành cho action không thể hoàn tác sau này). Chi tiết: `docs/frontend/tasks/FE-03.md`.
> ✅ **IMPLEMENTED tại FE-04 (2026-09-05)**: Documents Core UI dùng lại nguyên vẹn `DataTable`/`Pagination`/`FilterBar`/`ConfirmDialog`/`AppModal`/`AppDrawer` (không sửa) — không có shared component mới ở tầng "dùng chung nhiều domain" (các component mới của FE-04 — `WorkflowStatusBadge`/`DocumentMetaFields`/`DocumentMetaView`/`AssetPicker`/`DocumentEditModal`/`SubmitWorkflowModal`/`DeleteByMonthModal`/`WorkflowStepsView` — đặc thù domain Document/Workflow, sống ở `features/documents/components/`, KHÔNG đưa vào `components/shared/`). Chi tiết: `docs/frontend/tasks/FE-04.md`.
> Component còn lại (`FileUpload`, `DateRangePicker`, `ExportButton`, `PermissionBadge` version RBAC Admin) CHƯA implement — sẽ code khi FE task cần tới (FE-05+), theo đúng nguyên tắc "không tạo abstraction trước khi có nhu cầu thật".

| Component | Purpose | Used by | Props khái niệm | States | Permission behavior | Data dependency |
|---|---|---|---|---|---|---|
| **AppButton** | Button chuẩn hoá 3 variant (primary/secondary/ghost) | Toàn bộ app | `variant, size, loading, disabled, icon, onClick` | default/hover/loading/disabled | — | — |
| **PageHeader** | Tiêu đề trang + breadcrumb + action chính (vd "Tạo mới") | Mọi trang danh sách/chi tiết | `title, breadcrumb, actions(slot)` | — | Ẩn action nếu thiếu permission tương ứng | — |
| **DataTable** | Bảng dữ liệu chuẩn: sort/pagination/row-action/empty/loading tích hợp | Documents, Users, Departments, Assets, Audit Logs, RBAC lists, Uploads | `columns, data, pagination, onSortChange, onPageChange, rowActions, isLoading, isError` | loading (skeleton)/error/empty/có data | `rowActions` tự lọc theo permission truyền vào | Nhận trực tiếp `{data, pagination}` đã unwrap từ React Query |
| **FilterBar** | Thanh filter/search phía trên DataTable | Mọi trang danh sách | `fields(config), value, onChange, onReset` | — | — | Đưa filter vào query key (xem `STATE_MAPPING.md`) |
| **AppModal** | Modal cho action ngắn (form ≤5 field, confirm) | Create Role, Assign Role, RBAC forms nhỏ | `open, onClose, title, size, footer(slot)` | open/closed | — | — |
| **AppDrawer** | Drawer cho form dài/chi tiết record | Document detail, Asset detail, User edit đầy đủ | `open, onClose, title, width` | open/closed | — | — |
| **StatusBadge** | Badge màu theo trạng thái (workflowStatus, AssetStatus, isActive...) | Documents, Assets, Users list | `status, variant(map trạng thái→màu semantic)` | — | — | Cần bảng mapping status→label tiếng Việt+màu, RIÊNG cho từng domain (workflowStatus 5 giá trị ≠ AssetStatus 6 giá trị) |
| **PermissionGuard** | Ẩn/hiện children theo permission | Toàn bộ nút action, menu sidebar | `permission (string\|string[]), mode("hide"\|"disable"), fallback?` | — | Đọc `user.permissions` (Zustand/React Query cache `users.me`) | Phụ thuộc `GET /users/me` đã load xong TRƯỚC khi render (tránh flash nội dung sai quyền) |
| **ProtectedRoute** | Chặn route theo permission | Router config | `permission, children` | redirect /login \| redirect /403 \| render | Kiểm tra `isAuthenticated` trước, `permission` sau | — |
| **EmptyState** | Trạng thái rỗng có action gợi ý | Mọi DataTable, Dashboard card | `icon, message, actionLabel?, onAction?` | — | — | — |
| **LoadingState** | Skeleton/spinner chuẩn hoá | Mọi nơi chờ data | `variant("skeleton-table"\|"skeleton-card"\|"spinner")` | — | — | — |
| **ErrorState** | Hiển thị lỗi + nút thử lại | Mọi query lỗi (đặc biệt Dashboard — mỗi card lỗi riêng) | `message, onRetry` | — | — | Nhận `message` đã qua `parseApiError` (xem `ERROR_HANDLING.md`) |
| **ConfirmDialog** | Xác nhận trước hành động phá huỷ | Delete (mọi domain), Permanent Delete, Reject workflow | `title, message, confirmLabel, danger(boolean), requireTypedConfirm?(string)` | — | — | `requireTypedConfirm` bắt buộc cho `ASSET_DELETE_PERMANENT`/`ASSET_CATEGORY_DELETE_PERMANENT` (không thể hoàn tác) |
| **FileUpload** | Upload file với validate MIME/size phía client trước khi gửi | Uploads, Excel import (Document/Asset), Medical device calibration attachment | `accept(mime[]), maxSizeMB, multiple, onUpload` | idle/uploading/success/error | Ẩn nếu thiếu `UPLOAD_FILES`/tương đương domain | Validate CLIENT-SIDE là UX only — backend vẫn tự check MIME/size, không thay thế |
| **Pagination** | Điều hướng trang, dạng "Trang X/Y" + nhảy trang trực tiếp | Mọi DataTable | `page, limit, total, totalPages, onPageChange` | — | — | Field `totalPages` đã thống nhất tên toàn hệ thống (DEV-025) |
| **PermissionBadge** | Hiển thị 1 permission dạng pill (RBAC admin screen) | Trang Roles/Permissions | `permissionName` | — | — | Map permission string → label tiếng Việt (cần bảng dịch riêng, chưa có ở backend — permission chỉ có string kỹ thuật, không có `description` hiển thị sẵn cho non-technical user ở mọi permission) |
| **DateRangePicker** | Chọn `fromDate`/`toDate` dùng chung | Audit Logs, Dashboard KPI, Documents filter | `value:{from,to}, onChange` | — | — | — |
| **ExportButton** | Trigger tải file blob (Excel/CSV) | Documents export, Asset export, Audit export | `onExport(format?), loading` | idle/downloading | Ẩn nếu thiếu permission export tương ứng | Dùng luồng blob ở `DATA_FLOW.md` Mục 5 |

## Ghi chú thiết kế chung (không phải code)

- `StatusBadge` KHÔNG dùng 1 bảng màu chung cho mọi domain — `workflowStatus` (5 giá trị) và `AssetStatus` (6 giá trị) là 2 enum độc lập, cần 2 bảng mapping riêng dù cùng dùng chung component.
- `PermissionGuard`/`ProtectedRoute` chỉ là UX guard — nhắc lại nguyên tắc xuyên suốt: backend luôn là ranh giới bảo mật thật (xem `AUTH_RBAC_MAP.md`).
- Không tạo thêm component ngoài danh sách trên trừ khi UI_REQUIREMENTS.md phát sinh nhu cầu thật cụ thể khi bắt đầu code (tránh tạo abstraction sớm — nguyên tắc BƯỚC 11 của UI-00).
