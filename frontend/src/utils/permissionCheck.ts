/**
 * Logic permission THUẦN (không phụ thuộc React/React Query) — tách riêng
 * để unit test được trực tiếp, không cần mock hook/QueryClient. Toàn bộ chỉ
 * thao tác trên `permissions: string[]` đã có sẵn từ `GET /users/me`
 * (DEV-026, effective permission ĐÃ TÍNH SẴN ở backend) — KHÔNG tự tính
 * `role.permissions ∪ extraPermissions − denyPermissions`, KHÔNG special-case
 * ADMIN/isSystemRole (xem `hooks/usePermission.ts`).
 */

export function checkHasPermission(permissions: string[], required: string | string[]): boolean {
  const list = Array.isArray(required) ? required : [required];
  return list.some((p) => permissions.includes(p));
}

export function checkHasAnyPermission(permissions: string[], required: string[]): boolean {
  return required.some((p) => permissions.includes(p));
}

export function checkHasAllPermissions(permissions: string[], required: string[]): boolean {
  return required.every((p) => permissions.includes(p));
}
