import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/api/auth.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { useAuthStore } from "@/stores/authStore";
import type { CurrentUser } from "@/types/auth.types";

/**
 * Query key CHÍNH THỨC cho user hiện tại — dùng đúng key này ở mọi nơi cần
 * invalidate sau khi user tự cập nhật thông tin (STATE_MAPPING.md Mục 1).
 */
export const CURRENT_USER_QUERY_KEY = ["users", "me"] as const;

/**
 * `GET /users/me` — nguồn CHÍNH xác định role/thông tin user hiện tại
 * (AUTH_RBAC_MAP.md Mục 1.3). CHỈ enabled khi đã có accessToken (tránh gọi
 * API thừa ở trang public).
 */
export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async () => {
      const response = await getMe();
      return unwrapResponse<CurrentUser>(response).data;
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}
