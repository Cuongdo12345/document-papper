import { Router } from "express";
import { getPerformanceDashboard } from "../../controllers/performances/performance.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";

// DEV-011/IMP-016 (H-10=SEC-37=RV11-01): comment cũ ở đây từng nói phân
// quyền "chỉ cần check role.name === 'ADMIN' ở tầng controller" — nhưng
// `performance.controller.ts` KHÔNG HỀ có check đó (đã xác minh qua source),
// nên endpoint này thực tế 0 authorization — bất kỳ user đã `authenticate`
// nào cũng xem được. Nay bật lại đúng cách đã gợi ý sẵn trong comment cũ:
// `authorizePermission("PERFORMANCE_VIEW")` — permission mới, chỉ gán cho
// ADMIN (`permission.constant.ts`), khớp đúng ý định gốc "chỉ ADMIN".
//
// Bỏ import `performanceMiddleware` — middleware đo thời gian request đã
// được gắn GLOBAL ở `app.ts` (áp dụng cho mọi request, không riêng route
// này), import ở đây là thừa/dead code, không có tác dụng gì.
const router = Router();

router.get(
  "/dashboard",
  authenticate,
  authorizePermission("PERFORMANCE_VIEW"),
  getPerformanceDashboard,
);

export default router;