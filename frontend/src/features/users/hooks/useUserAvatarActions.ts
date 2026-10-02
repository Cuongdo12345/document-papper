import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserAvatar, deleteUserAvatar } from "@/api/users.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { UpdateAvatarRequest } from "@/types/auth.types";

/**
 * [MỚI DEV-079] ADMIN sửa/xoá avatar hộ user khác — mirror
 * `useResetUserPassword.ts` (tự toast, không cần invalidate `users.list` vì
 * bảng danh sách KHÔNG hiển thị cột avatar). Invalidate `["users","detail",id]`
 * (query của chính `UserAvatarModal`) để preview cập nhật ngay.
 */
export function useUpdateUserAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAvatarRequest }) => updateUserAvatar(id, body),
    onSuccess: (_data, variables) => {
      toast.success("Đã cập nhật ảnh đại diện");
      queryClient.invalidateQueries({ queryKey: ["users", "detail", variables.id] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}

export function useDeleteUserAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUserAvatar(id),
    onSuccess: (_data, id) => {
      toast.success("Đã xoá ảnh đại diện");
      queryClient.invalidateQueries({ queryKey: ["users", "detail", id] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
