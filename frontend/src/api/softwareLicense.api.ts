import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination } from "@/types/shared.types";
import type {
  CreateSoftwareLicenseRequest,
  GetSoftwareLicensesParams,
  SoftwareLicense,
  SoftwareLicenseAlertsResult,
  SoftwareLicenseListItem,
  UpdateSoftwareLicenseRequest,
} from "@/types/softwareLicense.types";

/**
 * API layer Bản quyền phần mềm (FE-43) — mount `/api/software-licenses` (backend DEV-116, 11 operation).
 * Envelope `{message, data}` / `{message, data, pagination}` (không có `success`).
 */
const BASE = "/software-licenses";

export function getSoftwareLicenses(
  params: GetSoftwareLicensesParams,
): Promise<AxiosResponse<{ message: string; data: SoftwareLicenseListItem[]; pagination: Pagination }>> {
  return axiosInstance.get(BASE, { params });
}

export function getSoftwareLicenseById(id: string): Promise<AxiosResponse<{ message: string; data: SoftwareLicense }>> {
  return axiosInstance.get(`${BASE}/${id}`);
}

export function createSoftwareLicense(
  body: CreateSoftwareLicenseRequest,
): Promise<AxiosResponse<{ message: string; data: SoftwareLicense }>> {
  return axiosInstance.post(BASE, body);
}

export function updateSoftwareLicense(
  id: string,
  body: UpdateSoftwareLicenseRequest,
): Promise<AxiosResponse<{ message: string; data: SoftwareLicense }>> {
  return axiosInstance.put(`${BASE}/${id}`, body);
}

export function deleteSoftwareLicense(id: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`${BASE}/${id}`);
}

export function restoreSoftwareLicense(id: string): Promise<AxiosResponse<{ message: string; data: SoftwareLicense }>> {
  return axiosInstance.patch(`${BASE}/${id}/restore`);
}

/** Gán bản quyền cho 1 máy CNTT — backend ép số máy ≤ `totalSeats` bằng cập nhật có điều kiện (400 khi hết chỗ). */
export function assignAssetToLicense(
  id: string,
  assetId: string,
): Promise<AxiosResponse<{ message: string; data: SoftwareLicense }>> {
  return axiosInstance.post(`${BASE}/${id}/assign`, { asset: assetId });
}

export function unassignAssetFromLicense(
  id: string,
  assetId: string,
): Promise<AxiosResponse<{ message: string; data: SoftwareLicense }>> {
  return axiosInstance.post(`${BASE}/${id}/unassign`, { asset: assetId });
}

/** Tải/thay chứng từ (multipart, trường `proofFile`; PDF/JPEG/PNG ≤ 10MB). */
export function setSoftwareLicenseProofFile(
  id: string,
  file: File,
): Promise<AxiosResponse<{ message: string; data: SoftwareLicense }>> {
  const formData = new FormData();
  formData.append("proofFile", file);
  return axiosInstance.put(`${BASE}/${id}/proof-file`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60_000,
  });
}

export function downloadSoftwareLicenseProofFile(id: string): Promise<AxiosResponse<Blob>> {
  return axiosInstance.get(`${BASE}/${id}/proof-file/download`, { responseType: "blob" });
}

export function runSoftwareLicenseAlerts(): Promise<AxiosResponse<{ message: string; data: SoftwareLicenseAlertsResult }>> {
  return axiosInstance.post(`${BASE}/alerts/run`);
}
