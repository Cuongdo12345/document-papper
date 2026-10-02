import { useQuery } from "@tanstack/react-query";
import { getOperatorCertificates } from "@/api/operatorCertificate.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { OperatorCertificate } from "@/types/operatorCertificate.types";

/**
 * [MỚI DEV-078] Toàn bộ lịch sử chứng chỉ vận hành của 1 danh mục thiết bị —
 * KHÁC `useCertifiedOperators` (chỉ trả người CÒN HẠN, dedupe theo user).
 * Hàm này gọi `GET /operator-certificates` KHÔNG kèm `validOnly` — trả về
 * MỌI bản ghi (còn hạn/hết hạn/đã thu hồi/đã xoá), dùng cho
 * `OperatorCertificateHistoryModal`.
 */
export function useOperatorCertificateHistory(deviceCategoryId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["operator-certificates", "history", deviceCategoryId] as const,
    queryFn: async () => {
      const response = await getOperatorCertificates({ deviceCategory: deviceCategoryId!, limit: 50 });
      return unwrapResponse<OperatorCertificate[]>(response).data;
    },
    enabled: !!deviceCategoryId && enabled,
  });
}
