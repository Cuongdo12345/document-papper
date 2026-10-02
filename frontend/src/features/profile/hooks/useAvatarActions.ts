import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMyAvatar, deleteMyAvatar } from "@/api/auth.api";
import { CURRENT_USER_QUERY_KEY } from "@/hooks/useCurrentUser";
import type { UpdateAvatarRequest } from "@/types/auth.types";

/**
 * [MỚI DEV-079] Mutation gắn với `AvatarModal` (self-service, `ProfilePage`)
 * — mirror `useUpdateProfile.ts`: KHÔNG tự toast lỗi, invalidate
 * `["users","me"]` để refetch đầy đủ qua `getMe()` thay vì tự ghép response.
 */
export function useUpdateMyAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAvatarRequest) => updateMyAvatar(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}

export function useDeleteMyAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteMyAvatar(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
