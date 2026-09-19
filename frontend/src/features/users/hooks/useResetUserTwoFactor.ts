import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resetUserTwoFactor } from "@/api/users.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/**
 * Roadmap C1 (Xác thực 2 lớp qua email OTP, DEV-068, 2026-09-19) — ADMIN tắt
 * 2FA hộ user bị khoá (mất email). KHÁC `useResetUserPassword` — có
 * invalidate `["users","list"]` vì `twoFactorEnabled` ảnh hưởng điều kiện
 * hiện nút "Reset 2FA" ở `UsersListPage`.
 */
export function useResetUserTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resetUserTwoFactor(id),
    onSuccess: () => {
      toast.success("Đã tắt xác thực 2 lớp cho user");
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
