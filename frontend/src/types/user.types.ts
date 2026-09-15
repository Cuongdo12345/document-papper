/**
 * Type khớp response THẬT của domain Users (`backend/src/services/users/users.service.ts`)
 * — xác nhận trực tiếp source (DEV-027, 2026-09-05), KHÔNG suy đoán từ OpenAPI.
 */

/**
 * `GET /users` (`getList`) và `GET /users/:id` (`getById`) — CHỈ populate
 * `department` (`code name`), **KHÔNG populate `role`** (giữ nguyên ObjectId
 * thô dạng string) — khác hẳn `GET /users/me` (đã populate đầy đủ, DEV-026).
 * FE PHẢI tự resolve tên role qua danh sách Role riêng (`useRoles()`,
 * `types/rbac.types.ts`) để hiển thị cột "Vai trò" trong bảng.
 */
export interface UserListItem {
  _id: string;
  username: string;
  fullName: string;
  email?: string;
  /** ObjectId thô — resolve tên qua `useRoles()`, KHÔNG phải object đã populate. */
  role: string;
  department?: { _id: string; code: string; name: string } | null;
  isActive: boolean;
  extraPermissions?: string[];
  denyPermissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  role?: string;
  department?: string;
  isActive?: "true" | "false";
  keyword?: string;
  sortBy?: "createdAt" | "updatedAt" | "username" | "fullName";
  order?: "asc" | "desc";
  fromDate?: string;
  toDate?: string;
}

/** Khớp `CreateUserDTO` — role ADMIN/isSystemRole bị backend chặn qua endpoint này. */
export interface CreateUserRequest {
  username: string;
  password: string;
  fullName: string;
  role: string;
  department?: string;
}

/** Khớp `UpdateUserDTO` — KHÔNG có `password` (đổi mật khẩu là action riêng). */
export interface UpdateUserRequest {
  fullName?: string;
  username?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
}

/** Khớp `AssignRoleDTO` — endpoint RIÊNG (`PATCH /users/:id/role`), tách khỏi `UpdateUserRequest`. */
export interface AssignUserRoleRequest {
  roleId: string;
  resetPermissions?: boolean;
}

/** Khớp `ResetPasswordByAdminDTO` (`PATCH /users/reset-password/:id`). */
export interface ResetUserPasswordRequest {
  newPassword: string;
}
