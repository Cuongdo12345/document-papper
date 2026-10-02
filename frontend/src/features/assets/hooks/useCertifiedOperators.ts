import { useQuery } from "@tanstack/react-query";
import { getCertifiedUsersForCategory } from "@/api/operatorCertificate.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { OperatorCertificate } from "@/types/operatorCertificate.types";

/**
 * [MỚI, DEV-077] Danh sách user hiện có chứng chỉ hợp lệ cho 1 danh mục
 * thiết bị (`deviceCategoryId`) — dùng trong `MedicalDeviceSection` khi
 * `profile.operatorCertificateRequired = true`.
 */
export function useCertifiedOperators(deviceCategoryId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["operator-certificates", "certified-users", deviceCategoryId] as const,
    queryFn: async () => {
      const response = await getCertifiedUsersForCategory(deviceCategoryId!);
      return unwrapResponse<OperatorCertificate[]>(response).data;
    },
    enabled: !!deviceCategoryId && enabled,
  });
}
