import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login as loginApi } from "@/api/auth.api";
import { useAuthStore } from "@/stores/authStore";
import { tokenStorage } from "@/utils/tokenStorage";
import { CURRENT_USER_QUERY_KEY } from "@/hooks/useCurrentUser";
import type { LoginRequest } from "@/types/auth.types";

/**
 * Mutation Login — DATA_FLOW.md Mục 3. Response login KHÔNG qua
 * `unwrapResponse` chung (shape phẳng riêng — `{message, data:{accessToken,
 * refreshToken, user}}`, xem api/auth.api.ts).
 */
export function useLogin() {
  const authLogin = useAuthStore((s) => s.login);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      const response = await loginApi(body);
      return response.data.data; // {accessToken, refreshToken, user}
    },
    onSuccess: ({ accessToken, refreshToken, user }) => {
      authLogin(accessToken, user);
      tokenStorage.setRefreshToken(refreshToken);
      // Seed cache tạm bằng user subset từ login (hiển thị ngay, không giật UI).
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
      // 🔒 FIX (2026-09-09, phát hiện khi review Dashboard bằng browser thật —
      // xem docs/frontend/tasks/FE-09.md): `setQueryData` KHÔNG tự đánh dấu
      // stale — kết hợp `useCurrentUser.ts` có `staleTime:60_000` (không phải
      // 0 như comment cũ ở đây từng mô tả), `GET /users/me` thật KHÔNG hề
      // được gọi trong 60 giây đầu sau login. `user` (LoginUser) là SUBSET
      // thiếu hẳn `permissions[]`/`role.isSystemRole` — mọi permission check
      // (`usePermission()`) trả `false` sai suốt 60s đó (sidebar rỗng,
      // route/action bị ẩn nhầm trên TOÀN APP, không riêng 1 trang).
      // `invalidateQueries` đánh dấu stale ngay — nếu đang có observer active
      // (hiếm, còn ở `/login`) thì refetch ngay; nếu chưa có (thường gặp,
      // component đọc `useCurrentUser()` chỉ mount SAU KHI redirect sang
      // `/app`) thì `refetchOnMount` mặc định sẽ tự refetch đúng 1 lần khi
      // mount đó — vẫn giữ nguyên lợi ích `staleTime:60_000` cho các lần
      // mount tiếp theo trong phiên, chỉ ép đúng 1 lần refetch ngay sau login.
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
    // KHÔNG xử lý lỗi ở đây — Hook Layer không chứa logic UI
    // (FE_ARCHITECTURE.md Mục 2). Component gọi `parseApiError(mutation.error)`
    // để hiển thị (Mục 6 FE_FOUNDATION_SPEC.md).
  });
}
