import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMe } from "@/api/auth.api";
import { CURRENT_USER_QUERY_KEY } from "@/hooks/useCurrentUser";
import type { UpdateMeRequest } from "@/types/auth.types";

/**
 * Mutation gắn với form (`ProfileEditModal`) — KHÔNG tự toast lỗi (cùng
 * pattern `useUpdateAsset`). Thành công → `invalidateQueries` (KHÔNG
 * `setQueryData` bằng response, xem chú thích `updateMe()` ở `auth.api.ts`)
 * để refetch lại `["users","me"]` đầy đủ qua `getMe()`.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateMeRequest) => updateMe(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
