import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination, BulkDeleteResult } from "@/types/shared.types";
import type { CreateDepartmentRequest, Department, GetDepartmentsParams, UpdateDepartmentRequest } from "@/types/department.types";

/**
 * API layer domain Departments (FE-03). Response shape KHÔNG đồng nhất giữa
 * các endpoint cùng domain (đã xác nhận trực tiếp `department.controller.ts`):
 * CHỈ `GET /departments` (list) dùng `success` (STRING); 4 endpoint còn lại
 * (detail/create/update/delete) dùng `message` (STRING) — không phải lỗi
 * đánh máy, là 2 quy ước khác nhau thật sự trong cùng 1 controller.
 */
export function getDepartments(
  params: GetDepartmentsParams,
): Promise<AxiosResponse<{ success: unknown; data: Department[]; pagination: Pagination }>> {
  return axiosInstance.get("/departments", { params });
}

export function getDepartmentById(id: string): Promise<AxiosResponse<{ message: string; data: Department }>> {
  return axiosInstance.get(`/departments/${id}`);
}

export function createDepartment(
  body: CreateDepartmentRequest,
): Promise<AxiosResponse<{ message: string; data: Department }>> {
  return axiosInstance.post("/departments", body);
}

export function updateDepartment(
  id: string,
  body: UpdateDepartmentRequest,
): Promise<AxiosResponse<{ message: string; data: Department }>> {
  return axiosInstance.put(`/departments/${id}`, body);
}

/** [SỬA DEV-086] Xoá MỀM (trước đây hard delete) — backend tự chặn (400) nếu còn user/document/asset thuộc khoa này, hành vi chặn giữ nguyên. */
export function deleteDepartment(id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`/departments/${id}`);
}

/** [MỚI DEV-086] Khôi phục khoa đã xoá mềm — permission RIÊNG DEPARTMENT_RESTORE. */
export function restoreDepartment(id: string): Promise<AxiosResponse<{ message: string; data: Department }>> {
  return axiosInstance.patch(`/departments/${id}/restore`);
}

/** [MỚI DEV-086] Xoá mềm hàng loạt — chọn nhiều dòng ở danh sách. */
export function bulkDeleteDepartments(ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/departments/bulk-delete", { ids });
}

/** [MỚI DEV-086] Khôi phục hàng loạt — permission RIÊNG DEPARTMENT_RESTORE. */
export function bulkRestoreDepartments(ids: string[]): Promise<AxiosResponse<{ message: string; data: BulkDeleteResult }>> {
  return axiosInstance.post("/departments/bulk-restore", { ids });
}
