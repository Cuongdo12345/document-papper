import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createConsumableCategory,
  updateConsumableCategory,
  deleteConsumableCategory,
  bulkDeleteConsumableCategories,
  restoreConsumableCategory,
  bulkRestoreConsumableCategories,
} from "@/api/consumableCategory.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { toast } from "@/stores/toastStore";
import { showBulkDeleteToast } from "@/utils/bulkDeleteToast";
import { parseApiError } from "@/utils/parseApiError";
import type { CreateConsumableCategoryRequest, UpdateConsumableCategoryRequest } from "@/types/consumableCategory.types";

/**
 * 4 mutation (Tạo/Sửa/Xoá/Khôi phục nhóm vật tư) gộp chung 1 file — cùng lý
 * do `useVendorActions.ts`/`useConsumableActions.ts` (module MỚI trong
 * feature `inventory`, khác convention split-file cũ của `AssetCategory`).
 */
function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["consumable-categories"] });
}

export function useCreateConsumableCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateConsumableCategoryRequest) => createConsumableCategory(body),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateConsumableCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateConsumableCategoryRequest }) =>
      updateConsumableCategory(id, body),
    onSuccess: () => invalidate(queryClient),
  });
}

/** Quick action (`ConfirmDialog`) — tự toast (khác 2 mutation trên gắn form, để component đọc `mutation.error`). */
export function useDeleteConsumableCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteConsumableCategory(id),
    onSuccess: () => {
      toast.success("Đã xoá nhóm vật tư");
      invalidate(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

/** [MỚI 2026-09-16, DEV-060] Xoá mềm hàng loạt — Batch Action Bar. */
export function useBulkDeleteConsumableCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteConsumableCategories(ids),
    onSuccess: (data, ids) => {
      showBulkDeleteToast(unwrapResponse(data).data, ids.length);
      invalidate(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useRestoreConsumableCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreConsumableCategory(id),
    onSuccess: () => {
      toast.success("Đã khôi phục nhóm vật tư");
      invalidate(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

/** [MỚI 2026-09-17, DEV-062] Khôi phục hàng loạt — Batch Action Bar. */
export function useBulkRestoreConsumableCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkRestoreConsumableCategories(ids),
    onSuccess: (data, ids) => {
      showBulkDeleteToast(unwrapResponse(data).data, ids.length, "khôi phục");
      invalidate(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
