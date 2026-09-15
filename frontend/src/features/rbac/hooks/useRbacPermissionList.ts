import { useQuery } from "@tanstack/react-query";
import { getRbacPermissions } from "@/api/rbac.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { RbacPermission, GetRbacPermissionsParams } from "@/types/rbac.types";

/** List phân trang cho `PermissionsListPage` (FE-08). */
export function useRbacPermissionList(params: GetRbacPermissionsParams) {
  return useQuery({
    queryKey: ["rbac", "permissions", "list", params] as const,
    queryFn: async () => {
      const response = await getRbacPermissions(params);
      return unwrapResponse<RbacPermission[]>(response);
    },
    placeholderData: (prev) => prev,
  });
}

/**
 * Toàn bộ Permission (KHÔNG phân trang) — nguồn cho `RolePermissionMatrix`
 * (Role Detail) — cần đủ 100% permission để hiển thị checkbox, không phải
 * "trang hiện tại". `limit:100` khớp max của `GetPermissionsQueryDTO` VÀ đủ
 * cho tổng số permission thật của hệ thống hiện tại (~77, xem
 * `permission.constant.ts`) — cùng cách tiếp cận `useRoles()` (dropdown Users).
 */
export function useAllRbacPermissions() {
  return useQuery({
    queryKey: ["rbac", "permissions", "all"] as const,
    queryFn: async () => {
      const response = await getRbacPermissions({ limit: 100, sortBy: "resource", order: "asc" });
      return unwrapResponse<RbacPermission[]>(response).data;
    },
    staleTime: 5 * 60_000, // Permission catalog hiếm khi đổi — cache 5 phút, cùng TTL `useRoles()`.
  });
}
