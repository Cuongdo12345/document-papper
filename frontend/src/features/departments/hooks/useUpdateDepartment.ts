import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDepartment } from "@/api/departments.api";
import type { UpdateDepartmentRequest } from "@/types/department.types";

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDepartmentRequest }) => updateDepartment(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", "list"] });
    },
  });
}
