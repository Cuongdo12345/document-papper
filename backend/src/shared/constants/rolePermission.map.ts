import { PERMISSIONS } from "./permission.constant";

//📌 ADMIN có full quyền
//📌 Các role khác chỉ lấy phần cần
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  //ADMIN có full quyền
  ADMIN: [...Object.values(PERMISSIONS), "SYSTEM_ADMIN"],
 //Phân quyền của từng role theo các chức năng
  IT: [
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_UPDATE,
    PERMISSIONS.DOCUMENT_VIEW_DETAIL,
    PERMISSIONS.AUDIT_VIEW,
    //Quyền về phòng ban
    PERMISSIONS.DEPARTMENT_VIEW,
    PERMISSIONS.DEPARTMENT_VIEW_DETAIL,
    PERMISSIONS.DEPARTMENT_CREATE,
    PERMISSIONS.DEPARTMENT_UPDATE,
    PERMISSIONS.DEPARTMENT_DELETE, 
    //Quyền về user
    PERMISSIONS.USER_CHANGE_PASSWORD,
    // PERMISSIONS.USER_VIEW_DETAIL,

    //Quyền về tài sản/thiết bị IT — IT là bộ phận trực tiếp quản lý tài sản
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.ASSET_VIEW_DETAIL,
    PERMISSIONS.ASSET_CREATE,
    PERMISSIONS.ASSET_UPDATE,
    PERMISSIONS.ASSET_DELETE,
    PERMISSIONS.ASSET_ASSIGN,
    PERMISSIONS.ASSET_ALERTS_TRIGGER,
    PERMISSIONS.ASSET_EXCEL_EXPORT,
    PERMISSIONS.ASSET_EXCEL_IMPORT,
    PERMISSIONS.ASSET_INVENTORY_CHECK,
    // ASSET_DELETE_PERMANENT CỐ TÌNH KHÔNG gán ở đây — xoá vĩnh viễn tài
    // sản là thao tác rủi ro cao, chỉ role ADMIN (bypass toàn bộ permission
    // check ở authorizePermission.middleware.ts) mới thực hiện được. Nếu
    // sau này cần cho IT tự xoá vĩnh viễn, thêm dòng
    // `PERMISSIONS.ASSET_DELETE_PERMANENT,` tại đây một cách CÓ CHỦ ĐÍCH.
    PERMISSIONS.ASSET_CATEGORY_VIEW,
    PERMISSIONS.ASSET_CATEGORY_CREATE,
    PERMISSIONS.ASSET_CATEGORY_UPDATE,
    PERMISSIONS.ASSET_CATEGORY_DELETE,
    // ASSET_CATEGORY_DELETE_PERMANENT cũng CỐ TÌNH KHÔNG gán ở đây, cùng lý
    // do với ASSET_DELETE_PERMANENT ở trên.
    

    // Medical Device — module THẬT đang chạy (khác Equipment ở trên, xem
    // cảnh báo chi tiết ở permission.constant.ts). IT là bộ phận quản lý
    // hồ sơ tuân thủ pháp lý thiết bị y tế.
    PERMISSIONS.MEDICAL_DEVICE_CREATE,
    PERMISSIONS.MEDICAL_DEVICE_VIEW,
    PERMISSIONS.MEDICAL_DEVICE_UPDATE,
    // Giai đoạn 2 — ghi nhận kiểm định là hành động có tính pháp lý, chỉ
    // IT thực hiện (không gán cho USER).
    PERMISSIONS.MEDICAL_DEVICE_CALIBRATE,
    // Giai đoạn 3 — chạy tay cảnh báo kiểm định, chỉ IT (cùng nguyên tắc
    // ASSET_ALERTS_TRIGGER).
    PERMISSIONS.MEDICAL_DEVICE_ALERTS_TRIGGER,

    // Dashboard: IT trực tiếp quản lý Document/Asset nên cần xem KPI.
    PERMISSIONS.DASHBOARD_READ,

    // Workflow: IT là role thực hiện các bước duyệt/từ chối trong quy
    // trình (step.role khớp "IT" ở đa số template hiện có). Đây là
    // permission "coarse-grained" (được dùng tính năng workflow nói
    // chung) — quyền duyệt ĐÚNG BƯỚC nào vẫn do `workflow.service.ts` tự
    // kiểm tra `step.role === req.user.role`.
    // WORKFLOW_TEMPLATE_CREATE CỐ TÌNH KHÔNG gán cho IT — thiết kế
    // template quy trình là thay đổi cấu hình hệ thống, để ADMIN.
    PERMISSIONS.WORKFLOW_SUBMIT,
    PERMISSIONS.WORKFLOW_APPROVE,
    PERMISSIONS.WORKFLOW_REJECT,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_CANCEL,
    PERMISSIONS.WORKFLOW_COMPLETE,

    // Excel Document: import/export/sync hàng loạt — rủi ro cao, chỉ IT.
    PERMISSIONS.DOCUMENT_EXCEL_EXPORT,
    PERMISSIONS.DOCUMENT_EXCEL_TEMPLATE,
    PERMISSIONS.DOCUMENT_EXCEL_IMPORT,
    PERMISSIONS.EXCEL_DEPARTMENT_SYNC,
    PERMISSIONS.DOCUMENT_EXCEL_HISTORY,

  ],
  
  //Nơi cấp quyền nếu token trả về role check đk trong này
  USER:[
    // ⚠️ ĐÃ XOÁ `PERMISSIONS.ROLE_CREATE` từng có ở đây — lỗi cấu hình
    // nghiêm trọng: role USER (người dùng thường) không có lý do nghiệp vụ
    // nào để tạo Role RBAC mới, đó là đặc quyền quản trị hệ thống. Vì map
    // này sẽ được `scripts/seed-rbac.ts` đọc trực tiếp để ghi dữ liệu THẬT
    // vào DB, giữ nguyên dòng này sẽ cấp nhầm quyền tạo Role cho mọi user
    // thường ngay khi seed chạy.
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_VIEW_DETAIL,
    PERMISSIONS.DOCUMENT_DELETE,
    PERMISSIONS.DOCUMENT_UPDATE,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.USER_CHANGE_PASSWORD,

    // User thường chỉ được xem tài sản (vd: xem thiết bị mình đang dùng)
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.ASSET_VIEW_DETAIL,
    PERMISSIONS.ASSET_CATEGORY_VIEW,
    // Kiểm kê (quét QR xác nhận còn thấy thiết bị) là hành động vật lý,
    // KHÔNG đổi status/dữ liệu quan trọng — cho phép cả user thường thực
    // hiện (không chỉ IT), vì nhân viên khoa/phòng mới là người trực tiếp
    // cầm máy quét kiểm kê thiết bị của khoa mình.
    PERMISSIONS.ASSET_INVENTORY_CHECK,

    // Medical Device: user thường chỉ xem hồ sơ tuân thủ (vd: xem thiết bị
    // mình đang vận hành có cần chứng chỉ vận hành riêng không).
    PERMISSIONS.MEDICAL_DEVICE_VIEW,

    // Workflow: user là người khởi tạo đề xuất, cần submit/xem/huỷ/hoàn
    // tất đề xuất CỦA CHÍNH MÌNH — quyền theo từng bản ghi cụ thể vẫn do
    // `workflow.service.ts` tự kiểm tra, đây chỉ là cổng chặn mức tính
    // năng. WORKFLOW_APPROVE/REJECT CỐ TÌNH KHÔNG gán — đó là hành động
    // duyệt thuộc về role thực hiện bước duyệt.
    PERMISSIONS.WORKFLOW_SUBMIT,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_CANCEL,
    PERMISSIONS.WORKFLOW_COMPLETE,
  ],
   
// ⚠️ GIAI ĐOẠN 3 (RBAC theo chức danh thật) — 3 role mới, PHỤC VỤ ĐÚNG 1
  // mục đích: được gán vào `WorkflowTemplate.steps[].role` để tham gia
  // duyệt tài liệu theo đúng cơ cấu tổ chức thật (trước đây mọi bước duyệt
  // chỉ có thể gán cho "IT" vì đó là role DUY NHẤT có WORKFLOW_APPROVE
  // ngoài ADMIN — không phản ánh đúng ai thực sự ký duyệt trong bệnh viện).
  //
  // Mỗi role dưới đây được cấp permission Ở MỨC TÍNH NĂNG (coarse-grained,
  // giống pattern IT/USER phía trên) — quyền duyệt ĐÚNG BƯỚC nào của
  // 1 workflow cụ thể vẫn do `workflow.service.ts` tự so khớp
  // `step.role === req.user.role.name`, KHÔNG đổi ở đây.

  // Trưởng khoa — duyệt đề xuất/báo cáo ở cấp khoa (bước đầu quy trình).
  TRUONG_KHOA: [
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_VIEW_DETAIL,
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.ASSET_VIEW_DETAIL,
    PERMISSIONS.MEDICAL_DEVICE_VIEW,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_APPROVE,
    PERMISSIONS.WORKFLOW_REJECT,
    PERMISSIONS.DASHBOARD_READ,
  ],

  // Điều dưỡng trưởng — cùng cấp thẩm quyền với Trưởng khoa trong quy
  // trình duyệt (2 chức danh khác nhau nhưng cùng vai trò "trưởng đơn vị"
  // trong sơ đồ duyệt), tách role riêng để dashboard/audit phân biệt được
  // ai thực sự duyệt (không gộp chung 1 role cho 2 chức danh khác nhau).
  DIEU_DUONG_TRUONG: [
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_VIEW_DETAIL,
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.ASSET_VIEW_DETAIL,
    PERMISSIONS.MEDICAL_DEVICE_VIEW,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_APPROVE,
    PERMISSIONS.WORKFLOW_REJECT,
    PERMISSIONS.DASHBOARD_READ,
  ],

  // Ban Giám đốc — bước duyệt CUỐI CÙNG, thẩm quyền cao nhất trừ ADMIN hệ
  // thống. Cố tình KHÔNG cấp các quyền vận hành/CUD tài sản/tài liệu — vai
  // trò của bước này trong quy trình là PHÊ DUYỆT, không phải người trực
  // tiếp tạo/sửa dữ liệu.
  BAN_GIAM_DOC: [
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_VIEW_DETAIL,
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.ASSET_VIEW_DETAIL,
    PERMISSIONS.MEDICAL_DEVICE_VIEW,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_APPROVE,
    PERMISSIONS.WORKFLOW_REJECT,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.AUDIT_VIEW_DASHBOARD,
  ],
  // Phòng Vật tư - Trang thiết bị y tế — ở nhiều bệnh viện đây là bộ phận
  // TÁCH RIÊNG khỏi IT/CNTT (IT lo máy tính/phần mềm, Vật tư-TTB lo mua
  // sắm/bảo trì thiết bị y tế vật lý). Cấp quyền quản lý Asset/Medical
  // Device tương đương IT — CỘNG THÊM, không rút bớt quyền hiện có của IT,
  // để không phá hành vi hiện tại ở những nơi đang gộp chung 1 người vừa
  // là IT vừa quản vật tư.
  PHONG_VAT_TU_TTB: [
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.ASSET_VIEW_DETAIL,
    PERMISSIONS.ASSET_CREATE,
    PERMISSIONS.ASSET_UPDATE,
    PERMISSIONS.ASSET_DELETE,
    PERMISSIONS.ASSET_ASSIGN,
    PERMISSIONS.ASSET_ALERTS_TRIGGER,
    PERMISSIONS.ASSET_EXCEL_EXPORT,
    PERMISSIONS.ASSET_EXCEL_IMPORT,
    PERMISSIONS.ASSET_INVENTORY_CHECK,
    PERMISSIONS.ASSET_DISPOSE,
    PERMISSIONS.ASSET_CATEGORY_VIEW,
    PERMISSIONS.ASSET_CATEGORY_CREATE,
    PERMISSIONS.ASSET_CATEGORY_UPDATE,
    PERMISSIONS.ASSET_CATEGORY_DELETE,

    PERMISSIONS.MEDICAL_DEVICE_CREATE,
    PERMISSIONS.MEDICAL_DEVICE_VIEW,
    PERMISSIONS.MEDICAL_DEVICE_UPDATE,
    PERMISSIONS.MEDICAL_DEVICE_CALIBRATE,
    PERMISSIONS.MEDICAL_DEVICE_ALERTS_TRIGGER,

    PERMISSIONS.DASHBOARD_READ,

    // Tham gia luồng duyệt đề xuất sửa chữa/mua sắm với vai trò thẩm định
    // kỹ thuật (thường đứng SAU Trưởng khoa, TRƯỚC Ban Giám đốc trong quy
    // trình PROPOSE_REPAIR/PROPOSE_PROCUREMENT).
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_APPROVE,
    PERMISSIONS.WORKFLOW_REJECT,
  ],
};
