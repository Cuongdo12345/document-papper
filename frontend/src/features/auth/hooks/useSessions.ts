import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMySessions, revokeMySession as revokeMySessionApi } from "@/api/auth.api";
import { useAuthStore } from "@/stores/authStore";
import { tokenStorage } from "@/utils/tokenStorage";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { Session } from "@/types/auth.types";

export const MY_SESSIONS_QUERY_KEY = ["auths", "sessions", "me"] as const;

/** Roadmap C2 (Quản lý phiên đăng nhập, DEV-069, 2026-09-19) — self-service, hiện cho MỌI role ở `ProfilePage`/`SessionsSection.tsx`. */
export function useMySessions() {
  return useQuery({
    queryKey: MY_SESSIONS_QUERY_KEY,
    queryFn: async () => {
      const response = await getMySessions();
      return unwrapResponse<Session[]>(response).data;
    },
  });
}

/**
 * Thu hồi 1 phiên của CHÍNH MÌNH. Nếu phiên bị thu hồi ĐÚNG LÀ phiên hiện
 * tại (`isCurrent`, xác định lúc list) — user đã xác nhận qua AskUserQuestion
 * chọn "Cho phép + tự đăng xuất ngay" — tự dọn session cục bộ + điều hướng
 * `/login` thay vì để user tiếp tục thao tác với 1 phiên server đã thu hồi
 * (access token vẫn "hợp lệ" tới khi hết hạn tự nhiên vì JWT stateless,
 * nhưng KHÔNG refresh được nữa — trải nghiệm rất khó hiểu nếu không tự đăng
 * xuất ngay).
 */
export function useRevokeMySession() {
  const queryClient = useQueryClient();
  const storeLogout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: (session: Session) => revokeMySessionApi(session._id),
    onSuccess: (_data, session) => {
      if (session.isCurrent) {
        toast.success("Đã thu hồi phiên hiện tại — đang đăng xuất...");
        storeLogout();
        tokenStorage.clearRefreshToken();
        queryClient.clear();
        return;
      }
      toast.success("Đã thu hồi phiên đăng nhập");
      queryClient.invalidateQueries({ queryKey: MY_SESSIONS_QUERY_KEY });
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
