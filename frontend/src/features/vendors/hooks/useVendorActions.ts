import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createVendor, updateVendor, bulkDeleteVendors, bulkRestoreVendors } from "@/api/vendor.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { toast } from "@/stores/toastStore";
import { showBulkDeleteToast } from "@/utils/bulkDeleteToast";
import { parseApiError } from "@/utils/parseApiError";
import type { CreateVendorRequest, UpdateVendorRequest } from "@/types/vendor.types";

/** Roadmap B4 — 2 mutation (Tạo/Sửa) gộp chung 1 file, cùng lý do `useConsumableActions.ts`. */
function invalidateAfterAction(queryClient: QueryClient, vendorId?: string) {
  queryClient.invalidateQueries({ queryKey: ["vendors", "list"] });
  if (vendorId) queryClient.invalidateQueries({ queryKey: ["vendors", "detail", vendorId] });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateVendorRequest) => createVendor(body),
    onSuccess: () => {
      toast.success("Đã tạo nhà cung cấp mới");
      invalidateAfterAction(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateVendorRequest }) => updateVendor(id, body),
    onSuccess: (_data, variables) => {
      toast.success("Đã cập nhật nhà cung cấp");
      invalidateAfterAction(queryClient, variables.id);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

/** [MỚI 2026-09-16, DEV-060] Xoá mềm hàng loạt — Batch Action Bar. */
export function useBulkDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteVendors(ids),
    onSuccess: (data, ids) => {
      showBulkDeleteToast(unwrapResponse(data).data, ids.length);
      invalidateAfterAction(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

/** [MỚI 2026-09-17, DEV-062] Khôi phục hàng loạt — Batch Action Bar. */
export function useBulkRestoreVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkRestoreVendors(ids),
    onSuccess: (data, ids) => {
      showBulkDeleteToast(unwrapResponse(data).data, ids.length, "khôi phục");
      invalidateAfterAction(queryClient);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
