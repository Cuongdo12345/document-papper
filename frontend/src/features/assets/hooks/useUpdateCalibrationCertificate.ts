import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCalibrationCertificate } from "@/api/medicalDevice.api";
import type { UpdateCalibrationCertificateRequest } from "@/types/medicalDevice.types";

/**
 * Sửa chứng nhận đã lưu (sửa lỗi upload nhầm file) — bổ sung sau A2 theo yêu
 * cầu user. Chỉ invalidate lịch sử kiểm định — KHÔNG invalidate profile (endpoint
 * này không đụng `lastCalibrationDate`/`nextCalibrationDueDate`, khác
 * `useCreateCalibrationRecord`).
 */
export function useUpdateCalibrationCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assetId,
      recordId,
      body,
      certificateFile,
    }: {
      assetId: string;
      recordId: string;
      body: UpdateCalibrationCertificateRequest;
      certificateFile?: File;
    }) => updateCalibrationCertificate(assetId, recordId, body, certificateFile),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["medical-devices", "calibration-history", variables.assetId] });
    },
  });
}
