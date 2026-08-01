import express from "express";
import * as controller from "../../controllers/notifications/notification.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { validateQuery, validateParams } from "../../middlewares/validate.middleware";
import { QueryNotificationDTO } from "../../dto/notifications/notification.dto";
import { IdParamDTO } from "../../dto/common.dto";
import {list, markRead, markAllRead, unreadCount, remove } from "../../controllers/notifications/notification.controller"

const router = express.Router();

// ⚠️ CHỦ ĐÍCH KHÔNG DÙNG `authorizePermission` ở đây: notification là
// resource sở hữu theo user (recipient === req.user._id), không theo
// role/permission — quyền truy cập được enforce ở TẦNG SERVICE
// (`notification.service.ts` luôn filter theo `recipient`), giống cách
// `auth.routes.ts` xử lý các endpoint "của chính mình" (change-password,
// profile...). Route tạo notification (broadcast) KHÔNG expose qua route
// công khai trong lượt build này — chỉ gọi nội bộ từ service khác
// (workflow.service.ts...), nên không cần permission riêng ở layer route.

router.get(
  "/",
  authenticate,
  // validateQuery(QueryNotificationDTO),
  list,
);

// Đặt TRƯỚC route "/:id"-dạng-động phía dưới nếu sau này có thêm GET "/:id" —
// hiện tại chưa có nên không xung đột, nhưng giữ thứ tự này để tránh bug
// route-matching quen thuộc (Express match theo thứ tự khai báo).
router.get("/unread-count", authenticate, unreadCount);

router.patch(
  "/:id/read",
  authenticate,
  validateParams(IdParamDTO),
  markRead,
);

router.patch("/read-all", authenticate, markAllRead);

router.delete(
  "/:id",
  authenticate,
  validateParams(IdParamDTO),
  remove,
);

export default router;
