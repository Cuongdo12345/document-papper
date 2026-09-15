import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCalibrationRecord } from "@/api/medicalDevice.api";
import type { CreateCalibrationRecordRequest } from "@/types/medicalDevice.types";

/** Mutation gắn với form (`CalibrationRecordModal`) — ghi nhận xong đổi cả `lastCalibrationDate`/`nextCalibrationDueDate` trên profile (transaction backend), nên invalidate CẢ profile lẫn lịch sử. */
export function useCreateCalibrationRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assetId,
      body,
      certificateFile,
    }: {
      assetId: string;
      body: CreateCalibrationRecordRequest;
      /** (A2, roadmap) tuỳ chọn — có thì gửi multipart, xem `medicalDevice.api.ts`. */
      certificateFile?: File;
    }) => createCalibrationRecord(assetId, body, certificateFile),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["medical-devices", "profile", variables.assetId] });
      queryClient.invalidateQueries({ queryKey: ["medical-devices", "calibration-history", variables.assetId] });
    },
  });
}
