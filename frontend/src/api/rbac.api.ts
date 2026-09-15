import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination } from "@/types/shared.types";
import type {
  GetRolesParams,
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignPermissionsRequest,
  RbacPermission,
  GetRbacPermissionsParams,
  CreateRbacPermissionRequest,
  UpdateRbacPermissionRequest,
  Policy,
  GetPoliciesParams,
  CreatePolicyRequest,
  UpdatePolicyRequest,
} from "@/types/rbac.types";

/**
 * API layer domain RBAC — FE-08 (RBAC Admin UI, roadmap Mục 16) mở rộng đầy
 * đủ CRUD Roles/Permissions/Policies (trước đó CHỈ có `getRoles()` phục vụ
 * FE-03). Response THẬT của TOÀN BỘ endpoint RBAC dùng `message` (STRING) —
 * đã xác nhận trực tiếp `rbac.controller.ts`, KHÔNG lệch quy ước như
 * Departments (Mục 7 file cũ).
 */

// ================= ROLE =================

export function getRoles(params: GetRolesParams): Promise<AxiosResponse<{ message: string; data: Role[]; pagination: Pagination }>> {
  return axiosInstance.get("/rbac/roles", { params });
}

export function getRoleById(id: string): Promise<AxiosResponse<{ message: string; data: Role }>> {
  return axiosInstance.get(`/rbac/roles/${id}`);
}

export function createRole(body: CreateRoleRequest): Promise<AxiosResponse<{ message: string; data: Role }>> {
  return axiosInstance.post("/rbac/roles", body);
}

export function updateRole(id: string, body: UpdateRoleRequest): Promise<AxiosResponse<{ message: string; data: Role }>> {
  return axiosInstance.put(`/rbac/roles/${id}`, body);
}

/** Hard delete — backend tự chặn (409) nếu còn user đang gán role này. */
export function deleteRole(id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`/rbac/roles/${id}`);
}

/** Đường DUY NHẤT để đổi `permissions` của role (B13 — xem `rbac.service.ts`). */
export function assignPermissionsToRole(
  id: string,
  body: AssignPermissionsRequest,
): Promise<AxiosResponse<{ message: string; data: Role }>> {
  return axiosInstance.post(`/rbac/roles/${id}/assign-permissions`, body);
}

// ================= PERMISSION =================

export function getRbacPermissions(
  params: GetRbacPermissionsParams,
): Promise<AxiosResponse<{ message: string; data: RbacPermission[]; pagination: Pagination }>> {
  return axiosInstance.get("/rbac/permissions", { params });
}

export function createRbacPermission(
  body: CreateRbacPermissionRequest,
): Promise<AxiosResponse<{ message: string; data: RbacPermission }>> {
  return axiosInstance.post("/rbac/permissions", body);
}

export function updateRbacPermission(
  id: string,
  body: UpdateRbacPermissionRequest,
): Promise<AxiosResponse<{ message: string; data: RbacPermission }>> {
  return axiosInstance.put(`/rbac/permissions/${id}`, body);
}

/** Backend tự chặn (409) nếu permission đang được gán cho role hoặc user (extra/deny). */
export function deleteRbacPermission(id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`/rbac/permissions/${id}`);
}

// ================= POLICY =================

export function getPolicies(
  params: GetPoliciesParams,
): Promise<AxiosResponse<{ message: string; data: Policy[]; pagination: Pagination }>> {
  return axiosInstance.get("/rbac/policies", { params });
}

export function createPolicy(body: CreatePolicyRequest): Promise<AxiosResponse<{ message: string; data: Policy }>> {
  return axiosInstance.post("/rbac/policies", body);
}

export function updatePolicy(id: string, body: UpdatePolicyRequest): Promise<AxiosResponse<{ message: string; data: Policy }>> {
  return axiosInstance.put(`/rbac/policies/${id}`, body);
}

export function deletePolicy(id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`/rbac/policies/${id}`);
}
