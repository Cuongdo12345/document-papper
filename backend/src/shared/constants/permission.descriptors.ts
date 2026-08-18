/**
 * permission.descriptors.ts
 * ---------------------------------------------------------------------------
 * Bảng mô tả đầy đủ (resource / action / description) cho MỌI permission
 * định nghĩa trong `permission.constant.ts`.
 *
 * VÌ SAO CẦN FILE NÀY (thay vì tự tách resource/action từ tên permission
 * bằng regex/split chuỗi ngay trong script seed):
 *   - Tên permission như "MEDICAL_EQUIPMENT_CATEGORY_DELETE_PERMANENT"
 *     không thể tách đúng resource/action một cách máy móc. Khai báo tường
 *     minh từng dòng ở đây tránh sai sót.
 *   - `resource`/`action` là 2 field BẮT BUỘC (`required: true`) trong
 *     `models/rbac/permission.model.ts`.
 *
 * AN TOÀN CHỐNG LỆCH DỮ LIỆU:
 *   File này tự kiểm tra ngay lúc được import: nếu `PERMISSIONS` có key nào
 *   chưa được mô tả ở đây, hoặc có dòng nào ở đây trỏ tới 1 permission
 *   không còn tồn tại trong `PERMISSIONS` — ném lỗi ngay lập tức, KHÔNG âm
 *   thầm bỏ sót. Đây chính là cơ chế lẽ ra đã ngăn được lỗi permission-string
 *   không khớp (DASHBOARD_READ, POLICY_CREATE, WORKFLOW_*,
 *   MEDICAL_DEVICE_*...) mà đợt review phát hiện — từ nay nếu ai thêm
 *   permission mới vào `permission.constant.ts` mà quên khai ở đây,
 *   `npm run seed:rbac` sẽ báo lỗi ngay, không để lọt tới production.
 *
 * ⚠️ LƯU Ý ĐẶC BIỆT — nhóm `MEDICAL_EQUIPMENT_*` (từng có, ĐÃ XOÁ):
 *   Nhóm 13-15 permission này từng tồn tại song song với `MEDICAL_DEVICE_*`
 *   (module Quản lý Thiết bị Y tế thật đang chạy) mà KHÔNG được dùng ở bất
 *   kỳ route/controller nào — đã xác nhận là tàn dư từ 1 nỗ lực phát triển
 *   khác, không liên quan tài liệu thiết kế `module-quan-ly-thiet-bi-y-te.md`
 *   (xem lịch sử trao đổi). Team đã quyết định XOÁ hẳn khỏi
 *   `permission.constant.ts` (không giữ lại "phòng khi cần sau") — file này
 *   ĐÃ được dọn theo, không còn descriptor nào trỏ tới nhóm Equipment nữa.
 *   Nếu cơ chế tự-kiểm-tra bên dưới từng báo lỗi "orphan descriptor" ở đây,
 *   đó là do đợt xoá `permission.constant.ts` chưa đồng bộ sang file này —
 *   đã xử lý xong ở lần sửa gần nhất.
 */

import { PERMISSIONS, Permission as PermissionName } from "./permission.constant";

export interface PermissionDescriptor {
  name: PermissionName;
  resource: string;
  action: string;
  description: string;
}

export const PERMISSION_DESCRIPTORS: PermissionDescriptor[] = [
  // ───────────────────────── USER ─────────────────────────
  { name: PERMISSIONS.USER_VIEW, resource: "user", action: "view", description: "Xem danh sách user" },
  { name: PERMISSIONS.USER_CREATE, resource: "user", action: "create", description: "Tạo user mới" },
  { name: PERMISSIONS.USER_UPDATE, resource: "user", action: "update", description: "Cập nhật thông tin user" },
  { name: PERMISSIONS.USER_DELETE, resource: "user", action: "delete", description: "Vô hiệu hoá (soft-delete) user" },
  { name: PERMISSIONS.USER_RESTORE, resource: "user", action: "restore", description: "Khôi phục user đã vô hiệu hoá" },
  { name: PERMISSIONS.USER_VIEW_DETAIL, resource: "user", action: "view_detail", description: "Xem chi tiết 1 user" },
  { name: PERMISSIONS.USER_CHANGE_PASSWORD, resource: "user", action: "change_password", description: "Tự đổi mật khẩu (của chính mình)" },
  { name: PERMISSIONS.USER_RESET_PASSWORD, resource: "user", action: "reset_password", description: "Đặt lại mật khẩu cho user khác" },

  // ───────────────────────── ROLE ─────────────────────────
  { name: PERMISSIONS.ROLE_VIEW, resource: "role", action: "view", description: "Xem danh sách Role" },
  { name: PERMISSIONS.ROLE_CREATE, resource: "role", action: "create", description: "Tạo Role mới" },
  { name: PERMISSIONS.ROLE_UPDATE, resource: "role", action: "update", description: "Cập nhật Role" },
  { name: PERMISSIONS.ROLE_DELETE, resource: "role", action: "delete", description: "Xoá Role" },
  { name: PERMISSIONS.ROLE_ASSIGN_PERMISSIONS, resource: "role", action: "assign_permissions", description: "Gán/thu hồi Permission cho Role" },

  // ─────────────────────── PERMISSION ──────────────────────
  { name: PERMISSIONS.PERMISSION_VIEW, resource: "permission", action: "view", description: "Xem danh sách Permission" },
  { name: PERMISSIONS.PERMISSION_CREATE, resource: "permission", action: "create", description: "Tạo Permission mới" },
  { name: PERMISSIONS.PERMISSION_UPDATE, resource: "permission", action: "update", description: "Cập nhật Permission" },
  { name: PERMISSIONS.PERMISSION_DELETE, resource: "permission", action: "delete", description: "Xoá Permission" },

  // ──────────────────────── POLICY (ABAC) ───────────────────
  { name: PERMISSIONS.POLICY_VIEW, resource: "policy", action: "view", description: "Xem danh sách Policy (điều kiện ABAC)" },
  { name: PERMISSIONS.POLICY_CREATE, resource: "policy", action: "create", description: "Tạo Policy mới" },
  { name: PERMISSIONS.POLICY_UPDATE, resource: "policy", action: "update", description: "Cập nhật Policy" },
  { name: PERMISSIONS.POLICY_DELETE, resource: "policy", action: "delete", description: "Xoá Policy" },

  // ───────────────────────── DOCUMENT ────────────────────────
  { name: PERMISSIONS.DOCUMENT_VIEW, resource: "document", action: "view", description: "Xem danh sách Document (Đề xuất/Biên bản)" },
  { name: PERMISSIONS.DOCUMENT_CREATE, resource: "document", action: "create", description: "Tạo Document mới" },
  { name: PERMISSIONS.DOCUMENT_VIEW_DETAIL, resource: "document", action: "view_detail", description: "Xem chi tiết 1 Document" },
  { name: PERMISSIONS.DOCUMENT_UPDATE, resource: "document", action: "update", description: "Cập nhật Document" },
  { name: PERMISSIONS.DOCUMENT_DELETE, resource: "document", action: "delete", description: "Xoá (soft-delete) Document" },

  // ────────────────── DOCUMENT — EXCEL (hàng loạt) ──────────────
  { name: PERMISSIONS.DOCUMENT_EXCEL_EXPORT, resource: "document_excel", action: "export", description: "Xuất danh sách Document ra file Excel" },
  { name: PERMISSIONS.DOCUMENT_EXCEL_TEMPLATE, resource: "document_excel", action: "template", description: "Tải file mẫu trước khi import" },
  { name: PERMISSIONS.DOCUMENT_EXCEL_IMPORT, resource: "document_excel", action: "import", description: "Nhập Document hàng loạt từ file Excel" },
  { name: PERMISSIONS.EXCEL_DEPARTMENT_SYNC, resource: "document_excel", action: "sync_department", description: "Đồng bộ dữ liệu Department từ file Excel (rủi ro cao)" },
  { name: PERMISSIONS.DOCUMENT_EXCEL_HISTORY, resource: "document_excel", action: "view_history", description: "Xem lịch sử các lần import Excel" },

  // ───────────────────────── WORKFLOW ────────────────────────
  { name: PERMISSIONS.WORKFLOW_TEMPLATE_CREATE, resource: "workflow", action: "template_create", description: "Tạo template quy trình duyệt" },
  { name: PERMISSIONS.WORKFLOW_SUBMIT, resource: "workflow", action: "submit", description: "Gửi Document vào quy trình duyệt" },
  { name: PERMISSIONS.WORKFLOW_APPROVE, resource: "workflow", action: "approve", description: "Duyệt 1 bước trong quy trình" },
  { name: PERMISSIONS.WORKFLOW_REJECT, resource: "workflow", action: "reject", description: "Từ chối 1 bước trong quy trình" },
  { name: PERMISSIONS.WORKFLOW_VIEW, resource: "workflow", action: "view", description: "Xem trạng thái/danh sách WorkflowInstance" },
  { name: PERMISSIONS.WORKFLOW_CANCEL, resource: "workflow", action: "cancel", description: "Huỷ quy trình đang chạy" },
  { name: PERMISSIONS.WORKFLOW_COMPLETE, resource: "workflow", action: "complete", description: "Đánh dấu hoàn tất quy trình" },

  // ───────────────────────── DEPARTMENT ──────────────────────
  { name: PERMISSIONS.DEPARTMENT_VIEW, resource: "department", action: "view", description: "Xem danh sách phòng ban" },
  { name: PERMISSIONS.DEPARTMENT_VIEW_DETAIL, resource: "department", action: "view_detail", description: "Xem chi tiết phòng ban" },
  { name: PERMISSIONS.DEPARTMENT_CREATE, resource: "department", action: "create", description: "Tạo phòng ban mới" },
  { name: PERMISSIONS.DEPARTMENT_UPDATE, resource: "department", action: "update", description: "Cập nhật phòng ban" },
  { name: PERMISSIONS.DEPARTMENT_DELETE, resource: "department", action: "delete", description: "Xoá phòng ban" },

  // ───────────────────────── AUDIT ───────────────────────────
  { name: PERMISSIONS.AUDIT_VIEW, resource: "audit", action: "view", description: "Xem nhật ký (audit log) của user" },
  { name: PERMISSIONS.AUDIT_VIEW_DETAIL, resource: "audit", action: "view_detail", description: "Xem chi tiết 1 bản ghi audit" },
  { name: PERMISSIONS.AUDIT_VIEW_DASHBOARD, resource: "audit", action: "view_dashboard", description: "Xem thống kê tổng hợp audit log" },

  // ───────────────────────── SYSTEM ──────────────────────────
  { name: PERMISSIONS.SYSTEM_SETTING, resource: "system", action: "setting", description: "Sửa cấu hình hệ thống" },
  { name: PERMISSIONS.SYSTEM_ADMIN, resource: "system", action: "admin", description: "Quyền quản trị hệ thống toàn bộ (đi kèm cờ bypass mọi permission check khi role.name === \"ADMIN\")" },

  // ───────────────────────── DASHBOARD ───────────────────────
  { name: PERMISSIONS.DASHBOARD_READ, resource: "dashboard", action: "read", description: "Xem KPI/thống kê tổng hợp Document + Asset" },

  // ───────────────────────── ASSET ───────────────────────────
  { name: PERMISSIONS.ASSET_VIEW, resource: "asset", action: "view", description: "Xem danh sách tài sản/thiết bị" },
  { name: PERMISSIONS.ASSET_VIEW_DETAIL, resource: "asset", action: "view_detail", description: "Xem chi tiết 1 tài sản" },
  { name: PERMISSIONS.ASSET_CREATE, resource: "asset", action: "create", description: "Tạo tài sản mới" },
  { name: PERMISSIONS.ASSET_UPDATE, resource: "asset", action: "update", description: "Cập nhật tài sản" },
  { name: PERMISSIONS.ASSET_DELETE, resource: "asset", action: "delete", description: "Xoá (soft-delete) tài sản" },
  { name: PERMISSIONS.ASSET_DELETE_PERMANENT, resource: "asset", action: "delete_permanent", description: "Xoá vĩnh viễn tài sản (rủi ro cao)" },
  { name: PERMISSIONS.ASSET_DISPOSE, resource: "asset", action: "dispose", description: "Thanh lý tài sản (qua workflow Document)" },
  { name: PERMISSIONS.ASSET_ASSIGN, resource: "asset", action: "assign", description: "Cấp phát / luân chuyển / thu hồi tài sản" },
  { name: PERMISSIONS.ASSET_ALERTS_TRIGGER, resource: "asset", action: "alerts_trigger", description: "Chạy tay cảnh báo bảo hành/bảo trì" },
  { name: PERMISSIONS.ASSET_EXCEL_EXPORT, resource: "asset", action: "excel_export", description: "Xuất danh sách tài sản ra Excel" },
  { name: PERMISSIONS.ASSET_EXCEL_IMPORT, resource: "asset", action: "excel_import", description: "Nhập tài sản hàng loạt từ Excel" },
  { name: PERMISSIONS.ASSET_INVENTORY_CHECK, resource: "asset", action: "inventory_check", description: "Quét QR kiểm kê / check-in tài sản" },

  // ─────────────────────── ASSET CATEGORY ────────────────────
  { name: PERMISSIONS.ASSET_CATEGORY_VIEW, resource: "asset_category", action: "view", description: "Xem danh sách loại tài sản" },
  { name: PERMISSIONS.ASSET_CATEGORY_CREATE, resource: "asset_category", action: "create", description: "Tạo loại tài sản mới" },
  { name: PERMISSIONS.ASSET_CATEGORY_UPDATE, resource: "asset_category", action: "update", description: "Cập nhật loại tài sản" },
  { name: PERMISSIONS.ASSET_CATEGORY_DELETE, resource: "asset_category", action: "delete", description: "Xoá (soft-delete) loại tài sản" },
  { name: PERMISSIONS.ASSET_CATEGORY_DELETE_PERMANENT, resource: "asset_category", action: "delete_permanent", description: "Xoá vĩnh viễn loại tài sản (rủi ro cao)" },

  // ───────── MEDICAL DEVICE — module THẬT đang chạy ─────────
  { name: PERMISSIONS.MEDICAL_DEVICE_CREATE, resource: "medical_device", action: "create", description: "Gắn profile tuân thủ pháp lý (thiết bị y tế) cho 1 Asset" },
  { name: PERMISSIONS.MEDICAL_DEVICE_VIEW, resource: "medical_device", action: "view", description: "Xem profile tuân thủ pháp lý / lịch sử kiểm định của 1 Asset" },
  { name: PERMISSIONS.MEDICAL_DEVICE_UPDATE, resource: "medical_device", action: "update", description: "Cập nhật profile tuân thủ pháp lý" },
  { name: PERMISSIONS.MEDICAL_DEVICE_CALIBRATE, resource: "medical_device", action: "calibrate", description: "Ghi nhận 1 lần kiểm định/hiệu chuẩn mới (Giai đoạn 2)" },
  { name: PERMISSIONS.MEDICAL_DEVICE_ALERTS_TRIGGER, resource: "medical_device", action: "alerts_trigger", description: "Chạy tay cảnh báo sắp/đã quá hạn kiểm định (Giai đoạn 3, ngoài lịch cron)" },

  // ───────────────────────── UPLOAD ──────────────────────────
  { name: PERMISSIONS.UPLOAD_FILES, resource: "upload", action: "create", description: "Upload file mới" },
  { name: PERMISSIONS.VIEW_FILES, resource: "upload", action: "view", description: "Xem danh sách file đã upload" },
  { name: PERMISSIONS.VIEW_FILE_DETAIL, resource: "upload", action: "view_detail", description: "Xem chi tiết 1 file đã upload" },
  { name: PERMISSIONS.DELETE_FILE, resource: "upload", action: "delete", description: "Xoá file đã upload" },
];

// ─────────────────────────────────────────────────────────────────────────
// TỰ KIỂM TRA NGAY LÚC IMPORT — không suy đoán, không âm thầm bỏ sót.
// ─────────────────────────────────────────────────────────────────────────
const definedNames = new Set<string>(Object.values(PERMISSIONS));
const describedNames = new Set<string>(PERMISSION_DESCRIPTORS.map((d) => d.name));

const missingDescriptors = [...definedNames].filter((n) => !describedNames.has(n));
const orphanDescriptors = [...describedNames].filter((n) => !definedNames.has(n));

if (missingDescriptors.length > 0 || orphanDescriptors.length > 0) {
  const lines: string[] = [
    "[permission.descriptors.ts] Lệch dữ liệu giữa PERMISSIONS (permission.constant.ts) và PERMISSION_DESCRIPTORS (file này):",
  ];
  if (missingDescriptors.length > 0) {
    lines.push(`  - Permission ĐÃ định nghĩa trong PERMISSIONS nhưng CHƯA có descriptor: ${missingDescriptors.join(", ")}`);
    lines.push(`    → Thêm 1 dòng { name: PERMISSIONS.${missingDescriptors[0]}, resource: "...", action: "...", description: "..." } vào PERMISSION_DESCRIPTORS.`);
  }
  if (orphanDescriptors.length > 0) {
    lines.push(`  - Descriptor thừa (trỏ tới permission KHÔNG còn tồn tại trong PERMISSIONS): ${orphanDescriptors.join(", ")}`);
    lines.push(`    → Xoá dòng tương ứng khỏi PERMISSION_DESCRIPTORS, hoặc thêm lại permission đó vào PERMISSIONS nếu bị xoá nhầm.`);
  }
  throw new Error(lines.join("\n"));
}
