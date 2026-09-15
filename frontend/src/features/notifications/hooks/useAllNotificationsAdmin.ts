import { useQuery } from "@tanstack/react-query";
import { getAllNotificationsAdmin } from "@/api/notifications.api";
import type { GetAllNotificationsParams } from "@/types/notification.types";

/** List admin (`AdminNotificationsTab`, permission `NOTIFICATION_VIEW_ALL`) — xem thông báo của BẤT KỲ user nào, KHÁC `useNotifications` (luôn tự-scope). */
export function useAllNotificationsAdmin(params: GetAllNotificationsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["notifications", "admin", "list", params] as const,
    queryFn: async () => {
      const response = await getAllNotificationsAdmin(params);
      return response.data.data;
    },
    placeholderData: (prev) => prev,
    enabled: options?.enabled,
  });
}
