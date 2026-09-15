import { useQuery } from "@tanstack/react-query";
import { getRoleById } from "@/api/rbac.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Role } from "@/types/rbac.types";

/** `RoleDetailPage` (FE-08) — `permissions[]` populate sẵn (xem `getRoleByIdService`), dùng cho permission matrix. */
export function useRoleDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["rbac", "roles", "detail", id] as const,
    queryFn: async () => {
      const response = await getRoleById(id!);
      return unwrapResponse<Role>(response).data;
    },
    enabled: !!id,
  });
}
