import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDocumentsByMonth, type DeleteDocumentsByMonthRequest } from "@/api/documents.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/**
 * Quick action (modal riêng, ADMIN-only ở UI — xem `DeleteByMonthModal.tsx`).
 * Đây là SOFT-DELETE hàng loạt theo tháng (KHÔNG phải xoá vĩnh viễn,
 * DOCUMENT_DOMAIN_MAP.md Mục 2). Toast trong hook vì đây là action nhanh,
 * không phải form nhiều field.
 */
export function useDeleteDocumentsByMonth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: DeleteDocumentsByMonthRequest) => deleteDocumentsByMonth(body),
    onSuccess: (response) => {
      const { deletedCount, skippedCount } = response.data.data;
      toast.success(
        skippedCount > 0
          ? `Đã ẩn ${deletedCount} tài liệu (bỏ qua ${skippedCount} đề xuất còn biên bản tham chiếu)`
          : `Đã ẩn ${deletedCount} tài liệu`,
      );
      queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
