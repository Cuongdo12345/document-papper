import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { login as loginApi } from "@/api/auth.api";
import { useAuthStore } from "@/stores/authStore";
import { tokenStorage } from "@/utils/tokenStorage";
import { CURRENT_USER_QUERY_KEY } from "@/hooks/useCurrentUser";
import type { LoginRequest, LoginSuccessData } from "@/types/auth.types";

/**
 * [MỚI 2026-09-19, Roadmap C1] Tách riêng phần "áp dụng session sau khi có
 * token thật" — DÙNG CHUNG cho `useLogin` (nhánh KHÔNG bật 2FA) VÀ
 * `useVerifyLoginOtp` (bước 2 sau khi user bật 2FA nhập đúng mã) — 2 điểm
 * gọi giờ có CÙNG side-effect này, tránh chép lại y hệt logic.
 */
export function applyLoginSession(
  { accessToken, refreshToken, user }: LoginSuccessData,
  authLogin: (accessToken: string, user: LoginSuccessData["user"]) => void,
  queryClient: QueryClient,
) {
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
}

/**
 * Mutation Login — DATA_FLOW.md Mục 3. Response login KHÔNG qua
 * `unwrapResponse` chung (shape phẳng riêng — `{message, data:{accessToken,
 * refreshToken, user}}`, xem api/auth.api.ts).
 *
 * [SỬA 2026-09-19, Roadmap C1] `data` giờ là UNION (`LoginResponseData`) —
 * nếu tài khoản đã bật 2FA, response là `{requiresTwoFactor:true, username}`
 * (KHÔNG có token) thay vì áp dụng session ngay. `LoginPage.tsx` tự đọc
 * `mutation.data` để quyết định chuyển sang bước nhập OTP hay điều hướng
 * `/app` luôn.
 */
export function useLogin() {
  const authLogin = useAuthStore((s) => s.login);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      const response = await loginApi(body);
      return response.data.data;
    },
    onSuccess: (result) => {
      if ("requiresTwoFactor" in result) return; // chờ bước 2 (OTP) — xem `useVerifyLoginOtp`
      applyLoginSession(result, authLogin, queryClient);
    },
    // KHÔNG xử lý lỗi ở đây — Hook Layer không chứa logic UI
    // (FE_ARCHITECTURE.md Mục 2). Component gọi `parseApiError(mutation.error)`
    // để hiển thị (Mục 6 FE_FOUNDATION_SPEC.md).
  });
}
