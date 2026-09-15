import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  createConsumableItem,
  updateConsumableItem,
  createConsumableTransaction,
} from "@/api/consumable.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type {
  CreateConsumableItemRequest,
  UpdateConsumableItemRequest,
  CreateConsumableTransactionRequest,
} from "@/types/consumable.types";

/**
 * Roadmap B3 — 3 mutation (Tạo vật tư/Sửa vật tư/Nhập-xuất kho) gộp chung 1
 * file, cùng lý do `useMaintenancePlanActions.ts`: đều CHUNG 1 chiến lược
 * invalidate (danh sách + chi tiết + lịch sử giao dịch của item).
 */
function invalidateAfterAction(queryClient: QueryClient, itemId?: string) {
  queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });
  if (itemId) {
    queryClient.invalidateQueries({ queryKey: ["inventory", "items", "detail", itemId] });
    queryClient.invalidateQueries({ queryKey: ["inventory", "items", itemId, "transactions"] });
  }
}

export function useCreateConsumableItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateConsumableItemRequest) => createConsumableItem(body),
    onSuccess: () => {
      toast.success("Đã tạo vật tư mới");
      invalidateAfterAction(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useUpdateConsumableItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateConsumableItemRequest }) =>
      updateConsumableItem(id, body),
    onSuccess: (_data, variables) => {
      toast.success("Đã cập nhật vật tư");
      invalidateAfterAction(queryClient, variables.id);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useCreateConsumableTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: CreateConsumableTransactionRequest }) =>
      createConsumableTransaction(itemId, body),
    onSuccess: (data, variables) => {
      const transaction = unwrapResponse(data).data;
      toast.success(
        transaction.type === "IN"
          ? `Đã nhập kho ${transaction.quantity}`
          : `Đã xuất kho ${transaction.quantity}`,
      );
      invalidateAfterAction(queryClient, variables.itemId);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
