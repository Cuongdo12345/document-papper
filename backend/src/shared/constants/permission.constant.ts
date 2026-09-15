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
  // 🔒 MỚI (TASK-002, docs/tasks/TASK-002.md — Việc 2): permission RIÊNG cho
  // hành động "gán role cho 1 user" (khác USER_UPDATE — cập nhật thông tin
  // user thông thường). Tách riêng để có thể cấp hẹp hơn USER_UPDATE, tránh
  // lặp lại lỗ hổng ISS-01 (coarse-grained permission vô tình cho phép leo
  // thang đặc quyền). Không nhầm với ROLE_ASSIGN_PERMISSIONS (gán permission
  // CHO 1 Role, không phải gán role CHO 1 user).
  USER_ASSIGN_ROLE: "USER_ASSIGN_ROLE",

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
  // 🔒 MỚI (DEV-040, 2026-09-10 — user báo lỗi trực tiếp: "muốn IT được xem
  // tài liệu tất cả các khoa"). Root cause: department-scoping cho Document
  // (DEV-009A/DEV-030) trước đây CHỈ có 1 lối thoát duy nhất — `isAdmin`
  // (role.isSystemRole/name==="ADMIN") — hoàn toàn KHÔNG đi qua hệ thống
  // permission, nên bất kỳ permission nào user gán cho IT qua UI "Phân
  // quyền" (RolePermissionMatrix) đều vô tác dụng với rule này. Permission
  // này là 1 CỜ RIÊNG (không thay thế DOCUMENT_VIEW/DOCUMENT_VIEW_DETAIL —
  // vẫn cần permission đó để được vào route trước) chỉ dùng để BYPASS rule
  // "chỉ xem tài liệu cùng khoa" — xem `getAllDocumentsService`,
  // `getReportsByProposalService` (document.service.ts) và route `:id`
  // (`document.route.ts`, liệt kê alternative permission ở
  // `authorizePermission`). CHỈ ảnh hưởng hành động XEM (list/detail/
  // reports) — CỐ TÌNH không đụng update/delete/restore (không phải điều
  // user yêu cầu, tránh leo thang quyền ngoài ý muốn).
  DOCUMENT_VIEW_ALL_DEPARTMENTS: "DOCUMENT_VIEW_ALL_DEPARTMENTS",

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
  // Roadmap B1 (SLA & nhắc việc, 2026-09-15) — chạy tay kiểm tra nhắc/escalate
  // đề xuất trễ hạn duyệt, mirror đúng ASSET_ALERTS_TRIGGER/MEDICAL_DEVICE_ALERTS_TRIGGER.
  WORKFLOW_SLA_ALERTS_TRIGGER: "WORKFLOW_SLA_ALERTS_TRIGGER",

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
  // Roadmap B2 (Lịch bảo trì chủ động, 2026-09-15) — ĐỘC LẬP với ASSET_ALERTS_TRIGGER
  // (vốn chỉ chạy tay cron cảnh báo PHẢN ỨNG, không liên quan lập lịch CHỦ ĐỘNG).
  ASSET_MAINTENANCE_PLAN_VIEW: "ASSET_MAINTENANCE_PLAN_VIEW",
  ASSET_MAINTENANCE_PLAN_CREATE: "ASSET_MAINTENANCE_PLAN_CREATE",
  ASSET_MAINTENANCE_PLAN_UPDATE: "ASSET_MAINTENANCE_PLAN_UPDATE", // gồm cả sửa/hoàn tất/huỷ — không tách permission riêng cho từng hành động (cùng mức rủi ro, cùng actor)

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

  // PERFORMANCE
  // 🔒 DEV-011/IMP-016 (H-10=SEC-37=RV11-01): `GET /api/performance/dashboard`
  // trước đây KHÔNG có authorization nào (route bỏ `authorizePermission`,
  // controller cũng không tự check role dù docstring/comment ở route.ts mô
  // tả ý định "chỉ ADMIN mới xem được") — bất kỳ user đã đăng nhập nào cũng
  // xem được số liệu hiệu năng nội bộ hệ thống (endpoint/response time/error
  // rate). Định nghĩa permission mới, chỉ gán cho ADMIN (khớp đúng ý định
  // gốc đã ghi ở route.ts — không mở rộng cho role khác, ngoài evidence).
  PERFORMANCE_VIEW: "PERFORMANCE_VIEW",

  // NOTIFICATION — self-scoped list/read/delete (GET /, PATCH /:id/read,
  // PATCH /read-all, DELETE /:id) KHÔNG cần permission, enforce ở TẦNG SERVICE
  // theo `recipient === req.user._id` (xem `notification.routes.ts` comment
  // gốc). 2 permission dưới đây CHỈ dành cho action ẢNH HƯỞNG NGƯỜI KHÁC —
  // mới thêm khi làm UI quản trị Notification cho ADMIN (2026-09-10).
  NOTIFICATION_BROADCAST: "NOTIFICATION_BROADCAST", // soạn + gửi thông báo hệ thống tới nhiều user (tất cả/theo role/theo phòng ban/user cụ thể)
  NOTIFICATION_VIEW_ALL: "NOTIFICATION_VIEW_ALL", // xem thông báo của BẤT KỲ user nào (giám sát/debug) — KHÁC hẳn GET /notifications (luôn tự lọc theo chính người gọi)

  // INVENTORY — Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15). Module MỚI,
  // ĐỘC LẬP hoàn toàn với ASSET_* (tài sản cố định) — xem giải thích ở
  // `consumableItem.interface.ts`.
  CONSUMABLE_VIEW: "CONSUMABLE_VIEW",
  CONSUMABLE_CREATE: "CONSUMABLE_CREATE",
  CONSUMABLE_UPDATE: "CONSUMABLE_UPDATE", // sửa thông tin + bật/tắt isActive — KHÔNG gồm nhập/xuất kho (permission riêng bên dưới)
  CONSUMABLE_TRANSACTION_CREATE: "CONSUMABLE_TRANSACTION_CREATE", // nhập/xuất kho — tách riêng khỏi CONSUMABLE_UPDATE vì đây là hành động vận hành hàng ngày, tần suất/actor có thể khác việc sửa thông tin danh mục
  CONSUMABLE_ALERTS_TRIGGER: "CONSUMABLE_ALERTS_TRIGGER", // chạy tay cảnh báo tồn kho thấp, mirror ASSET_ALERTS_TRIGGER
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
