import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type {
  GetNotificationsParams,
  GetNotificationsResult,
  NotificationItem,
  GetAllNotificationsParams,
  GetAllNotificationsResult,
  BroadcastNotificationRequest,
  BroadcastNotificationResult,
} from "@/types/notification.types";

/**
 * API layer domain Notifications — self-scoped (KHÔNG có param `recipient`,
 * backend LUÔN lấy từ token, xem `notification.routes.ts` comment gốc).
 *
 * `GET /` trả `{success, message, data}` (chuẩn), NHƯNG `data` chứa CẢ
 * `items` LẪN pagination field PHẲNG (`total/page/limit/totalPages`) trong
 * CÙNG 1 object — KHÁC hình dạng `{data, pagination}` mà `unwrapResponse()`
 * giả định. Đọc trực tiếp `response.data.data`, KHÔNG qua `unwrapResponse()`
 * (cùng lý do đã áp dụng cho Audit Logs — xem `audit.api.ts`).
 */
export function getNotifications(
  params: GetNotificationsParams,
): Promise<AxiosResponse<{ message: string; data: GetNotificationsResult }>> {
  return axiosInstance.get("/notifications", { params });
}

export function getUnreadNotificationCount(): Promise<AxiosResponse<{ message: string; data: { unreadCount: number } }>> {
  return axiosInstance.get("/notifications/unread-count");
}

export function markNotificationRead(id: string): Promise<AxiosResponse<{ message: string; data: NotificationItem }>> {
  return axiosInstance.patch(`/notifications/${id}/read`);
}

export function markAllNotificationsRead(): Promise<AxiosResponse<{ message: string; data: { modifiedCount: number } }>> {
  return axiosInstance.patch("/notifications/read-all");
}

export function deleteNotification(id: string): Promise<AxiosResponse<{ message: string; data: { deleted: boolean } }>> {
  return axiosInstance.delete(`/notifications/${id}`);
}

/* =====================================================================
   ADMIN — quản trị Notification (FE-13). 2 endpoint MỚI, CÓ permission
   (`NOTIFICATION_VIEW_ALL`/`NOTIFICATION_BROADCAST`) — KHÁC 5 hàm tự-scope
   ở trên (không permission, luôn khoá theo token).
===================================================================== */

export function getAllNotificationsAdmin(
  params: GetAllNotificationsParams,
): Promise<AxiosResponse<{ message: string; data: GetAllNotificationsResult }>> {
  return axiosInstance.get("/notifications/admin", { params });
}

export function broadcastNotification(
  body: BroadcastNotificationRequest,
): Promise<AxiosResponse<{ message: string; data: BroadcastNotificationResult }>> {
  return axiosInstance.post("/notifications/broadcast", body);
}
