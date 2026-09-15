import { useQuery } from "@tanstack/react-query";
import { getCalibrationHistory } from "@/api/medicalDevice.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { CalibrationRecordItem, GetCalibrationHistoryParams } from "@/types/medicalDevice.types";

export function useCalibrationHistory(assetId: string | undefined, params: GetCalibrationHistoryParams) {
  return useQuery({
    queryKey: ["medical-devices", "calibration-history", assetId, params] as const,
    queryFn: async () => {
      const response = await getCalibrationHistory(assetId!, params);
      return unwrapResponse<CalibrationRecordItem[]>(response);
    },
    enabled: !!assetId,
    placeholderData: (prev) => prev,
  });
}
