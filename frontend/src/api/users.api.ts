import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination, BulkDeleteResult } from "@/types/shared.types";
import type { Session, SessionWithUser } from "@/types/auth.types";
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

/** [MỚI 2026-09-16, DEV-060] Vô hiệu hoá hàng loạt — chọn nhiều dòng ở danh sách. */
export function bulkDeleteUsers(ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/users/bulk-delete", { ids });
}

/** [MỚI 2026-09-17, DEV-062] Khôi phục hàng loạt — cùng permission USER_RESTORE với `restoreUser`. */
export function bulkRestoreUsers(ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/users/bulk-restore", { ids });
}

/** `PATCH /users/reset-password/:id` — ADMIN/IT reset mật khẩu hộ user khác. */
export function resetUserPassword(
  id: string,
  body: ResetUserPasswordRequest,
): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.patch(`/users/reset-password/${id}`, body);
}

/**
 * `PATCH /users/reset-2fa/:id` — Roadmap C1 (DEV-068, 2026-09-19). Đường khôi
 * phục DUY NHẤT khi user tự bật 2FA rồi mất quyền truy cập email — không có
 * body (chỉ tắt cờ + xoá OTP đang chờ), khác `resetUserPassword` ở trên.
 */
export function resetUserTwoFactor(id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.patch(`/users/reset-2fa/${id}`);
}

/* =====================================================================
   QUẢN LÝ PHIÊN ĐĂNG NHẬP CỦA USER KHÁC (Roadmap C2, DEV-069, 2026-09-19)
   — permission SESSION_VIEW_ALL/SESSION_REVOKE_ALL, KHÔNG có `isCurrent`
   trong response (khác `getMySessions()` tự xem chính mình).
===================================================================== */

export function getUserSessions(userId: string): Promise<AxiosResponse<{ message: string; data: Session[] }>> {
  return axiosInstance.get(`/users/${userId}/sessions`);
}

export function revokeUserSession(userId: string, sessionId: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`/users/${userId}/sessions/${sessionId}`);
}

/**
 * Roadmap C3 (Giám sát phiên đăng nhập toàn hệ thống, DEV-070, 2026-09-19) —
 * `GET /users/sessions`, response `{message:true, data, pagination}` (giống
 * `getUsers` ở trên). Thu hồi từ trang này gọi LẠI `revokeUserSession()` ở
 * trên (mỗi `SessionWithUser` đã có sẵn `user._id`), KHÔNG có endpoint riêng.
 */
export function getAllSessions(
  params: { page?: number; limit?: number; search?: string },
): Promise<AxiosResponse<{ message: unknown; data: SessionWithUser[]; pagination: Pagination }>> {
  return axiosInstance.get("/users/sessions", { params });
}
