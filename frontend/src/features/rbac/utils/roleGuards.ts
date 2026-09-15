import type { Role } from "@/types/rbac.types";

/**
 * `role.isSystemRole` — cờ DUY NHẤT đánh dấu role hệ thống bất biến
 * (`role.model.ts`). Ẩn nút Sửa/Xoá cho role này (backend `updateRoleService`/
 * các authorization check khác đều từ chối thao tác trên role hệ thống —
 * hiện nút ra chỉ dẫn tới 403).
 *
 * (FE-16 polish, 2026-09-12) Trước đây dùng dual-check `isSystemRole===true
 * || role.name==="ADMIN"` vì migration DEV-001A "Phase A" chưa xong (role
 * ADMIN thật ở DB dev khi đó vẫn `isSystemRole:false`, backend tự bảo vệ
 * qua nhánh so khớp tên). Backend đã hoàn tất "Phase B" (DEV-047): MỌI
 * authorization check liên quan (`authorizePermission.middleware.ts`,
 * `users.service.ts`...) giờ CHỈ dùng `isSystemRole===true`, không còn
 * nhánh so khớp tên "ADMIN" nào (đóng RV02-01). Riêng
 * `rbac.service.ts` `updateRoleService` vẫn so khớp tên "ADMIN" — nhưng đó
 * là guard KHÁC mục đích (bảo vệ TÊN role bất biến, không phải bypass
 * quyền), không liên quan tới hàm này.
 */
export function isProtectedSystemRole(role: Pick<Role, "isSystemRole" | "name">): boolean {
  return role.isSystemRole === true;
}
