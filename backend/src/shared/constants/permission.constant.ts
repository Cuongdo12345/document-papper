//ĐỊNH NGHĨA PERMISSION (RÕ – KHÔNG MƠ HỒ)
export const PERMISSIONS = {
  // USER
  USER_VIEW: "USER_VIEW",
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_DELETE: "USER_DELETE",
  USER_RESTORE: "USER_RESTORE",
  USER_VIEW_DETAIL: "USER_VIEW_DETAIL",
  USER_CHANGE_PASSWORD: "USER_CHANGE_PASSWORD",
  USER_RESET_PASSWORD: "USER_RESET_PASSWORD",

  //ROLE
  ROLE_VIEW: "ROLE_VIEW",
  ROLE_CREATE: "ROLE_CREATE",
  ROLE_UPDATE: "ROLE_UPDATE",
  ROLE_DELETE: "ROLE_DELETE",
  ROLE_ASSIGN_PERMISSIONS: "ROLE_ASSIGN_PERMISSIONS",

  //PERMISSION
  PERMISSION_VIEW: "PERMISSION_VIEW",
  PERMISSION_CREATE: "PERMISSION_CREATE",
  PERMISSION_UPDATE: "PERMISSION_UPDATE",
  PERMISSION_DELETE: "PERMISSION_DELETE",

  // POLICY (ABAC)
  // ⚠️ MỚI: `routes/rbac/rbac.routes.ts` (5 route CRUD /policies*) đã dùng
  // "POLICY_CREATE"/"POLICY_VIEW"/"POLICY_UPDATE"/"POLICY_DELETE" nhưng 4
  // permission này CHƯA từng tồn tại ở đây — route luôn trả 403 với mọi
  // role không phải ADMIN. Định nghĩa đúng khớp tên đã dùng trong route.
  POLICY_VIEW: "POLICY_VIEW",
  POLICY_CREATE: "POLICY_CREATE",
  POLICY_UPDATE: "POLICY_UPDATE",
  POLICY_DELETE: "POLICY_DELETE",

  // DOCUMENT
  DOCUMENT_VIEW: "DOCUMENT_VIEW",
  DOCUMENT_CREATE: "DOCUMENT_CREATE",
  DOCUMENT_VIEW_DETAIL: "DOCUMENT_VIEW_DETAIL",
  DOCUMENT_UPDATE: "DOCUMENT_UPDATE",
  DOCUMENT_DELETE: "DOCUMENT_DELETE",

  // DOCUMENT — EXCEL (import/export/sync hàng loạt)
  // ⚠️ MỚI: `routes/excel/excel.route.ts` (5 route) đã có
  // `authorizePermission` gắn sẵn nhưng dùng permission CHƯA từng định
  // nghĩa — khớp CHÍNH XÁC tên đã dùng trong route (không đổi tên, vì route
  // đã deploy, đổi tên route rủi ro hơn thêm permission mới).
  DOCUMENT_EXCEL_EXPORT: "DOCUMENT_EXCEL_EXPORT",
  DOCUMENT_EXCEL_TEMPLATE: "DOCUMENT_EXCEL_TEMPLATE",
  DOCUMENT_EXCEL_IMPORT: "DOCUMENT_EXCEL_IMPORT",
  EXCEL_DEPARTMENT_SYNC: "EXCEL_DEPARTMENT_SYNC",
  DOCUMENT_EXCEL_HISTORY: "DOCUMENT_EXCEL_HISTORY",

  // WORKFLOW
  // ⚠️ MỚI: `routes/documents/workflow.routes.ts` (9 route) đã có
  // `authorizePermission` gắn sẵn nhưng dùng permission CHƯA từng định
  // nghĩa. Coarse-grained (ai được dùng tính năng workflow nói chung) —
  // KHÔNG thay thế check role-per-step (fine-grained,
  // `step.role === req.user.role`) đã có sẵn trong `workflow.service.ts`.
  WORKFLOW_TEMPLATE_CREATE: "WORKFLOW_TEMPLATE_CREATE",
  WORKFLOW_SUBMIT: "WORKFLOW_SUBMIT",
  WORKFLOW_APPROVE: "WORKFLOW_APPROVE",
  WORKFLOW_REJECT: "WORKFLOW_REJECT",
  WORKFLOW_VIEW: "WORKFLOW_VIEW",
  WORKFLOW_CANCEL: "WORKFLOW_CANCEL",
  WORKFLOW_COMPLETE: "WORKFLOW_COMPLETE",

  // DEPARTMENT
  DEPARTMENT_VIEW: "DEPARTMENT_VIEW",
  DEPARTMENT_VIEW_DETAIL: "DEPARTMENT_VIEW_DETAIL",
  DEPARTMENT_CREATE: "DEPARTMENT_CREATE",
  DEPARTMENT_UPDATE: "DEPARTMENT_UPDATE",
  DEPARTMENT_DELETE: "DEPARTMENT_DELETE",

  // AUDIT
  AUDIT_VIEW: "AUDIT_VIEW",
  AUDIT_VIEW_DETAIL: "AUDIT_VIEW_DETAIL",
  AUDIT_VIEW_DASHBOARD: "AUDIT_VIEW_DASHBOARD",

  // SYSTEM
  SYSTEM_SETTING: "SYSTEM_SETTING",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",

  // DASHBOARD
  // ⚠️ MỚI: `routes/dashboard/dashboard.route.ts` (10 route) dùng
  // "DASHBOARD_READ" nhưng permission này CHƯA từng tồn tại — mọi role
  // không phải ADMIN bị chặn 403 ở toàn bộ dashboard. Khớp đúng tên đã
  // dùng trong route.
  DASHBOARD_READ: "DASHBOARD_READ",

  // ASSET (Giai đoạn 1 — quản lý tài sản/thiết bị IT)
  ASSET_VIEW: "ASSET_VIEW",
  ASSET_VIEW_DETAIL: "ASSET_VIEW_DETAIL",
  ASSET_CREATE: "ASSET_CREATE",
  ASSET_UPDATE: "ASSET_UPDATE",
  ASSET_DELETE: "ASSET_DELETE",
  ASSET_DELETE_PERMANENT: "ASSET_DELETE_PERMANENT", // xoá vĩnh viễn — rủi ro cao, tách riêng khỏi ASSET_DELETE (soft delete)
  ASSET_ASSIGN: "ASSET_ASSIGN", // cấp phát / luân chuyển / thu hồi (Giai đoạn 2)
  ASSET_ALERTS_TRIGGER: "ASSET_ALERTS_TRIGGER", // chạy tay cảnh báo bảo hành/bảo trì (Giai đoạn 4, để test/chạy thủ công ngoài lịch cron)
  ASSET_EXCEL_EXPORT: "ASSET_EXCEL_EXPORT", // xuất Excel hàng loạt (Giai đoạn 5)
  ASSET_EXCEL_IMPORT: "ASSET_EXCEL_IMPORT", // nhập Excel hàng loạt (Giai đoạn 5)
  ASSET_INVENTORY_CHECK: "ASSET_INVENTORY_CHECK", // quét QR kiểm kê / check-in (Giai đoạn 5)
  ASSET_DISPOSE: "ASSET_DISPOSE", // dành cho Giai đoạn 3 (thanh lý qua workflow Document)

  // ASSET CATEGORY
  ASSET_CATEGORY_VIEW: "ASSET_CATEGORY_VIEW",
  ASSET_CATEGORY_CREATE: "ASSET_CATEGORY_CREATE",
  ASSET_CATEGORY_UPDATE: "ASSET_CATEGORY_UPDATE",
  ASSET_CATEGORY_DELETE: "ASSET_CATEGORY_DELETE",
  ASSET_CATEGORY_DELETE_PERMANENT: "ASSET_CATEGORY_DELETE_PERMANENT", // xoá vĩnh viễn — rủi ro cao, cùng nguyên tắc với ASSET_DELETE_PERMANENT

  // MEDICAL DEVICE — module THẬT đang chạy (khác "Equipment" ở trên)
  // ⚠️ MỚI: `routes/assets/medicalDevice.routes.ts` (3 route) đã có
  // `authorizePermission` gắn sẵn nhưng dùng permission CHƯA từng định
  // nghĩa — mọi role không phải ADMIN bị chặn 403 hoàn toàn ở module này.
  MEDICAL_DEVICE_CREATE: "MEDICAL_DEVICE_CREATE",
  MEDICAL_DEVICE_VIEW: "MEDICAL_DEVICE_VIEW",
  MEDICAL_DEVICE_UPDATE: "MEDICAL_DEVICE_UPDATE",
  // Giai đoạn 2 — ghi nhận kiểm định. Permission RIÊNG (không dùng chung
  // MEDICAL_DEVICE_UPDATE) vì đây là hành động nghiệp vụ có tính pháp lý
  // (bằng chứng thanh tra), không phải chỉnh sửa thông tin thông thường —
  // xem module-quan-ly-thiet-bi-y-te.md §4, §5.
  MEDICAL_DEVICE_CALIBRATE: "MEDICAL_DEVICE_CALIBRATE",
  // Giai đoạn 3 — chạy tay cảnh báo kiểm định ngoài lịch cron
  // (POST /api/medical-devices/alerts/run). Mirror đúng ASSET_ALERTS_TRIGGER.
  MEDICAL_DEVICE_ALERTS_TRIGGER: "MEDICAL_DEVICE_ALERTS_TRIGGER",

  // UPLOAD
  UPLOAD_FILES: "UPLOAD_FILES",
  VIEW_FILES: "VIEW_FILES",
  VIEW_FILE_DETAIL: "VIEW_FILE_DETAIL",
  DELETE_FILE: "DELETE_FILE",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
