import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination } from "@/types/shared.types";
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

/** Hard delete — backend tự chặn (400) nếu còn user/document/asset thuộc khoa này. */
export function deleteDepartment(id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`/departments/${id}`);
}
