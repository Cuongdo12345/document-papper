import { useQuery } from "@tanstack/react-query";
import { getUsers } from "@/api/users.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { GetUsersParams, UserListItem } from "@/types/user.types";

/**
 * STATE_MAPPING.md: `["users","list",params]` — filter/sort/pagination đưa
 * vào query key. `options.enabled` (FE-06, cùng convention `useDepartments`/
 * `useAssetCategories`) — cho phép caller TẮT query khi chưa cần gọi ngay
 * (vd `AssetAssignModal` chỉ nên tải danh sách user SAU KHI đã chọn
 * `toDepartment`, tránh tải nguyên danh sách user toàn hệ thống không lọc).
 */
export function useUsers(params: GetUsersParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["users", "list", params] as const,
    queryFn: async () => {
      const response = await getUsers(params);
      return unwrapResponse<UserListItem[]>(response);
    },
    placeholderData: (prev) => prev, // giữ data cũ khi đổi trang, tránh flash loading (skeleton) mỗi lần chuyển trang.
    enabled: options?.enabled,
  });
}
