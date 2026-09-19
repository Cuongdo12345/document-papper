import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllSessions, revokeUserSession as revokeUserSessionApi } from "@/api/users.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { SessionWithUser } from "@/types/auth.types";

const ALL_SESSIONS_QUERY_KEY = ["users", "sessions", "all"] as const;

/**
 * Roadmap C3 (Giám sát phiên đăng nhập toàn hệ thống, DEV-070, 2026-09-19) —
 * ADMIN xem TẤT CẢ phiên đăng nhập còn hiệu lực của MỌI user (permission
 * SESSION_VIEW_ALL, dùng lại — khác `useUserSessions.ts` chỉ scope 1 user).
 */
export function useAllSessions(params: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: [...ALL_SESSIONS_QUERY_KEY, params] as const,
    queryFn: async () => unwrapResponse<SessionWithUser[]>(await getAllSessions(params)),
    placeholderData: (prev) => prev,
  });
}

/**
 * Thu hồi phiên của BẤT KỲ user nào từ trang tổng hợp — KHÁC
 * `useUserSessions.ts::useRevokeUserSession` (bind sẵn 1 `userId` ở tham số
 * hook), ở đây `userId` đổi theo TỪNG DÒNG nên phải truyền vào lúc `mutate()`.
 * Dùng LẠI `DELETE /users/:id/sessions/:sessionId` sẵn có (SESSION_REVOKE_ALL)
 * — route này không có endpoint revoke riêng.
 */
export function useRevokeAnySession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, sessionId }: { userId: string; sessionId: string }) => revokeUserSessionApi(userId, sessionId),
    onSuccess: () => {
      toast.success("Đã thu hồi phiên đăng nhập");
      queryClient.invalidateQueries({ queryKey: ALL_SESSIONS_QUERY_KEY });
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
