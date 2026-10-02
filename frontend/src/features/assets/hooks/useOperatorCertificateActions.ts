import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createOperatorCertificate,
  updateOperatorCertificate,
  revokeOperatorCertificate,
  deleteOperatorCertificate,
} from "@/api/operatorCertificate.api";
import type { QueryClient } from "@tanstack/react-query";
import type {
  CreateOperatorCertificateRequest,
  UpdateOperatorCertificateRequest,
  RevokeOperatorCertificateRequest,
} from "@/types/operatorCertificate.types";

/**
 * [MỚI DEV-078] Invalidate CẢ 2 query đọc theo danh mục — list "còn hạn"
 * (`useCertifiedOperators`) VÀ lịch sử đầy đủ
 * (`useOperatorCertificateHistory`, `OperatorCertificateHistoryModal`) —
 * mọi mutation (tạo/sửa/thu hồi/xoá) đều có thể ảnh hưởng CẢ 2 view cùng
 * lúc nếu người dùng mở đồng thời.
 */
function invalidateOperatorCertificateQueries(queryClient: QueryClient, deviceCategoryId: string) {
  queryClient.invalidateQueries({ queryKey: ["operator-certificates", "certified-users", deviceCategoryId] });
  queryClient.invalidateQueries({ queryKey: ["operator-certificates", "history", deviceCategoryId] });
}

/**
 * [MỚI, DEV-077] Mutation gắn với form (`OperatorCertificateModal`) — KHÔNG
 * tự toast lỗi, component đọc `mutation.error` qua `parseApiError()` (cùng
 * pattern `useCreateMedicalDeviceProfile`).
 */
export function useCreateOperatorCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOperatorCertificateRequest) => createOperatorCertificate(body),
    onSuccess: (_data, variables) => {
      invalidateOperatorCertificateQueries(queryClient, variables.deviceCategory);
    },
  });
}

/**
 * [MỚI DEV-078] Sửa — CHỈ `certificateNumber`. `deviceCategoryId` truyền
 * riêng (không có trong response body dùng để invalidate) vì component gọi
 * mutation này luôn biết sẵn danh mục đang xem (mirror `useCreateOperatorCertificate`).
 */
export function useUpdateOperatorCertificate(deviceCategoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateOperatorCertificateRequest }) =>
      updateOperatorCertificate(id, body),
    onSuccess: () => invalidateOperatorCertificateQueries(queryClient, deviceCategoryId),
  });
}

/** [MỚI DEV-078] Thu hồi — bắt buộc lý do. */
export function useRevokeOperatorCertificate(deviceCategoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RevokeOperatorCertificateRequest }) =>
      revokeOperatorCertificate(id, body),
    onSuccess: () => invalidateOperatorCertificateQueries(queryClient, deviceCategoryId),
  });
}

/** [MỚI DEV-078] Xoá mềm — lỗi nhập liệu, không bắt buộc lý do. */
export function useDeleteOperatorCertificate(deviceCategoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOperatorCertificate(id),
    onSuccess: () => invalidateOperatorCertificateQueries(queryClient, deviceCategoryId),
  });
}
