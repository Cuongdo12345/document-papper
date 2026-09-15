import { useMutation } from "@tanstack/react-query";
import { changeMyPassword } from "@/api/auth.api";
import type { ChangePasswordRequest } from "@/types/auth.types";

/**
 * Mutation gắn với form (`ChangePasswordModal`) — KHÔNG tự toast lỗi, KHÔNG
 * tự logout ở đây (side-effect thuộc UX của modal gọi nó, xem
 * `ChangePasswordModal.tsx` — thành công PHẢI kèm logout cục bộ vì backend
 * đã thu hồi toàn bộ refresh token, xem chú thích `changeMyPassword()` ở
 * `auth.api.ts`). Không cần invalidate cache nào — response không đổi field
 * hiển thị nào của `CurrentUser`.
 */
export function useChangeMyPassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) => changeMyPassword(body),
  });
}
