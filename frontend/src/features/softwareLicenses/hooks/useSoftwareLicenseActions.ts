import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  assignAssetToLicense,
  createSoftwareLicense,
  deleteSoftwareLicense,
  restoreSoftwareLicense,
  runSoftwareLicenseAlerts,
  setSoftwareLicenseProofFile,
  unassignAssetFromLicense,
  updateSoftwareLicense,
} from "@/api/softwareLicense.api";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";
import type { CreateSoftwareLicenseRequest, UpdateSoftwareLicenseRequest } from "@/types/softwareLicense.types";

/** Tạo/sửa không tự toast lỗi — form đọc `mutation.error` (cùng pattern `useCreateAsset`). */
export function useCreateSoftwareLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSoftwareLicenseRequest) => createSoftwareLicense(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software-licenses", "list"] });
    },
  });
}

export function useUpdateSoftwareLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSoftwareLicenseRequest }) => updateSoftwareLicense(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["software-licenses", "list"] });
      queryClient.invalidateQueries({ queryKey: ["software-licenses", "detail", variables.id] });
    },
  });
}

export function useDeleteSoftwareLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSoftwareLicense(id),
    onSuccess: () => {
      toast.success("Đã xoá bản quyền");
      queryClient.invalidateQueries({ queryKey: ["software-licenses"] });
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useRestoreSoftwareLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreSoftwareLicense(id),
    onSuccess: () => {
      toast.success("Đã khôi phục bản quyền");
      queryClient.invalidateQueries({ queryKey: ["software-licenses"] });
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

/** Gán/gỡ máy làm đổi chi tiết bản quyền, "bản quyền của máy" (`?asset=`) và số máy đã dùng ở danh sách → làm mới cả nhóm. */
export function useAssignAssetToLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assetId }: { id: string; assetId: string }) => assignAssetToLicense(id, assetId),
    onSuccess: () => {
      toast.success("Đã gán bản quyền cho thiết bị");
      queryClient.invalidateQueries({ queryKey: ["software-licenses"] });
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useUnassignAssetFromLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assetId }: { id: string; assetId: string }) => unassignAssetFromLicense(id, assetId),
    onSuccess: () => {
      toast.success("Đã gỡ bản quyền khỏi thiết bị");
      queryClient.invalidateQueries({ queryKey: ["software-licenses"] });
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useSetLicenseProofFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => setSoftwareLicenseProofFile(id, file),
    onSuccess: () => {
      toast.success("Đã cập nhật chứng từ bản quyền");
      queryClient.invalidateQueries({ queryKey: ["software-licenses"] });
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}

export function useRunSoftwareLicenseAlerts() {
  return useMutation({
    mutationFn: () => runSoftwareLicenseAlerts(),
    onSuccess: (response) => {
      const { checked, notified } = response.data.data.expiring;
      toast.success(`Đã kiểm tra ${checked} bản quyền, gửi ${notified} cảnh báo`);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
}
