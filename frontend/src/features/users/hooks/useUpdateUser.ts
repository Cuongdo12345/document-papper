import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "@/api/users.api";
import type { UpdateUserRequest } from "@/types/user.types";

/** Mutation gắn với form (`UserFormDrawer`) — xem ghi chú `useCreateUser.ts`. */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateUserRequest }) => updateUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
  });
}
