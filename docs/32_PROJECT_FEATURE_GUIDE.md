# PROJECT FEATURE GUIDE — Document Papper

**Loại tài liệu:** SỐNG — cập nhật mỗi khi có module/tính năng mới (đúng `CLAUDE.md` §29/§36),
KHÁC với `docs/01_PROJECT_OVERVIEW.md` (đóng băng từ Phase 01, lúc dự án còn chưa có
frontend — giữ nguyên làm lịch sử, không dùng để tra tính năng hiện tại).
**Cập nhật lần cuối:** 2026-10-23, khớp thực tế tới `DEV-120`/`FE-45` (commit `a7bed0d`: đã tách module Tài sản thành Thiết bị CNTT / Thiết bị y tế, thêm Bản quyền phần mềm, Tài liệu dự án).
**Mục đích:** 1 nơi duy nhất mô tả TOÀN BỘ module của dự án — làm gì, tính năng chính, liên
kết với module nào khác. Dùng cho người mới join hoặc cần nắm nhanh toàn cảnh dự án.

---

## Tổng quan hệ thống

Hệ thống quản lý tài liệu và tài sản/thiết bị y tế nội bộ — hỗ trợ workflow duyệt tài liệu
đa cấp, quản lý vòng đời tài sản (bảo hành, kiểm định), vật tư tiêu hao, nhà cung cấp/hợp
đồng bảo trì, phân quyền RBAC + ABAC, và báo cáo/dashboard tổng hợp.

16 thư mục route backend (`backend/src/routes/`), 16 feature frontend (`frontend/src/features/`), 34 model Mongoose (14 thư mục domain trong `backend/src/models/`).
Chi tiết schema/quan hệ đầy đủ: `docs/04_DATABASE_ANALYSIS.md`. Sơ đồ trực quan có thể click
để xem quan hệ giữa các model: trang **System Design** trong app (mục "Quản trị hệ thống").

---

## Nhóm 1 — Xác thực & Bảo mật

### Auth
Đăng nhập/đăng ký/quên mật khẩu, JWT access + refresh token, xác thực 2 lớp (2FA), quản lý
phiên đăng nhập.
- Đăng ký, đăng nhập, refresh token, đăng xuất, quên/đặt lại mật khẩu.
- 2FA: bật/tắt/xác nhận (`/2fa/enable`, `/2fa/confirm`, `/2fa/disable`), xác thực OTP khi
  đăng nhập (`/login/verify-otp`).
- Quản lý phiên: xem danh sách phiên đang đăng nhập (`/sessions`), thu hồi 1 phiên cụ thể
  (`DELETE /sessions/:id`).
- Model: `User`, `RefreshToken`, `PasswordResetToken`, `TwoFactorOtp`.
- **Liên kết**: mọi domain khác đều phụ thuộc Auth để xác thực request (`authenticate`
  middleware). RBAC quyết định user làm được gì SAU KHI đã qua Auth.

### RBAC (Role — Permission — Policy)
Phân quyền theo Role + Permission (RBAC) kết hợp Policy (ABAC) cho các rule phức tạp hơn
role đơn thuần.
- CRUD Role, Permission, Policy.
- Middleware `authorizePermission` chạy sau `authenticate`, có cache tránh query permission
  mỗi request.
- Model: `Role`, `Permission`, `Policy`.
- **Liên kết**: MỌI domain nghiệp vụ đều gate qua RBAC (mỗi route/action có permission
  riêng). Trang **System Design** dùng chính permission catalog này để gate quyền xem sơ đồ.

### Users
Quản lý tài khoản người dùng, nhật ký thao tác.
- CRUD user, xem/sửa hồ sơ cá nhân (`/users/me`).
- Ảnh đại diện (avatar): user tự đổi/xoá ảnh của mình; ADMIN đổi/xoá hộ user khác.
- User Audit: nhật ký thao tác user (ai làm gì, khi nào).
- Model: `User`, `UserAudit`.
- **Liên kết**: User gắn với Department (thuộc khoa/phòng nào), gắn với Role (RBAC).

---

## Nhóm 2 — Nghiệp vụ tài liệu

### Documents
Nghiệp vụ trung tâm của hệ thống — CRUD tài liệu kèm workflow duyệt đa cấp.
- CRUD tài liệu, lưu phiên bản (`DocumentVersion`), xuất PDF chính thức
  (`DocumentPdfExport`).
- Workflow duyệt đa cấp: `WorkflowTemplate` (mẫu quy trình) + `WorkflowInstance` (thực thi
  cho 1 tài liệu cụ thể) — trang "Duyệt tài liệu" riêng trong app.
- Model: `Document`, `DocumentVersion`, `DocumentPdfExport`, `WorkflowTemplate`,
  `WorkflowInstance`, `Counter` (sinh mã tài liệu tự tăng).
- **Liên kết**: Document thuộc về Department, người tạo/duyệt là User, workflow áp dụng
  Policy (RBAC/ABAC) để quyết định ai được duyệt bước nào.

### Files / Upload
Upload và quản lý file đính kèm.
- Upload, xem danh sách, tải xuống, xoá file.
- Model: `Upload`.
- **Liên kết**: file đính kèm cho Document hoặc các domain khác cần lưu tệp.

### Excel / Export
Xuất/nhập dữ liệu qua Excel.
- Xuất Excel danh sách tài liệu, tải template import, xem lịch sử import
  (`import-history`).
- Model liên quan: `ImportHistory`.
- **Liên kết**: chủ yếu phục vụ Documents, có thể mở rộng cho domain khác cần import/export
  hàng loạt.

---

## Nhóm 3 — Tài sản & Vật tư

### Tài sản — tách thành 2 module trên 1 lõi dùng chung *(từ DEV-111→120 / FE-42→45)*
Trước đây là một module "Assets" duy nhất (`/api/assets*`). Nay tách thành **2 module nghiệp vụ**
dùng chung một collection `assets`, phân biệt bằng `Asset.assetType` (`IT` | `MEDICAL`). Route cũ
`/api/assets*` đã gỡ (trả 404), chỉ còn `GET /api/assets/lookup-options` (ô chọn tài sản dùng chung
cho Tài liệu/Hợp đồng/Thông báo). Truy cập thiết bị khác loại qua module sai → 404.

**Lõi dùng chung** (`models/assets/`): `Asset`, `AssetCategory` (cây 3 cấp, `assetType` đặt ở danh mục gốc),
`AssetAssignmentHistory` (cấp phát/luân chuyển/thu hồi, append-only), `AssetMaintenancePlan` (lịch
bảo trì chủ động). Các route lõi được dựng bằng một router factory dùng cho cả hai module.

#### Thiết bị CNTT — `/api/it-assets`, trang `/app/it-assets`
- CRUD tài sản, xoá mềm/khôi phục/xoá vĩnh viễn, cấp phát/luân chuyển/thu hồi, lịch sử, QR + kiểm kê,
  import/export Excel, kế hoạch bảo trì + lịch, cảnh báo bảo hành, danh mục nhánh CNTT.
- **Hồ sơ CNTT** (`ItDeviceProfile`, 1-1 với tài sản): cấu hình phần cứng (CPU/RAM/ổ cứng/GPU), mạng
  (IP, MAC, hostname, VLAN — IP trùng chỉ cảnh báo, không chặn), hệ điều hành và firmware.
- Quyền: `IT_ASSET_*` (15) và `IT_ASSET_CATEGORY_*` (5). Role `IT` quản lý; `PHONG_VAT_TU_TTB` chỉ xem.

#### Thiết bị y tế — `/api/medical-assets`, trang `/app/medical-assets`
- Có đủ các chức năng lõi như trên, cộng thêm: hồ sơ thiết bị y tế (`MedicalDeviceProfile`, hạng A/B/C/D,
  số đăng ký, hạn giấy phép), hồ sơ kiểm định/hiệu chuẩn (`CalibrationRecord`, kèm file chứng nhận),
  **chứng chỉ vận hành** (`OperatorCertificate`: gắn User + danh mục thiết bị, có sửa/thu hồi/xoá mềm,
  chặn cấp phát thiết bị yêu cầu chứng chỉ cho người không có chứng chỉ hợp lệ), dashboard theo hạng.
- Quyền: `MEDICAL_ASSET_*` (15), `MEDICAL_ASSET_CATEGORY_*` (5), giữ `MEDICAL_DEVICE_*` (5) và
  `OPERATOR_CERTIFICATE_*` (4). Role `PHONG_VAT_TU_TTB` quản lý; `IT` chỉ xem.
- Cảnh báo bảo hành/hiệu chuẩn/chứng chỉ gửi cả Phòng Vật tư-TTB và IT.

#### Bản quyền phần mềm — `/api/software-licenses`, trang `/app/software-licenses`
- Danh mục bản quyền (`SoftwareLicense`: tên, phiên bản, loại vĩnh viễn/thuê bao, số máy tối đa, hạn dùng,
  nhà cung cấp, chứng từ), gán/gỡ máy CNTT (kiểm tra số máy còn trống an toàn khi gán đồng thời),
  cảnh báo sắp hết hạn gửi role IT. **Không lưu khóa bản quyền** (quyết định có chủ đích).
- Quyền: `SOFTWARE_LICENSE_*` (6).

- Model: `Asset`, `AssetCategory`, `AssetAssignmentHistory`, `AssetMaintenancePlan` (lõi);
  `MedicalDeviceProfile`, `CalibrationRecord`, `OperatorCertificate` (`models/medicalDevices/`);
  `ItDeviceProfile`, `SoftwareLicense` (`models/itDevices/`).
- **Liên kết**: Asset thuộc Department; Vendor có thể là bên bảo trì/hiệu chuẩn thiết bị
  (xem `Contract`) và là nhà cung cấp của bản quyền. Hợp đồng có thể trộn thiết bị CNTT lẫn y tế —
  danh sách hiện đủ, nhưng liên kết chi tiết chỉ mở với loại người xem có quyền.
- Kế hoạch và quyết định: `docs/development/ASSET_MODULE_SPLIT_PLAN.md`; chi tiết task `DEV-111`→`DEV-120`.

### Vật tư tiêu hao (Inventory)
Quản lý vật tư tiêu hao — module TÁCH BIỆT với Tài sản (CNTT/y tế) (khác bản chất: tiêu hao/hết dần,
không phải tài sản cố định theo dõi dài hạn).
- Phân loại vật tư (`ConsumableCategory`), quản lý tồn kho (`ConsumableItem`), yêu cầu cấp
  phát (`ConsumableRequest`), lịch sử xuất/nhập (`ConsumableTransaction`).
- Model: `ConsumableCategory`, `ConsumableItem`, `ConsumableRequest`,
  `ConsumableTransaction`.
- **Liên kết**: yêu cầu cấp phát gắn với User yêu cầu + Department nhận; KHÔNG liên kết trực
  tiếp với Tài sản dù cùng nhóm hiển thị "Tài sản & Vật tư" trên Sidebar (đây là gộp nhóm thị
  giác, không phải quan hệ dữ liệu).

---

## Nhóm 4 — Nhà cung cấp

### Vendors & Contracts
Quản lý nhà cung cấp và hợp đồng bảo trì/dịch vụ.
- CRUD nhà cung cấp (`Vendor`), CRUD hợp đồng bảo trì (`Contract`) gắn với 1 vendor cụ thể.
- Model: `Vendor`, `Contract`.
- **Liên kết**: 1 Contract luôn thuộc về 1 Vendor. Contract có thể liên quan tới Asset (hợp
  đồng bảo trì cho thiết bị nào; có thể trộn thiết bị CNTT và y tế) — xem chi tiết field ref trong `04_DATABASE_ANALYSIS.md`.
  2 mục Sidebar riêng do khác permission gate (`VENDOR_VIEW` vs `CONTRACT_VIEW`).

---

## Nhóm 5 — Vận hành chung

### Departments
Quản lý khoa/phòng — đơn vị tổ chức xuyên suốt hệ thống.
- CRUD khoa/phòng.
- Model: `Department`.
- **Liên kết**: hầu hết domain nghiệp vụ (User, Document, Asset, Consumable) đều gắn với 1
  Department — đây là 1 trong những model được tham chiếu nhiều nhất hệ thống.

### Notifications
Thông báo trong hệ thống.
- Xem danh sách, đếm chưa đọc (`unread-count`), đánh dấu đã đọc (từng cái hoặc tất cả
  `read-all`), xoá.
- Model: `Notification`.
- **Liên kết**: phát sinh từ nhiều domain khác (workflow duyệt tài liệu, cảnh báo bảo trì
  tài sản...) — nguồn phát thông báo nằm rải rác, không tập trung 1 chỗ.

---

## Nhóm 6 — Báo cáo & Kỹ thuật

### Dashboard
Thống kê tổng hợp — nhiều endpoint KPI chuyên biệt hơn 1 dashboard đơn giản.
- Tổng quan theo role (`admin-summary`, `department/:id`), thống kê tài sản (tổng quan, sắp
  hết hạn bảo hành, quá hạn bảo trì; dùng chung cho cả hai loại), thống kê thiết bị y tế (tổng quan, sắp tới hạn kiểm
  định), KPI xu hướng (tỷ lệ chuyển đổi đề xuất, thiết bị hư hỏng nhiều nhất...), duyệt tài
  liệu quá hạn, và có thể CHẠY báo cáo tuần thủ công (`weekly-report/run`).
- **Liên kết**: tổng hợp dữ liệu từ hầu hết domain khác (Documents, Tài sản, Consumables) —
  không có model riêng, chỉ đọc/tính toán từ model của domain khác.

### Performances
Theo dõi hiệu năng API.
- Model: `ApiPerformance`.
- **Liên kết**: hạ tầng kỹ thuật, không phục vụ nghiệp vụ trực tiếp — dùng để giám sát hệ
  thống.

### Audit Logs
Nhật ký audit tổng hợp (khác `UserAudit` — đây là log chung nhiều hành động hệ thống hơn).
- **Liên kết**: tổng hợp log từ nhiều domain (không có model riêng biệt tách hẳn khỏi
  `UserAudit`/`ImportHistory` — xem `04_DATABASE_ANALYSIS.md` để biết nguồn dữ liệu chính
  xác).

### System Design *(mới, DEV-071→073 / FE-23→24)*
Sơ đồ kiến trúc tương tác — trực quan hoá toàn bộ model + quan hệ, chỉ dành cho
dev/admin (permission riêng).
- Đọc trực tiếp `mongoose.modelNames()` + `schema.paths` lúc chạy — KHÔNG hard-code danh
  sách model/quan hệ, tự động đúng khi có model mới.
- Module = group node, Model = node con, quan hệ (`ref`) = edge có hướng. Click module để
  fit-view, click model mở Drawer chi tiết, có filter/minimap/legend.
- **Liên kết**: đọc dữ liệu từ TẤT CẢ model của mọi domain khác — là "bản đồ" của toàn bộ
  tài liệu này, không phải 1 domain nghiệp vụ riêng.

---

### Project Docs *(mới, DEV-075 / FE-26)*
Trang đọc tài liệu dự án ngay trong app (12 tài liệu phân tích lịch sử), dùng cùng quyền
`SYSTEM_DESIGN_VIEW` với System Design — chỉ dev/admin. Gắn tài liệu vào đúng module trong sơ đồ.
- Route: `GET /api/project-docs`, `GET /api/project-docs/:id`; trang `/app/project-docs`.
- Không có model riêng (đọc file `docs/` tại thời điểm chạy).

---

## Cách giữ tài liệu này không bị lệch

Theo đúng bài học đã rút ra nhiều lần trong dự án (`SESSION_HANDOFF.md`, `CLAUDE.md` §41
từng bị lệch thực tế): tài liệu này PHẢI được cập nhật ngay khi thêm module mới, cùng lúc
với bước "Cập nhật documentation" ở `CLAUDE.md` §36 (Module Extension Rule) — không dồn lại
sửa sau.
