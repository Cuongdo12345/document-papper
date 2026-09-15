import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncDepartmentsFromExcel } from "@/api/documentExcel.api";

/**
 * Form mutation (`DepartmentSyncModal`) — KHÔNG toast lỗi trong hook (component
 * tự đọc `parseApiError`), cùng quy ước các mutation gắn form khác. Không
 * hỗ trợ dry-run (backend không có) — thành công LUÔN đã ghi DB thật.
 */
export function useSyncDepartmentsExcel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => syncDepartmentsFromExcel(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", "list"] });
    },
  });
}
