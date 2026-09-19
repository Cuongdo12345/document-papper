import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyLoginOtp as verifyLoginOtpApi } from "@/api/auth.api";
import { useAuthStore } from "@/stores/authStore";
import { applyLoginSession } from "@/features/auth/hooks/useLogin";
import type { VerifyLoginOtpRequest } from "@/types/auth.types";

/**
 * Roadmap C1 (DEV-068, 2026-09-19) — bước 2 đăng nhập khi tài khoản đã bật
 * 2FA (`LoginPage.tsx` chuyển sang bước này sau khi `useLogin` trả
 * `requiresTwoFactor`). Luôn trả `LoginSuccessData` thật (đã có token) nên
 * dùng lại NGUYÊN `applyLoginSession()` — cùng side-effect với `useLogin`
 * lúc KHÔNG bật 2FA.
 */
export function useVerifyLoginOtp() {
  const authLogin = useAuthStore((s) => s.login);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: VerifyLoginOtpRequest) => {
      const response = await verifyLoginOtpApi(body);
      return response.data.data;
    },
    onSuccess: (result) => applyLoginSession(result, authLogin, queryClient),
  });
}
