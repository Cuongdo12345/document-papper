import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/api/notifications.api";
import type { GetNotificationsParams } from "@/types/notification.types";

/** List phân trang — dùng cho `NotificationBell` (10 gần nhất, `enabled` theo trạng thái mở dropdown) VÀ `NotificationsPage` (đầy đủ filter/pagination). KHÔNG qua `unwrapResponse()` (xem `notifications.api.ts`). */
export function useNotifications(params: GetNotificationsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["notifications", "list", params] as const,
    queryFn: async () => {
      const response = await getNotifications(params);
      return response.data.data;
    },
    placeholderData: (prev) => prev,
    enabled: options?.enabled,
  });
}
