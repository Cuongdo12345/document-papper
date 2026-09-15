import { Request, Response } from "express";
import { catchAsync } from "../../shared/utils/catchAsync";
import * as service from "../../services/notifications/notification.service";

/**
 * GET /api/notifications
 * Luôn lấy `recipient` từ `req.user!._id` — KHÔNG bao giờ nhận từ query,
 * để tránh 1 user list được notification của người khác (IDOR). Xem ghi
 * chú tương tự tại `notification.service.ts#markAsRead`.
 */
export const list = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, isRead, type } = req.query as unknown as {
    page: number;
    limit: number;
    isRead?: boolean;
    type?: string;
  };

  const data = await service.getNotificationsForUser(req.user!._id, {
    page,
    limit,
    isRead,
    type,
  });

  res.json({
    success: true,
    message: "Lấy danh sách thông báo thành công",
    data,
  });
});

export const markRead = catchAsync(async (req: Request, res: Response) => {
  const notification = await service.markAsRead(
    req.params.id as string,
    req.user!._id,
  );

  res.json({
    success: true,
    message: "Đánh dấu đã đọc thành công",
    data: notification,
  });
});

export const markAllRead = catchAsync(async (req: Request, res: Response) => {
  const result = await service.markAllAsRead(req.user!._id);

  res.json({
    success: true,
    message: "Đánh dấu tất cả đã đọc thành công",
    data: result,
  });
});

export const unreadCount = catchAsync(async (req: Request, res: Response) => {
  const data = await service.getUnreadCount(req.user!._id);

  res.json({
    success: true,
    message: "Lấy số thông báo chưa đọc thành công",
    data,
  });
});

export const remove = catchAsync(async (req: Request, res: Response) => {
  const data = await service.deleteNotification(
    req.params.id as string,
    req.user!._id,
  );

  res.json({
    success: true,
    message: "Xoá thông báo thành công",
    data,
  });
});

/**
 * POST /api/notifications/broadcast (ADMIN — `NOTIFICATION_BROADCAST`)
 * Soạn + gửi thông báo hệ thống tới nhiều user cùng lúc, xem
 * `notification.dto.ts`/`notification.service.ts` cho bối cảnh đầy đủ.
 */
export const broadcast = catchAsync(async (req: Request, res: Response) => {
  const result = await service.broadcastNotificationService(
    req.user!._id,
    req.body,
  );

  res.status(201).json({
    success: true,
    message: "Đã gửi thông báo",
    data: result,
  });
});

/**
 * GET /api/notifications/admin (ADMIN — `NOTIFICATION_VIEW_ALL`)
 * Xem thông báo của BẤT KỲ user nào — KHÁC `list` ở trên (luôn tự khoá theo
 * `req.user._id`).
 */
export const listAll = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, recipient, isRead, type } = req.query as unknown as {
    page: number;
    limit: number;
    recipient?: string;
    isRead?: boolean;
    type?: string;
  };

  const data = await service.getAllNotificationsAdmin({
    page,
    limit,
    recipient,
    isRead,
    type,
  });

  res.json({
    success: true,
    message: "Lấy toàn bộ thông báo thành công",
    data,
  });
});