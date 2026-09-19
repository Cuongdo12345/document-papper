import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enableTwoFactor, confirmTwoFactor, disableTwoFactor } from "@/api/auth.api";
import { CURRENT_USER_QUERY_KEY } from "@/hooks/useCurrentUser";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { ConfirmTwoFactorRequest, DisableTwoFactorRequest } from "@/types/auth.types";

/**
 * Roadmap C1 (Xác thực 2 lớp qua email OTP, DEV-068, 2026-09-19) — self-service
 * bật/tắt 2FA cho CHÍNH MÌNH (`ProfilePage.tsx`), CHỈ hiển thị cho role
 * ADMIN/TRUONG_KHOA/DIEU_DUONG_TRUONG/BAN_GIAM_DOC (khớp
 * `TWO_FACTOR_ELIGIBLE_ROLE_NAMES` phía backend). 3 mutation gộp chung 1 file
 * — cùng lý do `useConsumableActions.ts`: đều thuộc 1 luồng UI liền mạch
 * (bật → gửi OTP → xác nhận), CHUNG 1 chiến lược invalidate (`["users","me"]`
 * để `twoFactorEnabled` cập nhật lại đúng).
 */
export function useEnableTwoFactor() {
  return useMutation({
    mutationFn: () => enableTwoFactor(),
    onSuccess: () => toast.success("Đã gửi mã xác thực qua email"),
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useConfirmTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ConfirmTwoFactorRequest) => confirmTwoFactor(body),
    onSuccess: () => {
      toast.success("Đã bật xác thực 2 lớp");
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useDisableTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DisableTwoFactorRequest) => disableTwoFactor(body),
    onSuccess: () => {
      toast.success("Đã tắt xác thực 2 lớp");
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
