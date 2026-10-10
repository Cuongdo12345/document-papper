import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getItDeviceProfile, upsertItDeviceProfile } from "@/api/itDeviceProfile.api";
import type { UpsertItDeviceProfileRequest } from "@/types/itDeviceProfile.types";

/**
 * Hồ sơ thiết bị CNTT. `data.data` là `null` khi chưa có hồ sơ (200, KHÁC hồ sơ y tế trả 404); `data.warnings`
 * chứa cảnh báo IP trùng. Không dùng `unwrapResponse` vì nó bỏ mất `warnings`.
 */
export function useItDeviceProfile(assetId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["it-devices", "profile", assetId] as const,
    queryFn: async () => (await getItDeviceProfile(assetId!)).data,
    enabled: !!assetId && enabled,
  });
}

/** Form đọc `mutation.error` / `mutation.data.warnings` — không tự toast (cùng pattern `useUpdateMedicalDeviceProfile`). */
export function useUpsertItDeviceProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, body }: { assetId: string; body: UpsertItDeviceProfileRequest }) =>
      (await upsertItDeviceProfile(assetId, body)).data,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["it-devices", "profile", variables.assetId] });
    },
  });
}
