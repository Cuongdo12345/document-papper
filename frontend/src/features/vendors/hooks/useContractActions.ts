import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createContract, updateContract, cancelContract, restoreContract } from "@/api/contract.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { CreateContractRequest, UpdateContractRequest, CancelContractRequest } from "@/types/contract.types";

/**
 * Roadmap B4 — 3 mutation (Tạo/Sửa/Huỷ) gộp chung 1 file, cùng lý do
 * `useMaintenancePlanActions.ts`: chung 1 chiến lược invalidate (danh sách +
 * chi tiết + danh sách theo từng asset liên quan).
 */
function invalidateAfterAction(queryClient: QueryClient, contractId?: string) {
  queryClient.invalidateQueries({ queryKey: ["contracts", "list"] });
  queryClient.invalidateQueries({ queryKey: ["contracts", "asset"] });
  if (contractId) queryClient.invalidateQueries({ queryKey: ["contracts", "detail", contractId] });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateContractRequest) => createContract(body),
    onSuccess: () => {
      toast.success("Đã tạo hợp đồng mới");
      invalidateAfterAction(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateContractRequest }) => updateContract(id, body),
    onSuccess: (_data, variables) => {
      toast.success("Đã cập nhật hợp đồng");
      invalidateAfterAction(queryClient, variables.id);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useCancelContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CancelContractRequest }) => cancelContract(id, body),
    onSuccess: (data, variables) => {
      const contract = unwrapResponse(data).data;
      toast.success(`Đã huỷ hợp đồng: ${contract.title}`);
      invalidateAfterAction(queryClient, variables.id);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

/** [MỚI 2026-09-16, DEV-058] Khôi phục hợp đồng đã huỷ. */
export function useRestoreContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreContract(id),
    onSuccess: (data, id) => {
      const contract = unwrapResponse(data).data;
      toast.success(`Đã khôi phục hợp đồng: ${contract.title}`);
      invalidateAfterAction(queryClient, id);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
