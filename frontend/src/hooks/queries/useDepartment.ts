import { useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

import { departmentService } from "../../api/services/department.service";
import { DEPARTMENT_QUERY_KEYS } from "../../constants/departments/department.constants";

import type { GetDepartmentsParams } from "../../types/department/department.dto";
import type {
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from "../../types/department/department.dto";
import type { DepartmentOption } from "../../types/department/department.types";

// ─────────────────────────────────────────────────────────────────────────────
// useDepartments
// GET /api/departments — filter/pagination/sort đầy đủ
// Export departmentOptions để giải phóng Dashboard Tab 2/5/6 dependency
// ─────────────────────────────────────────────────────────────────────────────
export function useDepartments(params: GetDepartmentsParams = {}) {
  const query = useQuery({
    queryKey: DEPARTMENT_QUERY_KEYS.list(params),
    queryFn: () =>
      departmentService.listDepartments(params).then((res) => res.data),

    staleTime: 5 * 60_000, // 5 phút — reference data
    gcTime: 15 * 60_000, // 15 phút — giữ cache cho Dashboard navigation
    placeholderData: keepPreviousData,
  });

  const departmentOptions: DepartmentOption[] = useMemo(
    () =>
      (query.data?.data ?? []).map((dept) => ({
        value: dept._id,
        label: dept.name,
      })),
    [query.data?.data],
  );

  return {
    data: query.data?.data ?? [],
    pagination: query.data?.pagination ?? null,
    departmentOptions, // Dashboard dependency interface
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useDepartmentDetail
// GET /api/departments/:id
// ⚠️ Bug: luôn trả HTTP 404 cho mọi lỗi — đọc error.message tại component
// ─────────────────────────────────────────────────────────────────────────────
export function useDepartmentDetail(id: string) {
  return useQuery({
    queryKey: DEPARTMENT_QUERY_KEYS.detail(id),
    queryFn: () =>
      departmentService.getDepartmentById(id).then((res) => res.data),

    staleTime: 5 * 60_000,
    enabled: !!id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// useCreateDepartment
// POST /api/departments
// ⚠️ Bug: luôn trả HTTP 400 cho mọi lỗi (kể cả 409 duplicate code)
// Caller xử lý onSuccess/onError — hook chỉ invalidate
// ─────────────────────────────────────────────────────────────────────────────
export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDepartmentPayload) =>
      departmentService.createDepartment(payload).then((res) => res.data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_QUERY_KEYS.all });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// useUpdateDepartment
// PUT /api/departments/:id  ← PUT, KHÔNG phải PATCH
// ⚠️ Bug: luôn trả HTTP 400 cho mọi lỗi (kể cả 404 not found)
// Caller xử lý onSuccess/onError — hook chỉ invalidate
// ─────────────────────────────────────────────────────────────────────────────
export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateDepartmentPayload;
    }) =>
      departmentService.updateDepartment(id, payload).then((res) => res.data),

    onSuccess: (_, variables) => {
      // Invalidate detail trước (record đã thay đổi)
      queryClient.invalidateQueries({
        queryKey: DEPARTMENT_QUERY_KEYS.detail(variables.id),
      });
      // Invalidate all list (thứ tự có thể thay đổi nếu sort theo code/name)
      queryClient.invalidateQueries({
        queryKey: DEPARTMENT_QUERY_KEYS.all,
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// useDeleteDepartment
// DELETE /api/departments/:id — HARD DELETE, không restore
// ⚠️ Server guard: 400 nếu còn user/document tham chiếu
// ⚠️ Bug: luôn trả HTTP 400 cho mọi lỗi (kể cả 404 not found)
// Caller xử lý onSuccess/onError — hook chỉ invalidate
// ─────────────────────────────────────────────────────────────────────────────
export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      departmentService.deleteDepartment(id).then((res) => res.data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENT_QUERY_KEYS.all });
    },
  });
}
