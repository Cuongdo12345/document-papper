import { useQuery } from "@tanstack/react-query";
import { getDepartments } from "@/api/departments.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Department, GetDepartmentsParams } from "@/types/department.types";

/**
 * `options.enabled` (2026-09-06, fix lỗi "chọn khoa/phòng" trống ở
 * `DocumentCreatePage`) — cho phép caller TẮT hẳn query khi biết trước
 * người gọi không có `DEPARTMENT_VIEW` (role `USER`, khác `IT` — xem
 * `rolePermission.map.ts`), tránh gọi API chắc chắn trả 403 (và tránh
 * `queryClient` giữ lại 1 query error vô ích trong cache).
 */
export function useDepartments(params: GetDepartmentsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["departments", "list", params] as const,
    queryFn: async () => {
      const response = await getDepartments(params);
      return unwrapResponse<Department[]>(response);
    },
    placeholderData: (prev) => prev,
    enabled: options?.enabled,
  });
}
