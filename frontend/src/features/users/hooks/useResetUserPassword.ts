import { useMutation } from "@tanstack/react-query";
import { resetUserPassword } from "@/api/users.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { ResetUserPasswordRequest } from "@/types/user.types";

/** Không invalidate `users.list` — reset password không đổi field nào hiển thị trong bảng. */
export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResetUserPasswordRequest }) => resetUserPassword(id, body),
    onSuccess: () => {
      toast.success("Đã đặt lại mật khẩu");
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
