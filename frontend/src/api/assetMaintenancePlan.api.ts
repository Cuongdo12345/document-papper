import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import { assetApiBase } from "@/api/assetPaths";
import type { AssetType } from "@/types/asset.types";
import type { Pagination } from "@/types/shared.types";
import type {
  AssetMaintenancePlan,
  CreateMaintenancePlanRequest,
  UpdateMaintenancePlanRequest,
  ResolveMaintenancePlanRequest,
  GetMaintenancePlanHistoryParams,
  GetMaintenanceCalendarParams,
} from "@/types/assetMaintenancePlan.types";

/**
 * API layer Roadmap B2 (Lịch bảo trì chủ động) — mount tại
 * `/api/<it|medical>-assets/maintenance-plans` (GĐ 8: route cũ `/api/assets/maintenance-plans` đã gỡ; trước đây tách khỏi `/api/assets` chính,
 * cùng cách `medical-devices` đã mount). Response envelope `{message, data}`
 * (không `success`) — cùng convention domain Asset/Calibration.
 */
export function createMaintenancePlan(
  type: AssetType,
  assetId: string,
  body: CreateMaintenancePlanRequest,
): Promise<AxiosResponse<{ message: string; data: AssetMaintenancePlan }>> {
  return axiosInstance.post(`${assetApiBase(type)}/maintenance-plans/asset/${assetId}`, body);
}

export function getMaintenancePlansForAsset(
  type: AssetType,
  assetId: string,
  params: GetMaintenancePlanHistoryParams,
): Promise<AxiosResponse<{ message: string; data: AssetMaintenancePlan[]; pagination: Pagination }>> {
  return axiosInstance.get(`${assetApiBase(type)}/maintenance-plans/asset/${assetId}`, { params });
}

export function updateMaintenancePlan(
  type: AssetType,
  id: string,
  body: UpdateMaintenancePlanRequest,
): Promise<AxiosResponse<{ message: string; data: AssetMaintenancePlan }>> {
  return axiosInstance.put(`${assetApiBase(type)}/maintenance-plans/${id}`, body);
}

export function completeMaintenancePlan(
  type: AssetType,
  id: string,
  body: ResolveMaintenancePlanRequest,
): Promise<AxiosResponse<{ message: string; data: AssetMaintenancePlan }>> {
  return axiosInstance.patch(`${assetApiBase(type)}/maintenance-plans/${id}/complete`, body);
}

export function cancelMaintenancePlan(
  type: AssetType,
  id: string,
  body: ResolveMaintenancePlanRequest,
): Promise<AxiosResponse<{ message: string; data: AssetMaintenancePlan }>> {
  return axiosInstance.patch(`${assetApiBase(type)}/maintenance-plans/${id}/cancel`, body);
}

/** `asset` LUÔN populate đầy đủ (kèm department) ở endpoint này — khác mọi endpoint khác trên chỉ trả ObjectId thô. */
export function getMaintenanceCalendar(
  type: AssetType,
  params: GetMaintenanceCalendarParams,
): Promise<AxiosResponse<{ message: string; data: AssetMaintenancePlan[] }>> {
  return axiosInstance.get(`${assetApiBase(type)}/maintenance-plans/calendar`, { params });
}
