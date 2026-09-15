import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { assignAsset, transferAsset, returnAsset } from "@/api/assets.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { AssignAssetRequest, TransferAssetRequest, ReturnAssetRequest } from "@/types/asset.types";

/**
 * FE-06 — 3 action Cấp phát/Luân chuyển/Thu hồi (roadmap Mục 12). Gộp chung
 * 1 file (cùng lý do `useWorkflowActions.ts` FE-05): cả 3 CHUNG 1 chiến lược
 * invalidate (asset detail thay đổi `status`/`assignedTo`/`department`, kéo
 * theo list + lịch sử cấp phát đổi theo) dù shape body mỗi action khác nhau
 * (`AssignAssetRequest`/`TransferAssetRequest`/`ReturnAssetRequest`).
 */
function invalidateAfterAssignment(queryClient: QueryClient, id: string) {
  queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
  queryClient.invalidateQueries({ queryKey: ["assets", "detail", id] });
  queryClient.invalidateQueries({ queryKey: ["assets", "assignment-history", id] });
}

export function useAssignAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AssignAssetRequest }) => assignAsset(id, body),
    onSuccess: (_data, variables) => {
      toast.success("Đã cấp phát tài sản");
      invalidateAfterAssignment(queryClient, variables.id);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useTransferAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TransferAssetRequest }) => transferAsset(id, body),
    onSuccess: (_data, variables) => {
      toast.success("Đã luân chuyển tài sản");
      invalidateAfterAssignment(queryClient, variables.id);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useReturnAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReturnAssetRequest }) => returnAsset(id, body),
    onSuccess: (_data, variables) => {
      toast.success("Đã thu hồi tài sản về kho");
      invalidateAfterAssignment(queryClient, variables.id);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
