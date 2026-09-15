import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
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
 * `/api/assets/maintenance-plans` (`app.ts`, tách khỏi `/api/assets` chính,
 * cùng cách `medical-devices` đã mount). Response envelope `{message, data}`
 * (không `success`) — cùng convention domain Asset/Calibration.
 */
export function createMaintenancePlan(
  assetId: string,
  body: CreateMaintenancePlanRequest,
): Promise<AxiosResponse<{ message: string; data: AssetMaintenancePlan }>> {
  return axiosInstance.post(`/assets/maintenance-plans/asset/${assetId}`, body);
}

export function getMaintenancePlansForAsset(
  assetId: string,
  params: GetMaintenancePlanHistoryParams,
): Promise<AxiosResponse<{ message: string; data: AssetMaintenancePlan[]; pagination: Pagination }>> {
  return axiosInstance.get(`/assets/maintenance-plans/asset/${assetId}`, { params });
}

export function updateMaintenancePlan(
  id: string,
  body: UpdateMaintenancePlanRequest,
): Promise<AxiosResponse<{ message: string; data: AssetMaintenancePlan }>> {
  return axiosInstance.put(`/assets/maintenance-plans/${id}`, body);
}

export function completeMaintenancePlan(
  id: string,
  body: ResolveMaintenancePlanRequest,
): Promise<AxiosResponse<{ message: string; data: AssetMaintenancePlan }>> {
  return axiosInstance.patch(`/assets/maintenance-plans/${id}/complete`, body);
}

export function cancelMaintenancePlan(
  id: string,
  body: ResolveMaintenancePlanRequest,
): Promise<AxiosResponse<{ message: string; data: AssetMaintenancePlan }>> {
  return axiosInstance.patch(`/assets/maintenance-plans/${id}/cancel`, body);
}

/** `asset` LUÔN populate đầy đủ (kèm department) ở endpoint này — khác mọi endpoint khác trên chỉ trả ObjectId thô. */
export function getMaintenanceCalendar(
  params: GetMaintenanceCalendarParams,
): Promise<AxiosResponse<{ message: string; data: AssetMaintenancePlan[] }>> {
  return axiosInstance.get("/assets/maintenance-plans/calendar", { params });
}
