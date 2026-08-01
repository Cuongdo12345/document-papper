import { Router } from "express";
import { getPerformanceDashboard } from "../../controllers/performances/performance.controller";
import { authenticate } from "../../middlewares/auth.middleware";

// ⚠️ SỬA (review):
//  1. Bỏ import `authorizePermission` — KHÔNG dùng ở đây theo quyết định:
//     phân quyền cho endpoint này chỉ cần check `role.name === "ADMIN"` ở
//     tầng controller (`performance.controller.ts`), không cần permission
//     riêng ở route. Nếu sau này cần cho phép user có quyền cụ thể (không
//     chỉ ADMIN) xem dashboard hiệu năng, thêm lại
//     `authorizePermission("PERFORMANCE_VIEW")` ở đây.
//  2. Bỏ import `performanceMiddleware` — middleware đo thời gian request đã
//     được gắn GLOBAL ở `app.ts` (áp dụng cho mọi request, không riêng route
//     này), import ở đây là thừa/dead code, không có tác dụng gì.
const router = Router();

router.get("/dashboard", authenticate, getPerformanceDashboard);

export default router;