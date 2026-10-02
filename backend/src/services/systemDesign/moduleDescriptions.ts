/**
 * DEV-074 (2026-09-21) — mô tả tĩnh cho từng module hiển thị ở trang
 * "System Design" (`GET /api/system-design`). Nội dung viết dựa trên đọc
 * thật `docs/frontend/FRONTEND_MEMORY.md` Mục 5 ("Completed features"),
 * `docs/00_PROJECT_MEMORY.md` (Module Map ở `docs/13_FINAL_PROJECT_REPORT.md`
 * §4 + các mục "Feature Roadmap" B3/B4 cho inventory/vendors, CLAUDE.md §41
 * cho C1/C2 — 2FA/session management) — KHÔNG bịa, chỉ tóm tắt lại.
 *
 * Khoá của object = ĐÚNG tên thư mục domain thật ở `backend/src/models/`
 * (cũng là `module.name` trong response `GET /api/system-design`, suy trực
 * tiếp từ `buildModelDomainMap()` ở `systemDesign.service.ts`) — KHÔNG suy
 * đoán tên khác.
 *
 * **Khi thêm module mới** (thư mục model mới trong `backend/src/models/`),
 * PHẢI thêm 1 entry mới vào đây — xem CLAUDE.md §36 bước 8b (mục "Cập nhật
 * documentation"). Module không có entry ở đây vẫn hoạt động bình thường
 * (response chỉ thiếu `description`/`features`, KHÔNG lỗi) — nhưng nên bổ
 * sung sớm để trang System Design đầy đủ thông tin.
 */

export interface ModuleDescription {
  /** Mô tả ngắn 1-2 câu. */
  description: string;
  /** Danh sách tính năng chính (bullet), viết ngắn gọn. */
  features: string[];
}

export const MODULE_DESCRIPTIONS: Record<string, ModuleDescription> = {
  apiPerformance: {
    description:
      "Theo dõi hiệu năng API — ghi lại thời gian phản hồi, mã trạng thái và endpoint của từng request để phục vụ giám sát/tối ưu hoá hệ thống.",
    features: [
      "Ghi log hiệu năng theo batch (buffer, không ghi DB mỗi request)",
      "Middleware sampling ~10% traffic bình thường, luôn ghi log request lỗi/chậm",
      "Dữ liệu phục vụ phân tích hiệu năng (Phase 10 — PERF-01→PERF-16)",
    ],
  },
  assets: {
    description:
      "Quản lý vòng đời tài sản/thiết bị y tế: cấp phát, luân chuyển, thu hồi, bảo trì chủ động và kiểm định định kỳ.",
    features: [
      "CRUD Asset + Asset Category (kèm soft-delete/khôi phục)",
      "Cây danh mục nhiều cấp (gốc CNTT/TBYT → nhóm → loại thiết bị): tài sản chỉ gắn danh mục lá, lọc theo nhóm gồm cả con cháu",
      "Cấp phát/luân chuyển/thu hồi tài sản, lưu lịch sử cấp phát",
      "Hồ sơ thiết bị y tế (MedicalDeviceProfile) + lịch sử kiểm định (CalibrationRecord), upload file chứng nhận",
      "Lịch bảo trì chủ động (AssetMaintenancePlan) theo tháng, độc lập với luồng sửa chữa phản ứng",
      "Excel import/export cho Asset, QR code theo từng Asset",
    ],
  },
  auth: {
    description:
      "Đăng ký/đăng nhập, quản lý JWT + refresh token, và xác thực 2 lớp (2FA) qua email OTP cho ADMIN + các role duyệt cấp cao.",
    features: [
      "Đăng nhập/refresh token/đổi mật khẩu/quên mật khẩu",
      "Xác thực 2 lớp (2FA) qua email OTP — opt-in, ADMIN reset thủ công khi mất quyền truy cập",
      "Quản lý phiên đăng nhập — self-service xem/thu hồi phiên của chính mình",
    ],
  },
  departments: {
    description: "Danh mục khoa/phòng ban — nền tảng phân loại dùng chung cho Document, Asset, User theo đơn vị.",
    features: ["CRUD đầy đủ (kể cả xoá cứng — backend tự chặn nếu còn tham chiếu)", "Đồng bộ danh sách khoa/phòng từ Excel"],
  },
  documents: {
    description:
      "Domain trung tâm của hệ thống: quản lý tài liệu (đề xuất/báo cáo/hồ sơ) gắn với quy trình duyệt (workflow) đa cấp.",
    features: [
      "CRUD Document theo 3 subType, lịch sử phiên bản (DocumentVersion)",
      "Quy trình duyệt đa cấp (WorkflowTemplate/WorkflowInstance) — Duyệt/Từ chối/Huỷ/Hoàn tất, có SLA + nhắc việc",
      "Xuất PDF chính thức (DocumentPdfExport)",
      "Excel import/export, tìm kiếm toàn văn",
    ],
  },
  importAudit: {
    description: "Lưu lịch sử các lần import dữ liệu hàng loạt (Excel) — phục vụ tra soát khi import lỗi/ghi sai dữ liệu.",
    features: ["Ghi nhận lịch sử import Document/Asset/Department qua Excel"],
  },
  inventory: {
    description:
      "Quản lý vật tư tiêu hao — tồn kho theo từng khoa/phòng ban, lịch sử giao dịch nhập/xuất, cảnh báo tồn kho thấp tự động.",
    features: [
      "Tồn kho running-balance theo item + phòng ban (ConsumableItem)",
      "Lịch sử giao dịch nhập/xuất bất biến (ConsumableTransaction)",
      "Dự trù/đề xuất mua vật tư hàng tháng (ConsumableRequest) — KHÔNG qua luồng duyệt",
      "Cảnh báo tồn kho thấp tự động (cron hằng ngày)",
    ],
  },
  notifications: {
    description:
      "Thông báo nội bộ — gửi tự động khi có sự kiện nghiệp vụ (workflow, cảnh báo), và cho phép ADMIN gửi thông báo hệ thống thủ công.",
    features: [
      "Chuông thông báo + trang danh sách, đánh dấu đã đọc/xoá",
      "ADMIN gửi thông báo hệ thống thủ công (theo role/phòng ban/user cụ thể)",
      "Gửi kèm email cho các cảnh báo quan trọng (fire-and-forget, không chặn luồng chính)",
    ],
  },
  rbac: {
    description: "Phân quyền theo Role/Permission (RBAC); có tầng ABAC (Policy) hỗ trợ department-scoping cho 1 số endpoint.",
    features: [
      "CRUD Role/Permission, ma trận gán quyền theo nhóm resource",
      "Policy (ABAC) — department-scoping cho Document detail",
      "Cache permission hiệu lực trong bộ nhớ (TTL ngắn)",
    ],
  },
  uploadFiles: {
    description: "Lưu trữ file dùng chung cho toàn hệ thống — không gắn cứng vào 1 domain nghiệp vụ cụ thể.",
    features: [
      'Upload/tải file chung (thư viện "Tệp tin" độc lập với Document/Asset)',
      "Dùng làm nơi lưu chứng nhận kiểm định, file đính kèm khác",
    ],
  },
  users: {
    description: "Quản lý tài khoản người dùng và nhật ký thao tác (audit log) của họ.",
    features: [
      "CRUD tài khoản (trừ xoá vĩnh viễn), gán role, đặt lại mật khẩu",
      "Nhật ký thao tác (UserAudit) — filter, xuất Excel/CSV",
      "ADMIN xem/thu hồi phiên đăng nhập của user khác (giám sát toàn hệ thống)",
    ],
  },
  vendors: {
    description: "Quản lý nhà cung cấp (Vendor) và hợp đồng bảo trì (Contract) gắn với tài sản, kèm cảnh báo hợp đồng sắp hết hạn.",
    features: [
      "CRUD Vendor/Contract — 1 hợp đồng có thể gắn nhiều tài sản",
      "Cảnh báo hợp đồng sắp hết hạn tự động (cron hằng ngày)",
      "Section chỉ đọc hiển thị trong Asset Detail",
    ],
  },
};
