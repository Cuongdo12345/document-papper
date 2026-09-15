# UI REQUIREMENTS

> Yêu cầu CHỨC NĂNG từng màn hình, suy ra trực tiếp từ backend (`API_REFERENCE.md`, `DOCUMENT_DOMAIN_MAP.md`, `AUTH_RBAC_MAP.md`). KHÔNG thiết kế visual chi tiết ở đây (màu/spacing — nếu cần, xem file thiết kế riêng khi FE-03 bắt đầu). Toàn bộ nội dung dưới đây là `FRONTEND_RECOMMENDATION` suy ra từ backend, không phải yêu cầu đã chốt với business owner.

---

## Authentication

**Purpose**: Đăng nhập/đăng xuất/khôi phục mật khẩu.
**Data source**: không có state trước khi login.
**API**: `POST /auths/login`, `/logout`, `/forgot-password`, `/reset-password`.
**Permission**: public.
**Forms**: Login (`username`,`password`); Forgot Password (`username`); Reset Password (`token` từ query, `newPassword`+xác nhận).
**Validation**: `username` 3-50 ký tự `[a-zA-Z0-9_]`; `newPassword`≥8. Hiển thị lỗi field-level từ `details[].path` (xem `ERROR_HANDLING.md`).
**Loading**: disable nút submit + spinner trong nút khi đang gọi API.
**Error state**: 401 login → message chung ("Sai tên đăng nhập hoặc mật khẩu" — backend không phân biệt để tránh user enumeration). 429 → "Quá nhiều yêu cầu, thử lại sau".
**Empty/Permission state**: không áp dụng (trang public).
**Đặc biệt**: Forgot Password LUÔN hiển thị "Nếu tài khoản tồn tại, chúng tôi đã gửi email" bất kể response thật (xem `AUTH_RBAC_MAP.md` Mục 1.2) — KHÔNG code theo hướng "nếu lỗi thì hiển thị khác".

---

## Dashboard

**Purpose**: Tổng quan số liệu toàn hệ thống/theo khoa + 4 nhóm KPI (proposal conversion, device damage trend, top damaged devices/inks) + số liệu Asset/Medical Device (warranty/calibration due).
**Data source**: 12 endpoint `/dashboard/*`.
**Permission**: `DASHBOARD_READ`.
**Filters**: `department` (dropdown, cho endpoint theo khoa), `month`/`year` (cho `device-stats`), `daysAhead`/`daysThreshold` (cho warranty/maintenance/calibration) — **FE PHẢI tự validate các giá trị này TRƯỚC khi gọi API** (backend không validate query ở domain này, xem `API_REFERENCE.md` mục Dashboard).
**Loading**: skeleton cho từng card/chart riêng biệt (không phải 1 spinner toàn trang — 12 request độc lập, không nên chặn nhau).
**Empty state**: mỗi KPI/chart tự xử lý rỗng riêng (vd chưa có dữ liệu tháng đó) — không coi 1 endpoint lỗi là cả trang lỗi.
**Error state**: từng card lỗi riêng, có nút "Thử lại" cho card đó (không reload toàn trang).

---

## Users

**Purpose**: Quản trị tài khoản user (CRUD, gán role, đổi/reset mật khẩu, kích hoạt lại).
**Data source**: `GET /users`, `GET /users/:id`.
**Permission**: `USER_VIEW`/`USER_VIEW_DETAIL` ⚠️ **0 role hiện giữ — coi là màn hình ADMIN-only trên thực tế** (xem `AUTH_RBAC_MAP.md`).
**Table**: username, fullName, role, department, isActive, ngày tạo. Sort: theo field có trong `GetUsersQueryDTO` (không có `sortBy` tường minh trong DTO này — kiểm tra lại UNKNOWN nếu cần sort tuỳ ý, mặc định sort theo `createdAt`).
**Filters**: `role`, `department`, `isActive`.
**Actions**: Tạo user (`USER_CREATE`), Sửa (`USER_UPDATE`), Gán role (`USER_ASSIGN_ROLE`, action RIÊNG — không nằm trong form Sửa thường), Xoá mềm (`USER_DELETE`), Khôi phục (`USER_RESTORE`), Reset mật khẩu hộ (`USER_RESET_PASSWORD`).
**Forms**: Create (`username`≥5, `password`≥8, `fullName`, `role`, `department?`); Edit (`fullName?`,`username?`,`role?`,`department?`,`isActive?` — KHÔNG có password ở đây); Gán role (`roleId`,`resetPermissions?` — form/modal riêng); Reset password (`newPassword`≥8).
**Validation**: guard phía UI — disable gán role "ADMIN" (backend sẽ 400 nếu cố tình gửi, nhưng ẩn/disable option này ở Select cho UX tốt hơn).
**Permission state**: ẩn nút hành động tương ứng nếu thiếu `USER_UPDATE`/`USER_DELETE`/`USER_ASSIGN_ROLE`/`USER_RESET_PASSWORD`.

---

## Departments

**Purpose**: CRUD Khoa/Phòng.
**Data source**: `GET /departments`.
**Permission**: `DEPARTMENT_VIEW`/`DETAIL`.
**Table**: code, name.
**Filters**: `keyword` (search).
**Actions**: Tạo (`DEPARTMENT_CREATE`), Sửa (`DEPARTMENT_UPDATE`), Xoá (`DEPARTMENT_DELETE`).
**Forms**: `{name, code}` — CHỈ 2 field (model KHÔNG có description/isActive).
**Error state đặc thù**: Xoá bị chặn (400) nếu còn User/Document/Asset tham chiếu — hiển thị message backend trực tiếp (đã an toàn), gợi ý user xem/chuyển các bản ghi liên quan trước.

---

## Documents (List)

**Purpose**: Danh sách toàn bộ Document (Proposal/Report/Reference).
**Data source**: `GET /documents`.
**Permission**: `DOCUMENT_VIEW`.
**Table**: documentCode, category, subType, title, department, workflowStatus (badge màu theo trạng thái), createdAt.
**Filters**: category, subType (phụ thuộc category đã chọn — xem `DOCUMENT_DOMAIN_MAP.md` Mục 1), department, workflowStatus, createdBy, fromDate/toDate, keyword (search).
**Sort**: `createdAt|updatedAt|title|documentCode|serviceDate|actualCost` (whitelist cứng — KHÔNG hiển thị sort option ngoài danh sách này).
**Actions**: Tạo mới (→ `/documents/create`), Xem chi tiết, Xoá (nếu `DOCUMENT_DELETE` và chưa có workflow pending), Xoá hàng loạt theo tháng (⚠️ ẩn cho non-ADMIN dù backend permission cho phép `IT` — xem `DOCUMENT_DOMAIN_MAP.md` Mục 2).

## Documents (Create)

**Purpose**: Tạo Document mới (category=PROPOSAL — endpoint hiện tại chỉ có `/documents/proposal`).
**API**: `POST /documents/proposal`.
**Permission**: `DOCUMENT_CREATE`.
**Forms**: `category`, `subType` (lọc theo category), `title`, `department`, `referenceTo?` (Select ĐƠN, chỉ khi tạo REPORT — endpoint hiện tại chỉ tạo PROPOSAL nên field này ít dùng ở form này), `meta` (tuỳ theo subType — cấu trúc `meta` KHÔNG có schema cứng ở DTO, `z.record()` — FE tự định nghĩa form field theo nghiệp vụ thực tế của từng subType, backend chấp nhận object tự do), `relatedAsset` (**BẮT BUỘC** nếu `subType===PROPOSE_REPAIR`, ẩn Asset đã `DISPOSED`/`LOST` khỏi dropdown).
**Validation đặc thù**: nếu chọn Asset đang có đề xuất sửa chữa pending khác → backend 400 kèm `documentCode` trong message (Mục `DOCUMENT_DOMAIN_MAP.md`).

## Documents (Detail)

**Purpose**: Xem/sửa 1 Document + xem workflow + reports liên quan (nếu là PROPOSAL).
**API**: `GET /documents/:id`, `GET /documents/:proposalId/reports` (nếu category=PROPOSAL), `GET /workflows/document/:id`.
**Permission**: `DOCUMENT_VIEW_DETAIL`.
**Actions**: Sửa (CHỈ `title`/`meta` — ẩn field khác khỏi form Edit hoàn toàn, không chỉ disable), Xoá, Khôi phục, Submit vào workflow (nếu chưa submit), khu vực Approval (xem trang riêng dưới).
**Permission state**: ẩn nút Sửa nếu `workflowStatus` là `approved`/`completed` (trừ ADMIN) hoặc Document thuộc phòng ban khác (trừ ADMIN) — dù backend vẫn là chốt chặn cuối, ẩn trước giúp UX rõ ràng hơn.

## Documents (Approval / Workflow)

**Purpose**: Duyệt/từ chối/huỷ/hoàn tất 1 WorkflowInstance gắn với Document.
**API**: `POST /workflows/:id/approve|reject|cancel|complete`.
**Permission**: `WORKFLOW_APPROVE`/`REJECT`/`CANCEL`/`COMPLETE` — LƯU Ý còn có check role-per-step ở backend (`step.role===user.role`, free string) — có thể 403 dù có permission chung, hiển thị message backend trực tiếp.
**Forms**: `comment?` (optional, ≤1000 ký tự) cho cả 4 action.
**UI**: hiển thị rõ step hiện tại trong `WorkflowInstance.steps[]`, ai đã duyệt bước nào (`signedBy` trên Document).

---

## Audit Logs

**Purpose**: Xem lịch sử hành động (login, đổi mật khẩu, reset, v.v.) + export + dashboard tổng hợp.
**API**: `GET /user-audits`, `/export`, `/dashboard`.
**Permission**: `AUDIT_VIEW`/`AUDIT_VIEW_DASHBOARD`.
**Filters**: `fromDate`/`toDate`, `action` (multi-select — hỗ trợ nhiều giá trị, xem `API_REFERENCE.md`), `performedBy`, `user`.
**Actions**: Export (chọn định dạng `xlsx`/`csv` TRƯỚC khi gọi API — DTO export khác DTO list, có thêm field `format`).

---

## Profile

**Purpose**: Xem/sửa thông tin cá nhân, đổi mật khẩu.
**API**: `GET/PATCH /users/me`, `PATCH /users/change-password`.
**Permission**: chỉ `authenticate`.
**Đặc thù quan trọng**: đổi mật khẩu thành công → **thu hồi TOÀN BỘ refresh token kể cả phiên hiện tại** → FE PHẢI tự động logout ngay sau response 200 (không hiển thị "thành công, ở lại trang" — sẽ gãy ở request tiếp theo khi access token hết hạn và refresh token đã bị revoke).

---

## Assets

**Purpose**: Quản lý vòng đời tài sản/thiết bị (CRUD, cấp phát/luân chuyển/thu hồi, kiểm kê QR, hồ sơ thiết bị y tế + kiểm định).
**API**: 16 endpoint `/assets/*` + 5 `/asset-categories` + 6 `/medical-devices` (xem `API_REFERENCE.md`).
**Permission**: `ASSET_VIEW`/`VIEW_DETAIL`/`CREATE`/`UPDATE`/`DELETE`/`DELETE_PERMANENT`/`ASSIGN`/... (nhiều permission riêng theo hành động — xem bảng đầy đủ).
**Table**: code, name, category, department, status (badge theo `AssetStatus` — 6 giá trị), assignedTo.
**Filters**: department, category, status, keyword, sort tuỳ ý (`sortBy` không whitelist ở DTO này — kiểm tra lại nếu cần giới hạn field sort ở FE để tránh gửi field không tồn tại).
**Actions đặc thù**: Assign/Transfer/Return là 3 action RIÊNG BIỆT (không phải "Edit status") — mỗi action có form/modal riêng đúng field DTO tương ứng (xem `API_REFERENCE.md`). Xoá vĩnh viễn (`ASSET_DELETE_PERMANENT`) cần confirm dialog nghiêm ngặt (không thể hoàn tác, chặn nếu còn `MedicalDeviceProfile`).
**Sub-page**: `/assets/:id` nên có tab "Hồ sơ thiết bị y tế" (nếu Asset thuộc loại medical device) hiển thị profile + lịch sử kiểm định, tab "Lịch sử cấp phát" (`assignment-history`), tab "Tài liệu liên quan" (`GET /assets/:id/documents`).

---

## Asset Categories

**Purpose**: Danh mục phân loại tài sản (có thể lồng nhau qua `parentCategory`).
**API**: 5 endpoint `/asset-categories/*`.
**Permission**: `ASSET_CATEGORY_*`.
**Forms**: `{code,name,parentCategory?,defaultWarrantyMonths?}`.
**UI**: nếu hỗ trợ cây phân cấp (`parentCategory`), cân nhắc hiển thị dạng tree thay vì bảng phẳng — quyết định UI cụ thể để ở FE-10.

---

## Uploads

**Purpose**: Upload file đính kèm dùng chung (không gắn cứng vào 1 Document/Asset cụ thể qua API này — chỉ lưu trữ + liệt kê).
**API**: 4 endpoint `/upload/*`.
**Permission**: `UPLOAD_FILES`/`VIEW_FILES`/`VIEW_FILE_DETAIL`/`DELETE_FILE`.
**Forms**: input file multiple, MIME whitelist (PDF/JPEG/PNG/.docx/.xlsx), hiển thị lỗi rõ nếu vượt 10MB/file hoặc sai định dạng (message từ `errorCode: MULTER_*`, xem `ERROR_HANDLING.md`).
**Table**: tên file, loại, người upload (ẩn cột này nếu user thường — chỉ ADMIN thấy "của ai"), ngày upload.
**Error state đặc thù**: lỗi 404/403 domain này KHÔNG có `errorCode` chuẩn (xem `ERROR_HANDLING.md` Mục 4) — xử lý qua `message` trực tiếp.

---

## RBAC (Roles/Permissions/Policies)

**Purpose**: Quản trị phân quyền hệ thống.
**API**: 14 endpoint `/rbac/*`.
**Permission**: `ROLE_*`/`PERMISSION_*`/`POLICY_*`.
**Forms đặc thù**: Tạo Role CHỈ có field `name` (không có bước chọn permission ngay) — sau khi tạo, điều hướng/mở modal "Gán quyền" riêng (`POST /roles/:id/assign-permissions`, action RIÊNG với permission riêng `ROLE_ASSIGN_PERMISSIONS`).
**Policy (ABAC)**: cân nhắc gắn nhãn "Beta — chưa áp dụng" (xem `AUTH_RBAC_MAP.md` Mục 2.4) để không gây hiểu lầm tưởng Policy đang có hiệu lực thật.

---

## Import/Export

**Purpose**: Import/export hàng loạt qua Excel cho Document và Asset (2 luồng độc lập).
**API Document**: `/export/export-documents-excel`, `/template`, `/import-proposal`, `/departments/sync-from-excel`, `/import-history`.
**API Asset**: `/assets/export`, `/assets/import/template`, `/assets/import`.
**Giới hạn**: `MAX_IMPORT_ROWS=5000`/`MAX_SYNC_ROWS=5000` dòng/file — FE nên cảnh báo trước nếu file lớn hơn ước tính (không đếm được số dòng thật trước khi upload, chỉ cảnh báo chung).
**Loading**: import là thao tác CÓ THỂ CHẬM (đặc biệt Document import — N+1 transaction/dòng, đã benchmark ~26s cho 5000 dòng ở dev, xem `docs/development/tasks/DEV-020.md`) — hiển thị loading rõ ràng, KHÔNG cho phép double-submit, cân nhắc thông báo "có thể mất tới X giây với file lớn".
**Kết quả import**: response trả `result.errors[]` theo từng dòng lỗi (partial-success, không phải all-or-nothing) — UI nên hiển thị bảng "dòng nào lỗi, lý do gì" thay vì chỉ toast chung "import thất bại".
