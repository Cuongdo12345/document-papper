import { PERMISSIONS } from "./permission.constant";

//📌 ADMIN có full quyền
//📌 Các role khác chỉ lấy phần cần
//
// DEV-009A (ABAC — Document department-scoping, 2026-09-06): BỎ
// `PERMISSIONS.DOCUMENT_VIEW_DETAIL` khỏi 5 role dưới đây (IT/USER/
// TRUONG_KHOA/DIEU_DUONG_TRUONG/BAN_GIAM_DOC) — quyết định NGƯỜI DÙNG đã
// xác nhận (docs/development/tasks/DEV-009A.md Mục 3), KHÔNG phải suy đoán.
// Cơ chế `authorizePermission` hiện tại chỉ "cộng thêm" quyền qua Policy
// (bước 6, chỉ chạy khi RBAC bước 4-5 KHÔNG đủ) — giữ permission RBAC rộng
// SONG SONG với Policy hẹp sẽ vô hiệu hoá Policy hoàn toàn (RBAC luôn pass
// trước). Sau thay đổi này, 5 role trên CHỈ xem được chi tiết Document CÙNG
// phòng ban qua Policy `document-view-detail-same-department`
// (`GET /api/documents/:id`, `resource.department===user.department`) —
// ADMIN vẫn full quyền (bypass riêng, không qua map này).
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  //ADMIN có full quyền
  ADMIN: [...Object.values(PERMISSIONS), "SYSTEM_ADMIN"],
 //Phân quyền của từng role theo các chức năng
  IT: [
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_UPDATE,
    // MỚI (DEV-041, 2026-09-11 — user xác nhận CÓ CHỦ ĐÍCH sau khi review
    // RBAC): IT được xoá (mềm) document của MỌI phòng ban — trước đó quyền
    // này đã được gán qua UI "Phân quyền" nhưng KHÔNG có trong file này, nên
    // bị mất khi `seed-rbac.ts` chạy lại đồng bộ role khác (xem DEV-041.md
    // Mục 0). Ghi lại đây để không bị mất lần nữa.
    PERMISSIONS.DOCUMENT_DELETE,
    // MỚI (DEV-041, 2026-09-11 — user xác nhận CÓ CHỦ ĐÍCH, cùng lý do
    // DOCUMENT_DELETE ở trên): IT xem chi tiết document của MỌI phòng ban
    // qua RBAC rộng (route `:id` pass ngay ở bước 4, không cần rơi xuống 3
    // Policy ABAC nữa). ⚠️ CHỒNG CHỨC NĂNG với `DOCUMENT_VIEW_ALL_DEPARTMENTS`
    // ngay dưới đây — quyền đó (DEV-040) đã đủ để IT xem list/detail/reports
    // liên phòng ban qua đường HẸP, có audit rõ mục đích; quyền RỘNG này
    // (vốn bị DEV-009A cố tình bỏ khỏi IT + 4 role khác, xem comment đầu
    // file) giờ cấp lại NGOÀI phạm vi DEV-040 — user đã xác nhận đây là thay
    // đổi mong muốn, không phải nhầm lẫn. KHÔNG áp dụng lại cho 4 role còn
    // lại (USER/TRUONG_KHOA/DIEU_DUONG_TRUONG/BAN_GIAM_DOC) — quyết định
    // DEV-009A vẫn giữ nguyên cho các role đó.
    PERMISSIONS.DOCUMENT_VIEW_DETAIL,
    // (DEV-040, 2026-09-10): IT được xem (list + chi tiết + reports liên
    // quan) tài liệu của TẤT CẢ phòng ban qua đường HẸP, chỉ áp dụng hành
    // động XEM — permission này KHÔNG được service update/delete/restore
    // nào đọc tới (xem `documents.scope.ts`, `permission.constant.ts`).
    PERMISSIONS.DOCUMENT_VIEW_ALL_DEPARTMENTS,
    PERMISSIONS.AUDIT_VIEW,
    //Quyền về phòng ban
    PERMISSIONS.DEPARTMENT_VIEW,
    PERMISSIONS.DEPARTMENT_VIEW_DETAIL,
    PERMISSIONS.DEPARTMENT_CREATE,
    PERMISSIONS.DEPARTMENT_UPDATE,
    PERMISSIONS.DEPARTMENT_DELETE, 
    //Quyền về user — IT được XEM danh sách/chi tiết user (hỗ trợ tài khoản),
    // CỐ TÌNH KHÔNG cấp USER_CREATE/UPDATE/DELETE/RESET_PASSWORD (quản lý tài
    // khoản đầy đủ vẫn là đặc quyền ADMIN — xác nhận qua FE-03, 2026-09-05).
    PERMISSIONS.USER_CHANGE_PASSWORD,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_VIEW_DETAIL,

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
    // Roadmap B2 (2026-09-15) — IT trực tiếp quản lý tài sản nên lên lịch/
    // theo dõi bảo trì chủ động được.
    PERMISSIONS.ASSET_MAINTENANCE_PLAN_VIEW,
    PERMISSIONS.ASSET_MAINTENANCE_PLAN_CREATE,
    PERMISSIONS.ASSET_MAINTENANCE_PLAN_UPDATE,
    // ASSET_DELETE_PERMANENT CỐ TÌNH KHÔNG gán ở đây — xoá vĩnh viễn tài
    // sản là thao tác rủi ro cao, chỉ role ADMIN (bypass toàn bộ permission
    // check ở authorizePermission.middleware.ts) mới thực hiện được. Nếu
    // sau này cần cho IT tự xoá vĩnh viễn, thêm dòng
    // `PERMISSIONS.ASSET_DELETE_PERMANENT,` tại đây một cách CÓ CHỦ ĐÍCH.
    // Roadmap B3 (2026-09-15) — IT cũng quản lý tài sản/vật tư nói chung,
    // mirror đúng bộ quyền ASSET_* ở trên.
    PERMISSIONS.CONSUMABLE_VIEW,
    PERMISSIONS.CONSUMABLE_CREATE,
    PERMISSIONS.CONSUMABLE_UPDATE,
    PERMISSIONS.CONSUMABLE_TRANSACTION_CREATE,
    PERMISSIONS.CONSUMABLE_ALERTS_TRIGGER,
    // Roadmap B8 (DEV-067, 2026-09-18) — IT quản lý vật tư nói chung, mirror
    // đúng bộ quyền CONSUMABLE_REQUEST_* đầy đủ (VIEW/CREATE/UPDATE/FULFILL).
    PERMISSIONS.CONSUMABLE_REQUEST_VIEW,
    PERMISSIONS.CONSUMABLE_REQUEST_CREATE,
    PERMISSIONS.CONSUMABLE_REQUEST_UPDATE,
    PERMISSIONS.CONSUMABLE_REQUEST_FULFILL,
    // Nhóm vật tư (2026-09-16) — IT cũng quản lý danh mục nhóm vật tư, mirror
    // đúng bộ quyền ASSET_CATEGORY_* ở dưới.
    PERMISSIONS.CONSUMABLE_CATEGORY_VIEW,
    PERMISSIONS.CONSUMABLE_CATEGORY_CREATE,
    PERMISSIONS.CONSUMABLE_CATEGORY_UPDATE,
    PERMISSIONS.CONSUMABLE_CATEGORY_DELETE,
    // Roadmap B4 (2026-09-16) — IT cũng làm việc với NCC/hợp đồng bảo trì
    // thiết bị CNTT, mirror đúng bộ quyền ASSET_*/CONSUMABLE_* ở trên.
    PERMISSIONS.VENDOR_VIEW,
    PERMISSIONS.VENDOR_CREATE,
    PERMISSIONS.VENDOR_UPDATE,
    PERMISSIONS.CONTRACT_VIEW,
    PERMISSIONS.CONTRACT_CREATE,
    PERMISSIONS.CONTRACT_UPDATE,
    PERMISSIONS.CONTRACT_ALERTS_TRIGGER,
    // Khôi phục hợp đồng đã huỷ (2026-09-16, DEV-058) — IT trực tiếp quản lý
    // hợp đồng thiết bị CNTT nên cũng được khôi phục khi huỷ nhầm.
    PERMISSIONS.CONTRACT_RESTORE,
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
    // Roadmap B7 (2026-09-18) — chạy tay gửi báo cáo tuần, cùng nguyên tắc
    // ASSET_ALERTS_TRIGGER/WORKFLOW_SLA_ALERTS_TRIGGER (IT đã có cả 2).
    PERMISSIONS.DASHBOARD_WEEKLY_REPORT_TRIGGER,

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
    // Roadmap B1 (2026-09-15) — chạy tay cảnh báo SLA duyệt, cùng nguyên tắc
    // ASSET_ALERTS_TRIGGER/MEDICAL_DEVICE_ALERTS_TRIGGER (IT đã có cả 2).
    PERMISSIONS.WORKFLOW_SLA_ALERTS_TRIGGER,

    // Excel Document: import/export/sync hàng loạt — rủi ro cao, chỉ IT.
    PERMISSIONS.DOCUMENT_EXCEL_EXPORT,
    PERMISSIONS.DOCUMENT_EXCEL_TEMPLATE,
    PERMISSIONS.DOCUMENT_EXCEL_IMPORT,
    PERMISSIONS.EXCEL_DEPARTMENT_SYNC,
    PERMISSIONS.DOCUMENT_EXCEL_HISTORY,

    // DEV-072 (2026-09-21) — trang "System Design" (bản đồ kiến trúc/module
    // nội bộ). IT là role kỹ thuật DUY NHẤT trong 6 role hiện có (không có
    // role "DEV" riêng) — gần nghĩa "dev" nhất để tra cứu kiến trúc hệ
    // thống. ADMIN có sẵn qua wildcard `Object.values(PERMISSIONS)` ở đầu
    // file, không cần liệt kê lại.
    PERMISSIONS.SYSTEM_DESIGN_VIEW,
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
    PERMISSIONS.DOCUMENT_DELETE,
    PERMISSIONS.DOCUMENT_UPDATE,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.USER_CHANGE_PASSWORD,

    // User thường chỉ được xem tài sản (vd: xem thiết bị mình đang dùng)
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.ASSET_VIEW_DETAIL,
    PERMISSIONS.ASSET_CATEGORY_VIEW,
    // Roadmap B3 (2026-09-15) — user thường được XEM tồn kho vật tư của khoa
    // mình (vd kiểm tra còn bao nhiêu vật tư trước khi xin cấp thêm), KHÔNG
    // được tạo/sửa vật tư hay tự nhập/xuất kho — đó là việc của Phòng Vật
    // tư-TTB, cùng nguyên tắc phân quyền view-only đã áp dụng cho ASSET_VIEW.
    PERMISSIONS.CONSUMABLE_VIEW,
    // Roadmap B8 (DEV-067, 2026-09-18) — CHÍNH user thường là người "xin cấp
    // thêm" được nhắc ở comment trên — nay có đường THẬT để ghi nhận nhu cầu
    // đó (đề xuất/dự trù), KHÔNG chỉ xem tồn kho suông. CHỦ Ý KHÔNG có
    // CONSUMABLE_REQUEST_FULFILL (đánh dấu đã mua là việc của Phòng Vật
    // tư-TTB sau khi mua thực tế, không phải người đề xuất tự xác nhận).
    PERMISSIONS.CONSUMABLE_REQUEST_VIEW,
    PERMISSIONS.CONSUMABLE_REQUEST_CREATE,
    PERMISSIONS.CONSUMABLE_REQUEST_UPDATE,
    // Nhóm vật tư (2026-09-16) — user thường được XEM danh mục nhóm vật tư
    // (hiển thị đúng tên nhóm khi xem tồn kho khoa mình), không tạo/sửa/xoá.
    PERMISSIONS.CONSUMABLE_CATEGORY_VIEW,
    // Roadmap B4 (2026-09-16) — user thường được XEM hợp đồng bảo trì/NCC
    // (vd kiểm tra thiết bị mình dùng còn bảo hành/hợp đồng hay không), KHÔNG
    // được tạo/sửa NCC/hợp đồng — cùng nguyên tắc view-only ở trên.
    PERMISSIONS.VENDOR_VIEW,
    PERMISSIONS.CONTRACT_VIEW,
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
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.ASSET_VIEW_DETAIL,
    PERMISSIONS.MEDICAL_DEVICE_VIEW,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_APPROVE,
    PERMISSIONS.WORKFLOW_REJECT,
    PERMISSIONS.DASHBOARD_READ,
    // ⚠️ SỬA (FE-14 Profile UI, 2026-09-10 — phát hiện khi build màn Đổi mật
    // khẩu): 4 role "Giai đoạn 3" (TRUONG_KHOA/DIEU_DUONG_TRUONG/BAN_GIAM_DOC/
    // PHONG_VAT_TU_TTB) THIẾU `USER_CHANGE_PASSWORD` — action tự-scope
    // (`changePasswordUser` luôn dùng `req.user!._id`, không có tham số user
    // khác), không có lý do nghiệp vụ nào để loại trừ 4 role này. Bổ sung để
    // KHỚP với IT/USER đã có sẵn.
    PERMISSIONS.USER_CHANGE_PASSWORD,
  ],

  // Điều dưỡng trưởng — cùng cấp thẩm quyền với Trưởng khoa trong quy
  // trình duyệt (2 chức danh khác nhau nhưng cùng vai trò "trưởng đơn vị"
  // trong sơ đồ duyệt), tách role riêng để dashboard/audit phân biệt được
  // ai thực sự duyệt (không gộp chung 1 role cho 2 chức danh khác nhau).
  DIEU_DUONG_TRUONG: [
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.ASSET_VIEW_DETAIL,
    PERMISSIONS.MEDICAL_DEVICE_VIEW,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_APPROVE,
    PERMISSIONS.WORKFLOW_REJECT,
    PERMISSIONS.DASHBOARD_READ,
    // Xem chú thích ở TRUONG_KHOA (FE-14) — cùng lý do.
    PERMISSIONS.USER_CHANGE_PASSWORD,
  ],

  // Ban Giám đốc — bước duyệt CUỐI CÙNG, thẩm quyền cao nhất trừ ADMIN hệ
  // thống. Cố tình KHÔNG cấp các quyền vận hành/CUD tài sản/tài liệu — vai
  // trò của bước này trong quy trình là PHÊ DUYỆT, không phải người trực
  // tiếp tạo/sửa dữ liệu.
  BAN_GIAM_DOC: [
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.ASSET_VIEW_DETAIL,
    PERMISSIONS.MEDICAL_DEVICE_VIEW,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_APPROVE,
    PERMISSIONS.WORKFLOW_REJECT,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.AUDIT_VIEW_DASHBOARD,
    // Xem chú thích ở TRUONG_KHOA (FE-14) — cùng lý do.
    PERMISSIONS.USER_CHANGE_PASSWORD,
  ],
  // Phòng Vật tư - Trang thiết bị y tế — ở nhiều bệnh viện đây là bộ phận
  // TÁCH RIÊNG khỏi IT/CNTT (IT lo máy tính/phần mềm, Vật tư-TTB lo mua
  // sắm/bảo trì thiết bị y tế vật lý). Cấp quyền quản lý Asset/Medical
  // Device tương đương IT — CỘNG THÊM, không rút bớt quyền hiện có của IT,
  // để không phá hành vi hiện tại ở những nơi đang gộp chung 1 người vừa
  // là IT vừa quản vật tư.
  PHONG_VAT_TU_TTB: [
    // ⚠️ SỬA (DEV-034, 2026-09-06 — bug user báo trực tiếp, tài khoản
    // `phongkhth`): role này THIẾU HẲN `DOCUMENT_VIEW` từ lúc tạo (Giai đoạn
    // 3) — hệ quả: (a) FE route `/app/documents/*` (guard `DOCUMENT_VIEW` ở
    // route cha, xem `routes/index.tsx`) chặn cứng NGAY LẬP TỨC, redirect
    // "/403" trước cả khi gọi API; (b) `GET /documents` (list) cũng luôn 403
    // vì route đó CHỈ có RBAC, không có nhánh ABAC. Thêm quyền này để khớp
    // với 3 role duyệt khác đã có sẵn (`TRUONG_KHOA`/`DIEU_DUONG_TRUONG`/
    // `BAN_GIAM_DOC`).
    //
    // Cố tình KHÔNG thêm `DOCUMENT_VIEW_DETAIL` (RBAC rộng) ở đây — giữ đúng
    // tinh thần DEV-009A (approver chỉ xem chi tiết Document CÙNG phòng ban
    // qua RBAC; role nào cần xem LIÊN phòng ban phải qua Policy hẹp, không
    // phải nới RBAC cho cả role). Role này CẦN xem liên phòng ban thật (đứng
    // SAU Trưởng khoa, thẩm định kỹ thuật cho MỌI khoa) — giải quyết bằng
    // Policy mới `document-view-detail-pending-approver`
    // (`loadDocument.middleware.ts` gắn `resource.pendingApproverRole`, chỉ
    // pass khi ĐANG là bước chờ duyệt của CHÍNH role này, không phải mọi lúc).
    //
    // [DEV-034] Xác nhận qua HTTP thật: DB hiện tại (trước khi sync task này)
    // đã LỆCH khỏi file này — có `DOCUMENT_VIEW_DETAIL` (rộng, không nằm
    // trong list dưới đây) NHƯNG THIẾU `WORKFLOW_REJECT` (có trong list dưới
    // đây) so với dữ liệu thật trong role `PHONG_VAT_TU_TTB`. Đã đồng bộ lại
    // DB qua API `assign-permissions` cho khớp đúng danh sách dưới đây (xem
    // DEV-034.md Mục Execution Log) — không chạy `seed-rbac.ts` (rủi ro reset
    // toàn bộ role khác, cùng lý do đã ghi ở DEV-009A/DEV-027).
    PERMISSIONS.DOCUMENT_VIEW,

    // ⚠️ SỬA (DEV-035, 2026-09-07 — user yêu cầu trực tiếp, tiếp nối phát
    // hiện phụ ở FE-06 Remaining Issues #2-3): role này có `ASSET_CREATE`/
    // `ASSET_ASSIGN` NHƯNG THIẾU `DEPARTMENT_VIEW`/`USER_VIEW` — hệ quả:
    // (a) `AssetCreatePage` không load được danh sách khoa/phòng, phải khoá
    // cứng field "Khoa/Phòng" về khoa của CHÍNH role này — sai nghiệp vụ
    // thật (Phòng Vật tư-TTB trang bị tài sản CHO CÁC khoa khác, không chỉ
    // khoa của mình, cùng lý do IT đã có sẵn `DEPARTMENT_VIEW`); (b)
    // `AssetAssignModal`/`AssetTransferModal` không chọn được người dùng cụ
    // thể khi cấp phát/luân chuyển (chỉ gán được cho cả khoa/phòng). Cấp 2
    // quyền này khớp ĐÚNG lý do IT đã được cấp trước đó (DEV-027 cho
    // `USER_VIEW`: "hỗ trợ tài khoản"; nghiệp vụ liên phòng ban vốn có sẵn
    // cho IT) — không phải nới quyền tuỳ tiện, mà đồng bộ 1 role có CÙNG
    // nhu cầu nghiệp vụ liên phòng ban với IT nhưng bị bỏ sót lúc tạo role
    // (Giai đoạn 3). Departments/Users là dữ liệu tham chiếu KHÔNG sensitive
    // (không có password/token) — rủi ro thấp.
    PERMISSIONS.DEPARTMENT_VIEW,
    PERMISSIONS.USER_VIEW,

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
    // Roadmap B2 (2026-09-15) — Phòng Vật tư-TTB là bộ phận chủ động lên
    // lịch bảo trì thiết bị theo đúng nghiệp vụ roadmap mô tả.
    PERMISSIONS.ASSET_MAINTENANCE_PLAN_VIEW,
    PERMISSIONS.ASSET_MAINTENANCE_PLAN_CREATE,
    PERMISSIONS.ASSET_MAINTENANCE_PLAN_UPDATE,
    // Roadmap B3 (2026-09-15) — Phòng Vật tư-TTB là bộ phận trực tiếp quản
    // lý vật tư tiêu hao (nhập/xuất kho hàng ngày, nhận cảnh báo tồn kho
    // thấp), đúng theo nghiệp vụ roadmap mô tả.
    PERMISSIONS.CONSUMABLE_VIEW,
    PERMISSIONS.CONSUMABLE_CREATE,
    PERMISSIONS.CONSUMABLE_UPDATE,
    PERMISSIONS.CONSUMABLE_TRANSACTION_CREATE,
    PERMISSIONS.CONSUMABLE_ALERTS_TRIGGER,
    // Roadmap B8 (DEV-067, 2026-09-18) — Phòng Vật tư-TTB là bộ phận trực
    // tiếp xử lý đề xuất/dự trù vật tư của các khoa/phòng (xem + đánh dấu đã
    // mua), mirror đúng bộ quyền CONSUMABLE_REQUEST_* đầy đủ.
    PERMISSIONS.CONSUMABLE_REQUEST_VIEW,
    PERMISSIONS.CONSUMABLE_REQUEST_CREATE,
    PERMISSIONS.CONSUMABLE_REQUEST_UPDATE,
    PERMISSIONS.CONSUMABLE_REQUEST_FULFILL,
    // Nhóm vật tư (2026-09-16) — Phòng Vật tư-TTB là bộ phận trực tiếp quản
    // lý danh mục nhóm vật tư, đúng theo nghiệp vụ.
    PERMISSIONS.CONSUMABLE_CATEGORY_VIEW,
    PERMISSIONS.CONSUMABLE_CATEGORY_CREATE,
    PERMISSIONS.CONSUMABLE_CATEGORY_UPDATE,
    PERMISSIONS.CONSUMABLE_CATEGORY_DELETE,
    // Roadmap B4 (2026-09-16) — Phòng Vật tư-TTB là bộ phận trực tiếp làm
    // việc với NCC, ký/theo dõi hợp đồng bảo trì, nhận cảnh báo hợp đồng sắp
    // hết hạn, đúng theo nghiệp vụ roadmap mô tả.
    PERMISSIONS.VENDOR_VIEW,
    PERMISSIONS.VENDOR_CREATE,
    PERMISSIONS.VENDOR_UPDATE,
    PERMISSIONS.CONTRACT_VIEW,
    PERMISSIONS.CONTRACT_CREATE,
    PERMISSIONS.CONTRACT_UPDATE,
    PERMISSIONS.CONTRACT_ALERTS_TRIGGER,
    // Khôi phục hợp đồng đã huỷ (2026-09-16, DEV-058) — Phòng Vật tư-TTB là
    // bộ phận trực tiếp ký/theo dõi hợp đồng nên cũng được khôi phục khi huỷ
    // nhầm.
    PERMISSIONS.CONTRACT_RESTORE,
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
    // Roadmap B1 (2026-09-15) — cùng nguyên tắc ASSET_ALERTS_TRIGGER/
    // MEDICAL_DEVICE_ALERTS_TRIGGER (role này đã có cả 2 ở trên).
    PERMISSIONS.WORKFLOW_SLA_ALERTS_TRIGGER,

    // Xem chú thích ở TRUONG_KHOA (FE-14) — cùng lý do.
    PERMISSIONS.USER_CHANGE_PASSWORD,

    // ⚠️ SỬA (2026-09-10, FE-15 phát hiện, user yêu cầu xử lý tiếp): role
    // này có ASSET_EXCEL_IMPORT (import tài sản qua Excel) nhưng THIẾU
    // DOCUMENT_EXCEL_HISTORY — permission DUY NHẤT gate
    // `GET /export/import-history`, endpoint DÙNG CHUNG cho cả Document
    // VÀ Asset vì `ImportHistory` là 1 collection không phân biệt domain
    // (`excel.service.ts` `listImportHistory`). Thiếu quyền này khiến role
    // import được Asset nhưng KHÔNG xem lại được lịch sử import CỦA CHÍNH
    // MÌNH. CỐ TÌNH KHÔNG đổi tên permission (dù tên gợi ý "Document") —
    // đi đúng tiền lệ đã ghi ở comment đầu khối DOCUMENT EXCEL phía trên
    // ("đổi tên route rủi ro hơn thêm permission mới"); mô tả seed sẵn có
    // ("Xem lịch sử nhập Excel", `seed-rbac.ts`) đã trung lập, không ghi
    // riêng Document. An toàn vì `getImportHistory` controller luôn lọc
    // `importedBy: req.user._id` cho user không phải ADMIN — chỉ lộ đúng
    // lịch sử của chính role này, không xem được của người khác.
    PERMISSIONS.DOCUMENT_EXCEL_HISTORY,
  ],
};
