import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination } from "@/types/shared.types";
import type {
  AssignUserRoleRequest,
  CreateUserRequest,
  GetUsersParams,
  ResetUserPasswordRequest,
  UpdateUserRequest,
  UserListItem,
} from "@/types/user.types";

/**
 * API layer domain Users (FE-03). Hàm thuần gọi axios, trả nguyên
 * AxiosResponse (KHÔNG unwrap ở đây — FE_FOUNDATION_SPEC.md Mục 4).
 * `GET /users/me` (getMe) đã có ở `auth.api.ts` — KHÔNG duplicate ở đây.
 */

/** `GET /users` — response THẬT `{message:true, data:[...], pagination}` (không có `success`). */
export function getUsers(
  params: GetUsersParams,
): Promise<AxiosResponse<{ message: unknown; data: UserListItem[]; pagination: Pagination }>> {
  return axiosInstance.get("/users", { params });
}

export function getUserById(id: string): Promise<AxiosResponse<{ message: string; data: UserListItem }>> {
  return axiosInstance.get(`/users/${id}`);
}

export function createUser(
  body: CreateUserRequest,
): Promise<AxiosResponse<{ message: string; data: { id: string; username: string; role: string; department?: string } }>> {
  return axiosInstance.post("/users", body);
}

export function updateUser(
  id: string,
  body: UpdateUserRequest,
): Promise<AxiosResponse<{ message: string; data: UserListItem }>> {
  return axiosInstance.put(`/users/${id}`, body);
}

/** `PATCH /users/:id/role` — endpoint RIÊNG cho gán role (USER_ASSIGN_ROLE), tách khỏi updateUser. */
export function assignUserRole(
  id: string,
  body: AssignUserRoleRequest,
): Promise<AxiosResponse<{ message: string; data: UserListItem }>> {
  return axiosInstance.patch(`/users/${id}/role`, body);
}

/** `DELETE /users/:id` — soft-delete (disable), KHÔNG xoá vĩnh viễn. */
export function disableUser(id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`/users/${id}`);
}

export function restoreUser(id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.patch(`/users/restore/${id}`);
}

/** `PATCH /users/reset-password/:id` — ADMIN/IT reset mật khẩu hộ user khác. */
export function resetUserPassword(
  id: string,
  body: ResetUserPasswordRequest,
): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.patch(`/users/reset-password/${id}`, body);
}
