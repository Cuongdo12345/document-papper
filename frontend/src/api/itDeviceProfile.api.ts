import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import { IT_ASSETS_API } from "@/api/assetPaths";
import type { ItDeviceProfileResponse, UpsertItDeviceProfileRequest } from "@/types/itDeviceProfile.types";

/**
 * API layer hồ sơ thiết bị CNTT (FE-43) — `GET|PUT /api/it-assets/:assetId/profile` (backend DEV-116).
 * GET trả `data: null` (200) khi chưa có hồ sơ — KHÁC hồ sơ y tế (404). PUT = tạo nếu chưa có, ghi đè trường được gửi.
 */
export function getItDeviceProfile(assetId: string): Promise<AxiosResponse<ItDeviceProfileResponse>> {
  return axiosInstance.get(`${IT_ASSETS_API}/${assetId}/profile`);
}

export function upsertItDeviceProfile(
  assetId: string,
  body: UpsertItDeviceProfileRequest,
): Promise<AxiosResponse<ItDeviceProfileResponse>> {
  return axiosInstance.put(`${IT_ASSETS_API}/${assetId}/profile`, body);
}
