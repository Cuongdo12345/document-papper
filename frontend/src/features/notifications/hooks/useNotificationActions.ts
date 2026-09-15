import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { markNotificationRead, markAllNotificationsRead, deleteNotification } from "@/api/notifications.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

function invalidateNotificationQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["notifications"] }); // gồm cả "list" và "unread-count"
}

/** Đánh dấu 1 thông báo đã đọc — bấm trực tiếp vào item (bell dropdown lẫn `NotificationsPage`), KHÔNG toast (hành động ngầm, không cần xác nhận thành công ồn ào). */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });
}

/** Nút "Đánh dấu tất cả đã đọc". */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc");
      invalidateNotificationQueries(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

/** Xoá 1 thông báo (hard delete, chỉ chính chủ — backend tự chặn IDOR). */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      toast.success("Đã xoá thông báo");
      invalidateNotificationQueries(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
