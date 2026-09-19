import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserSessions, revokeUserSession as revokeUserSessionApi } from "@/api/users.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { Session } from "@/types/auth.types";

/** Roadmap C2 (Quản lý phiên đăng nhập, DEV-069, 2026-09-19) — ADMIN xem phiên của 1 user khác (permission SESSION_VIEW_ALL). */
export function useUserSessions(userId: string | undefined) {
  return useQuery({
    queryKey: ["users", "sessions", userId] as const,
    queryFn: async () => {
      const response = await getUserSessions(userId as string);
      return unwrapResponse<Session[]>(response).data;
    },
    enabled: !!userId,
  });
}

/** ADMIN thu hồi phiên của user khác (permission SESSION_REVOKE_ALL). */
export function useRevokeUserSession(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => revokeUserSessionApi(userId as string, sessionId),
    onSuccess: () => {
      toast.success("Đã thu hồi phiên đăng nhập của user");
      queryClient.invalidateQueries({ queryKey: ["users", "sessions", userId] });
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
