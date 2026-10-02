import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncDepartmentsFromExcel } from "@/api/documentExcel.api";

/**
 * Form mutation (`DepartmentSyncModal`) — KHÔNG toast lỗi trong hook (component
 * tự đọc `parseApiError`), cùng quy ước các mutation gắn form khác.
 * [DEV-089] Tách 2 bước: `usePreviewDepartmentSync` (dryRun, không ghi DB) →
 * `useSyncDepartmentsExcel` (tạo thật, chỉ các khoa đã tick).
 */
export function usePreviewDepartmentSync() {
  return useMutation({
    mutationFn: (file: File) => syncDepartmentsFromExcel(file, { dryRun: true }),
  });
}

export function useSyncDepartmentsExcel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, names }: { file: File; names: string[] }) => syncDepartmentsFromExcel(file, { names }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", "list"] });
    },
  });
}
