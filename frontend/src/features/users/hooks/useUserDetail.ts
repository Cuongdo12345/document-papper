import { useQuery } from "@tanstack/react-query";
import { getUserById } from "@/api/users.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { UserListItem } from "@/types/user.types";

/**
 * [MỚI DEV-079] `GET /users/:id` — dùng lần ĐẦU TIÊN bởi `UserAvatarModal`
 * (cần `avatar` hiện tại của target user để preview trước khi sửa/xoá —
 * `GET /users` list KHÔNG trả field này, xem `user.types.ts`).
 */
export function useUserDetail(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["users", "detail", id] as const,
    queryFn: async () => {
      const response = await getUserById(id!);
      return unwrapResponse<UserListItem>(response).data;
    },
    enabled: !!id && enabled,
  });
}
