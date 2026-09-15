import { useQuery } from "@tanstack/react-query";
import { getUnreadNotificationCount } from "@/api/notifications.api";

/**
 * Badge số chưa đọc trên chuông — `GET /notifications/unread-count` được
 * backend TÁCH RIÊNG khỏi list CHÍNH ĐỂ phục vụ polling nhẹ (comment gốc
 * `notification.service.ts#getUnreadCount`: "để FE poll badge chuông mỗi
 * vài giây mà không phải kéo cả danh sách"). `refetchInterval:30_000` — luôn
 * chạy (không cần `enabled`, chuông hiển thị suốt App Shell, khác
 * `useNotifications` chỉ bật khi mở dropdown).
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"] as const,
    queryFn: async () => {
      const response = await getUnreadNotificationCount();
      return response.data.data.unreadCount;
    },
    refetchInterval: 30_000,
  });
}
