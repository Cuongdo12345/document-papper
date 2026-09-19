import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createConsumableRequest,
  updateConsumableRequest,
  fulfillConsumableRequest,
  cancelConsumableRequest,
} from "@/api/consumable.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { CreateConsumableRequestRequest, UpdateConsumableRequestRequest } from "@/types/consumable.types";

/** Roadmap B8 (DEV-067) — 4 mutation (Tạo/Sửa/Đánh dấu đã mua/Huỷ) gộp chung 1 file, cùng lý do `useConsumableActions.ts`. */
function invalidateRequests(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["inventory", "requests"] });
}

export function useCreateConsumableRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateConsumableRequestRequest) => createConsumableRequest(body),
    onSuccess: () => {
      toast.success("Đã ghi nhận đề xuất vật tư");
      invalidateRequests(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useUpdateConsumableRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateConsumableRequestRequest }) =>
      updateConsumableRequest(id, body),
    onSuccess: () => {
      toast.success("Đã cập nhật đề xuất");
      invalidateRequests(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useFulfillConsumableRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fulfillConsumableRequest(id),
    onSuccess: () => {
      toast.success("Đã đánh dấu đề xuất là đã mua");
      invalidateRequests(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useCancelConsumableRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelConsumableRequest(id),
    onSuccess: () => {
      toast.success("Đã huỷ đề xuất");
      invalidateRequests(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
