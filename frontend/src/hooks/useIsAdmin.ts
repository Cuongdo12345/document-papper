import { usePermission } from "@/hooks/usePermission";

/**
 * "User hiện tại có phải ADMIN?" — CHỈ dựa vào `isSystemRole===true`.
 *
 * (FE-16 polish, 2026-09-12) Trước đây dùng dual-check `isSystemRole===true
 * || role.name==="ADMIN"` vì migration DEV-001A "Phase A" chưa xong (role
 * ADMIN thật ở DB dev khi đó vẫn `isSystemRole:false`). Backend đã hoàn tất
 * "Phase B" (DEV-047): `isSystemRole` giờ là điều kiện DUY NHẤT xác định
 * ADMIN thật ở MỌI nơi backend check quyền (đóng RV02-01 — đổi tên role
 * thành "ADMIN" không còn chiếm được quyền hệ thống). Giữ nhánh so khớp tên
 * ở đây sẽ khiến FE lệch khỏi backend — coi 1 role thường bị đổi tên thành
 * "ADMIN" là "admin thật" trên UI trong khi backend đã từ chối, gây hiện
 * nhầm hành động chắc chắn 403. Xem cùng thay đổi ở
 * `features/rbac/utils/roleGuards.ts` `isProtectedSystemRole()`.
 */
export function useIsAdmin(): boolean {
  const { isSystemRole } = usePermission();
  return isSystemRole;
}
