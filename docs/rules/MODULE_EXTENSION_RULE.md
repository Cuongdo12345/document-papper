# MODULE EXTENSION RULE — danh sách domain và checklist thêm module

> Chuyển NGUYÊN VĂN từ `CLAUDE.md` (§36) ngày 2026-11-02 để file chính gọn. Số mục (§) giữ nguyên để các tài liệu khác vẫn trỏ đúng. Đọc khi thêm module/domain mới hoặc cần danh sách 14 domain hiện có. Bước 8 trỏ về `docs/rules/KNOWLEDGE_BASE_MAP.md`.

---

# 36. PROJECT MODULE EXTENSION RULE

Các module hiện tại có thể bao gồm:

```text
User
Department
Role
Permission
Document
Dashboard
Export
Authentication
RBAC
```

**[CẬP NHẬT 2026-09-30]** Danh sách trên là bản gốc, đã thiếu nhiều domain. Thực tế hiện có 14 thư mục domain ở `backend/src/models/` (34 model; **[CẬP NHẬT 2026-10-09]** thêm `medicalDevices` và `itDevices` khi tách module Tài sản thành Thiết bị CNTT / Thiết bị y tế, `DEV-111`→`DEV-116`), khớp 1-1 với các key trong `moduleDescriptions.ts`:

```text
auth           — RefreshToken, PasswordResetToken, TwoFactorOtp
users          — User, UserAudit
departments    — Department
rbac           — Role, Permission, Policy (ABAC)
documents      — Document, DocumentVersion, DocumentPdfExport, WorkflowTemplate, WorkflowInstance, Counter
assets         — Asset, AssetCategory, AssetAssignmentHistory, AssetMaintenancePlan   (lõi dùng chung; phân loại bằng Asset.assetType = IT | MEDICAL)
medicalDevices — MedicalDeviceProfile, CalibrationRecord, OperatorCertificate
itDevices      — ItDeviceProfile, SoftwareLicense
inventory      — ConsumableCategory, ConsumableItem, ConsumableTransaction, ConsumableRequest
vendors        — Vendor, Contract
notifications  — Notification
uploadFiles    — Upload
importAudit    — ImportHistory
apiPerformance — ApiPerformance
```

Dashboard và Export không có model riêng: chúng đọc từ các domain trên (`services/dashboard/`, `services/excel/`). Khi đếm lại, lấy nguồn từ `backend/src/models/`, không lấy từ danh sách này.

Khi thêm module mới:

1. Xác định module boundary.
2. Xác định responsibility.
3. Xác định API.
4. Xác định database model.
5. Xác định RBAC.
6. Xác định frontend consumer.
7. Xác định testing strategy.
8. Cập nhật documentation. Nếu module mới tạo ra thư mục/file doc MỚI ở cấp cao (vd: docs/<domain-mới>/), PHẢI thêm dòng trỏ vào `docs/rules/KNOWLEDGE_BASE_MAP.md` (nguồn duy nhất của danh sách tài liệu; trước 2026-11-02 ghi "CLAUDE.md §4 và SKILL.md §3" — đã gộp về một nơi) NGAY trong task đó — không để dồn lại. Đây chính xác là nguyên nhân đã khiến docs/frontend/, docs/development/, module-reviews/ từng không được rulebook biết tới trong nhiều tuần.
9. **[CẬP NHẬT DEV-074, 2026-09-21]** Cập nhật `backend/src/services/systemDesign/moduleDescriptions.ts` — thêm 1 entry mới (key = ĐÚNG tên thư mục domain vừa tạo ở `backend/src/models/<domain-mới>/`) với `description` (1-2 câu) + `features` (bullet). Đây là dữ liệu hiển thị ở trang "System Design" (`GET /api/system-design`, chỉ dev/admin) — module không có entry ở đây vẫn hoạt động bình thường (chỉ thiếu phần mô tả trong Drawer, không lỗi), nhưng bỏ sót sẽ khiến trang đó dần lệch thực tế giống lịch sử "21 model" đã xảy ra ở DEV-071 với tài liệu tĩnh cũ.
10. Cập nhật PROJECT_MEMORY nếu quan trọng.

Không nhồi module mới vào module cũ chỉ vì tiện.

