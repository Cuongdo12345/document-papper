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
  /** [MỚI 2026-09-19, Roadmap C1] Chỉ tự bật được qua `POST /auths/2fa/enable`+`/confirm` — xem `TwoFactorSection.tsx`. */
  twoFactorEnabled?: boolean;
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
  /** [MỚI 2026-09-18] Khắc phục gap DEV-065 Mục 4 — trước đây không có đường nào (kể cả lúc tạo) để gán email. */
  email?: string;
}

/** Khớp `UpdateUserDTO` — KHÔNG có `password` (đổi mật khẩu là action riêng). */
export interface UpdateUserRequest {
  fullName?: string;
  username?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
  /** [MỚI 2026-09-18] Khắc phục gap DEV-065 Mục 4 — CHỈ có tác dụng qua `PUT /users/:id` (ADMIN), KHÔNG qua `PATCH /users/me`. */
  email?: string;
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
