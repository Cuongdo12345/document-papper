import { useQuery } from "@tanstack/react-query";
import { getRoles } from "@/api/rbac.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Role } from "@/types/rbac.types";

export const ROLES_QUERY_KEY = ["rbac", "roles"] as const;

/**
 * Danh sách role — dùng cho dropdown chọn role (Users) + resolve tên role
 * hiển thị trong bảng (`GET /users` không populate `role`, chỉ trả ObjectId
 * thô). `limit:100` vì số role trong hệ thống nhỏ (~7, xem `rolePermission.map.ts`)
 * — không cần phân trang riêng cho dropdown.
 */
export function useRoles() {
  return useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: async () => {
      const response = await getRoles({ limit: 100, sortBy: "name", order: "asc" });
      return unwrapResponse<Role[]>(response).data;
    },
    staleTime: 5 * 60_000, // Role hiếm khi đổi — cache 5 phút.
  });
}

/**
 * Role có thể GÁN được qua UI thường (KHÔNG phải RBAC Admin) — loại bỏ role
 * hệ thống, backend chặn cứng gán role này qua mọi endpoint User thường
 * (`create`/`update`/`assignRole` đều `throw` nếu `role.isSystemRole===true`
 * — `users.service.ts`).
 *
 * (FE-16 polish, 2026-09-12) Trước đây loại thêm cả `r.name === "ADMIN"`
 * (dual-check) vì migration DEV-001A "Phase A" chưa xong. Backend đã hoàn
 * tất "Phase B" (DEV-047): các guard trên chỉ còn dùng `isSystemRole===true`
 * — 1 role thường bị đổi tên thành "ADMIN" giờ GÁN ĐƯỢC bình thường (không
 * còn là ADMIN thật), nên bỏ luôn nhánh so khớp tên ở đây để khớp đúng
 * hành vi backend, tránh ẩn nhầm 1 role thực sự gán được.
 */
export function useAssignableRoles() {
  const query = useRoles();
  return {
    ...query,
    data: query.data?.filter((r) => !r.isSystemRole),
  };
}
