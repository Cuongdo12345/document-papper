import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "@/api/users.api";
import type { CreateUserRequest } from "@/types/user.types";

/**
 * Mutation gắn với form (`UserFormDrawer`) — KHÔNG tự toast lỗi ở đây (Hook
 * Layer không chứa logic UI, FE_ARCHITECTURE.md Mục 2). Component tự đọc
 * `mutation.error` qua `parseApiError()` để hiện inline, giống LoginPage/
 * ResetPasswordPage.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateUserRequest) => createUser(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
  });
}
