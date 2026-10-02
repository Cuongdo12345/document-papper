import { useQuery } from "@tanstack/react-query";
import { getMedicalDevicesByClass } from "@/api/dashboard.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { MedicalDeviceByClassItem } from "@/types/dashboard.types";
import type { MedicalDeviceClass } from "@/types/medicalDevice.types";

/** [MỚI DEV-084] `enabled` — CHỈ gọi API khi modal đang mở (tránh gọi ngầm khi `deviceClass` chưa chọn). */
export function useMedicalDevicesByClass(
  deviceClass: MedicalDeviceClass | undefined,
  params: { page: number; limit: number },
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["dashboard", "medical-devices", "by-class", deviceClass, params] as const,
    queryFn: async () => {
      const response = await getMedicalDevicesByClass({ deviceClass: deviceClass!, ...params });
      return unwrapResponse<MedicalDeviceByClassItem[]>(response);
    },
    enabled: !!deviceClass && enabled,
    placeholderData: (prev) => prev,
    staleTime: 20_000,
  });
}
