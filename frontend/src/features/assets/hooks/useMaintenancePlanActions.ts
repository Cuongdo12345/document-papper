import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  createMaintenancePlan,
  updateMaintenancePlan,
  completeMaintenancePlan,
  cancelMaintenancePlan,
} from "@/api/assetMaintenancePlan.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type {
  CreateMaintenancePlanRequest,
  UpdateMaintenancePlanRequest,
  ResolveMaintenancePlanRequest,
} from "@/types/assetMaintenancePlan.types";

/**
 * Roadmap B2 — 4 mutation (Tạo/Sửa/Hoàn tất/Huỷ) gộp chung 1 file, cùng lý
 * do `useWorkflowActions.ts`: đều CHUNG 1 chiến lược invalidate (lịch sử
 * theo asset + calendar tháng), tách riêng sẽ lặp lại y hệt logic đó 4 lần.
 * `assetId` OPTIONAL trong biến mutate mỗi hook (trừ create — luôn cần) vì
 * `MaintenanceCalendarPage` chỉ biết `planId` khi sửa/hoàn tất/huỷ 1 plan
 * từ ô lịch, không có `assetId` sẵn trong tay — invalidate rộng
 * `["assets","maintenance-calendar"]` (prefix, khớp mọi tháng đang cache)
 * vẫn đủ đúng cho cả 2 nơi gọi.
 */
function invalidateAfterAction(queryClient: QueryClient, assetId: string | undefined) {
  queryClient.invalidateQueries({ queryKey: ["assets", "maintenance-calendar"] });
  if (assetId) {
    queryClient.invalidateQueries({ queryKey: ["assets", "maintenance-plans", assetId] });
  }
}

export function useCreateMaintenancePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, body }: { assetId: string; body: CreateMaintenancePlanRequest }) =>
      createMaintenancePlan(assetId, body),
    onSuccess: (_data, variables) => {
      toast.success("Đã lên lịch bảo trì");
      invalidateAfterAction(queryClient, variables.assetId);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useUpdateMaintenancePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateMaintenancePlanRequest; assetId?: string }) =>
      updateMaintenancePlan(id, body),
    onSuccess: (_data, variables) => {
      toast.success("Đã cập nhật kế hoạch bảo trì");
      invalidateAfterAction(queryClient, variables.assetId);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useCompleteMaintenancePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResolveMaintenancePlanRequest; assetId?: string }) =>
      completeMaintenancePlan(id, body),
    onSuccess: (data, variables) => {
      const plan = unwrapResponse(data).data;
      toast.success(`Đã hoàn tất bảo trì: ${plan.title}`);
      invalidateAfterAction(queryClient, variables.assetId);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useCancelMaintenancePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResolveMaintenancePlanRequest; assetId?: string }) =>
      cancelMaintenancePlan(id, body),
    onSuccess: (data, variables) => {
      const plan = unwrapResponse(data).data;
      toast.success(`Đã huỷ kế hoạch: ${plan.title}`);
      invalidateAfterAction(queryClient, variables.assetId);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
