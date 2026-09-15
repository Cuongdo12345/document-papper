import { useQuery } from "@tanstack/react-query";
import { getMedicalDeviceCalibrationDue } from "@/api/dashboard.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { CalibrationDueItem, GetAlertListParams } from "@/types/dashboard.types";

/** Mặc định `daysAhead=30`, khớp `medicalDeviceAlerts.service.ts` (`CALIBRATION_ALERT_DAYS_BEFORE`, cùng ngưỡng dùng ở FE-07). */
export function useMedicalDeviceCalibrationDue(
  daysAhead: number,
  params: GetAlertListParams & { sortBy?: "nextCalibrationDueDate" | "deviceClass"; sortOrder?: "asc" | "desc" },
) {
  return useQuery({
    queryKey: ["dashboard", "medical-devices", "calibration-due", daysAhead, params] as const,
    queryFn: async () => {
      const response = await getMedicalDeviceCalibrationDue(daysAhead, params);
      return unwrapResponse<CalibrationDueItem[]>(response);
    },
    placeholderData: (prev) => prev,
    staleTime: 20_000,
  });
}
