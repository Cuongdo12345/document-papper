import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMedicalDeviceProfile, updateMedicalDeviceProfile } from "@/api/medicalDevice.api";
import type { CreateMedicalDeviceProfileRequest, UpdateMedicalDeviceProfileRequest } from "@/types/medicalDevice.types";

/** Mutation gắn với form (`MedicalDeviceProfileModal`) — KHÔNG tự toast lỗi, component đọc `mutation.error` qua `parseApiError()` (cùng pattern `useCreateDocument`/`useCreateAsset`). */
export function useCreateMedicalDeviceProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, body }: { assetId: string; body: CreateMedicalDeviceProfileRequest }) =>
      createMedicalDeviceProfile(assetId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["medical-devices", "profile", variables.assetId] });
    },
  });
}

export function useUpdateMedicalDeviceProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, body }: { assetId: string; body: UpdateMedicalDeviceProfileRequest }) =>
      updateMedicalDeviceProfile(assetId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["medical-devices", "profile", variables.assetId] });
    },
  });
}
