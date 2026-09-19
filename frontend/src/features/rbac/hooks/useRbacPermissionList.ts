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
 * "trang hiện tại".
 *
 * [SỬA 2026-09-19] `limit:100` CŨ từng gây bug thật: Permission catalog vượt
 * quá 100 bản ghi (108, sau khi seed đủ permission mới của DEV-065/067/068
 * trước đó bị thiếu trong catalog) khiến `sort theo resource ASC` CẮT MẤT
 * toàn bộ nhóm "WORKFLOW_*" (WORKFLOW_APPROVE/REJECT/VIEW/...) khỏi UI
 * "Phân quyền" — phát hiện khi user báo icon "Tắt xác thực 2 lớp" không hiện
 * dù đăng nhập ADMIN, kiểm tra ra ADMIN thiếu permission trong DB, rồi phát
 * hiện tiếp việc seed thêm 8 permission mới đẩy tổng số vượt ngưỡng cắt cũ.
 * Nâng lên `limit:300` (khớp `GetPermissionsQueryDTO` đã nâng max ở backend)
 * — dư nhiều so với ~107 permission hiện tại.
 */
export function useAllRbacPermissions() {
  return useQuery({
    queryKey: ["rbac", "permissions", "all"] as const,
    queryFn: async () => {
      const response = await getRbacPermissions({ limit: 300, sortBy: "resource", order: "asc" });
      return unwrapResponse<RbacPermission[]>(response).data;
    },
    staleTime: 5 * 60_000, // Permission catalog hiếm khi đổi — cache 5 phút, cùng TTL `useRoles()`.
  });
}
