import { useQuery } from "@tanstack/react-query";
import { getRoles } from "@/api/rbac.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Role, GetRolesParams } from "@/types/rbac.types";

/**
 * List phân trang cho `RolesListPage` (FE-08, RBAC Admin) — KHÁC
 * `useRoles()` (`hooks/useRoles.ts`, cố định `limit:100` phục vụ dropdown
 * Users). Tách riêng để không đổi hành vi cache/param của consumer cũ.
 */
export function useRoleList(params: GetRolesParams) {
  return useQuery({
    queryKey: ["rbac", "roles", "list", params] as const,
    queryFn: async () => {
      const response = await getRoles(params);
      return unwrapResponse<Role[]>(response);
    },
    placeholderData: (prev) => prev,
  });
}
