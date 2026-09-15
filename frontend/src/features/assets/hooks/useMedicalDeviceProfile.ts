import { useQuery } from "@tanstack/react-query";
import { getMedicalDeviceProfile } from "@/api/medicalDevice.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import { parseApiError } from "@/utils/parseApiError";
import type { MedicalDeviceProfile } from "@/types/medicalDevice.types";

/**
 * `GET /assets/medical-devices/:assetId/profile` THROW 404 ("chưa có
 * profile thiết bị y tế") khi Asset chưa được gắn profile — KHÔNG trả
 * `null` (đã xác nhận qua source `medicalDevice.service.ts`). CÙNG PATTERN
 * `useDocumentWorkflow.ts` (FE-05): tắt retry (404 không phải lỗi tạm
 * thời), expose `notFound` riêng để component phân biệt "chưa có hồ sơ"
 * (hiện nút Tạo) với lỗi thật (hiện `ErrorState`+retry).
 */
export function useMedicalDeviceProfile(assetId: string | undefined, enabled: boolean) {
  const query = useQuery({
    queryKey: ["medical-devices", "profile", assetId] as const,
    queryFn: async () => {
      const response = await getMedicalDeviceProfile(assetId!);
      return unwrapResponse<MedicalDeviceProfile>(response).data;
    },
    enabled: !!assetId && enabled,
    retry: false,
  });

  const status = query.error ? parseApiError(query.error).status : undefined;
  const notFound = status === 404;

  return { ...query, notFound };
}
