/**
 * FE-08 — RBAC Admin UI: mở rộng file này (trước đó CHỈ đủ cho nhu cầu Users
 * UI — dropdown chọn role + resolve tên role, xem comment gốc dưới). Giờ
 * thêm đầy đủ shape cho Roles/Permissions/Policies CRUD (roadmap Mục 16).
 *
 * Đặt tên `RbacPermission` (KHÔNG phải `Permission`) — tránh đụng
 * `constants/permissions.ts` đã export `type Permission` (union string cho
 * FE guard permission), 2 khái niệm khác nhau dùng cùng domain "permission".
 */

/**
 * `permissions` optional — CHỈ có mặt khi BE trả kèm (list/detail Role ĐỀU
 * populate `permissions`, xem `rbac.service.ts` `getRoleService`/
 * `getRoleByIdService`) — field cũ (dropdown Users) không cần field này nên
 * để optional, không phá vỡ consumer hiện có (`features/users/hooks/useRoles.ts`).
 */
export interface Role {
  _id: string;
  name: string;
  isSystemRole: boolean;
  permissions?: RbacPermission[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GetRolesParams {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "name";
  order?: "asc" | "desc";
  keyword?: string;
}

export interface CreateRoleRequest {
  name: string;
}

/** Khớp `UpdateRoleDTO` — CHỈ `name` (đổi `permissions` phải qua `AssignPermissionsRequest` riêng, xem comment `rbac.service.ts` B13). */
export interface UpdateRoleRequest {
  name: string;
}

export interface AssignPermissionsRequest {
  permissionIds: string[];
}

/** Entity Permission RBAC (backend `Permission` model) — KHÔNG nhầm với `constants/permissions.ts`'s `Permission` (union string). */
export interface RbacPermission {
  _id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetRbacPermissionsParams {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "name" | "resource" | "action";
  order?: "asc" | "desc";
  keyword?: string;
  resource?: string;
  action?: string;
}

export interface CreateRbacPermissionRequest {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

/** Khớp `UpdatePermissionDTO` — tất cả field optional, cần ít nhất 1. */
export type UpdateRbacPermissionRequest = Partial<CreateRbacPermissionRequest>;

/** Entity Policy (ABAC) — xem `Policycondition.evaluator.ts` cho ngữ pháp `condition` hỗ trợ. */
export interface Policy {
  _id: string;
  name: string;
  resource: string;
  action: string;
  condition: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetPoliciesParams {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "name" | "resource" | "action";
  order?: "asc" | "desc";
  keyword?: string;
  resource?: string;
  action?: string;
}

export interface CreatePolicyRequest {
  name: string;
  resource: string;
  action: string;
  condition: string;
}

/** Khớp `UpdatePolicyDTO` — tất cả field optional, cần ít nhất 1. */
export type UpdatePolicyRequest = Partial<CreatePolicyRequest>;
