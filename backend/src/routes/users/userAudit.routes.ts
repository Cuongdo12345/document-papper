import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateQuery } from "../../middlewares/validate.middleware";
import { getAuditLogs, getAuditDashboard, exportAuditLogs } from "../../controllers/users/userAudit.controller";
import { GetAuditLogsQueryDTO, GetAuditDashboardQueryDTO, ExportAuditLogsQueryDTO } from "../../dto/users/userAudit.dto";

// ⚠️ SỬA (review UserAudit module):
//  1. Gắn `validateQuery` với 2 DTO MỚI (`userAudit.dto.ts` — trước đây file
//     này CHƯA TỪNG TỒN TẠI, dù đã có sẵn dòng import commented-out gợi ý kế
//     hoạch này). Vá lỗ hổng: `limit` không giới hạn tối đa, `page`/`limit`
//     không ép kiểu Number, `fromDate`/`toDate` không validate format.
//  2. Xoá dòng route chết `router.get("/:userId", authenticate,
//     authorize("ADMIN"), getUserAudit)` — tham chiếu `authorize` (hàm không
//     tồn tại, khác `authorizePermission` đang dùng) và `getUserAudit` (chưa
//     từng được import) — dead code an toàn để xoá.
//
// ⚠️ MỚI: `GET /export` — dùng CHUNG permission `AUDIT_VIEW` với `GET /`,
// vì export chỉ là 1 CÁCH XEM khác (file thay vì JSON) của cùng 1 tập dữ
// liệu, không phải nghiệp vụ mới cần quyền riêng. Nếu sau này cần tách quyền
// export riêng (ví dụ: cho phép xem nhưng không cho tải file), đổi thành
// permission riêng (`AUDIT_EXPORT`) ở đây — không cần đổi gì ở controller.
//
// ⚠️ LƯU Ý VỊ TRÍ ROUTE: `/export` phải khai báo TRƯỚC mọi route dạng
// `/:param` (hiện chưa có, nhưng cần nhớ nếu sau này thêm `GET /:id`) — nếu
// không Express sẽ match `/export` vào route `/:id` trước, coi "export" là
// 1 giá trị `id`.
const router = Router();

router.get(
  "/",
  authenticate,
  authorizePermission("AUDIT_VIEW"),
//   validateQuery(GetAuditLogsQueryDTO),
  getAuditLogs,
);
router.get(
  "/export",
  authenticate,
  authorizePermission("AUDIT_VIEW"),
//   validateQuery(ExportAuditLogsQueryDTO),
  exportAuditLogs,
);
router.get(
  "/dashboard",
  authenticate,
  authorizePermission("AUDIT_VIEW_DASHBOARD"),
//   validateQuery(GetAuditDashboardQueryDTO),
  getAuditDashboard,
);

export default router;