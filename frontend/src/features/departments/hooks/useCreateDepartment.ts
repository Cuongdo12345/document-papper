import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDepartment } from "@/api/departments.api";
import type { CreateDepartmentRequest } from "@/types/department.types";

/** Mutation gắn với form (`DepartmentFormModal`) — không toast lỗi ở hook, xem `useCreateUser.ts`. */
export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateDepartmentRequest) => createDepartment(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", "list"] });
    },
  });
}
