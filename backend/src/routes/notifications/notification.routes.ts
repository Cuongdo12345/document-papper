import express from "express";
import * as controller from "../../controllers/notifications/notification.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateBody, validateQuery, validateParams } from "../../middlewares/validate.middleware";
import {
  QueryNotificationDTO,
  BroadcastNotificationDTO,
  QueryAllNotificationsDTO,
} from "../../dto/notifications/notification.dto";
import { IdParamDTO } from "../../dto/common.dto";
import {list, markRead, markAllRead, unreadCount, remove, broadcast, listAll } from "../../controllers/notifications/notification.controller"

const router = express.Router();

// ⚠️ CHỦ ĐÍCH KHÔNG DÙNG `authorizePermission` ở 5 route TỰ-SCOPE bên dưới:
// notification là resource sở hữu theo user (recipient === req.user._id),
// không theo role/permission — quyền truy cập được enforce ở TẦNG SERVICE
// (`notification.service.ts` luôn filter theo `recipient`), giống cách
// `auth.routes.ts` xử lý các endpoint "của chính mình" (change-password,
// profile...).
//
// ⚠️ MỚI (2026-09-10, UI quản trị Notification cho ADMIN): trước đây route
// tạo/xem-toàn-bộ notification KHÔNG expose qua route công khai — chỉ gọi
// nội bộ từ service khác. Nay thêm 2 route RIÊNG BIỆT, CÓ `authorizePermission`
// (khác hẳn 5 route tự-scope ở trên): `POST /broadcast` (gửi) và
// `GET /admin` (xem toàn bộ) — xem `notification.dto.ts`/`notification.service.ts`.

router.get(
  "/",
  authenticate,
  validateQuery(QueryNotificationDTO),
  list,
);

// Đặt TRƯỚC route "/:id"-dạng-động phía dưới — tránh Express match nhầm
// "/unread-count"/"/admin" vào ":id" (không xảy ra ở đây vì method GET khác
// method của các route ":id" bên dưới, nhưng giữ nguyên tắc phòng hờ khi
// sau này thêm `GET /:id`).
router.get("/unread-count", authenticate, unreadCount);

router.get(
  "/admin",
  authenticate,
  authorizePermission("NOTIFICATION_VIEW_ALL"),
  validateQuery(QueryAllNotificationsDTO),
  listAll,
);

router.post(
  "/broadcast",
  authenticate,
  authorizePermission("NOTIFICATION_BROADCAST"),
  validateBody(BroadcastNotificationDTO),
  broadcast,
);

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
