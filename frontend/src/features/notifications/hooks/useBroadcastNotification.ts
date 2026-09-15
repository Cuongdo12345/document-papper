import { useMutation, useQueryClient } from "@tanstack/react-query";
import { broadcastNotification } from "@/api/notifications.api";
import type { BroadcastNotificationRequest } from "@/types/notification.types";

/** Mutation gắn với form (`BroadcastNotificationModal`) — KHÔNG tự toast lỗi, component đọc `mutation.error` qua `parseApiError()` (cùng pattern `useCreateAssetCategory`). Invalidate rộng `["notifications"]` (gồm cả admin list + inbox tự-scope + unread-count — rẻ, không cần tối ưu invalidate hẹp cho 1 action không thường xuyên). */
export function useBroadcastNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BroadcastNotificationRequest) => broadcastNotification(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
