import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type {
  AdminDashboardSummary,
  DepartmentDashboardSummary,
  DashboardKpiListResult,
  ProposalConversionItem,
  GetProposalConversionParams,
  DeviceDamageTrendItem,
  GetDeviceDamageTrendParams,
  TopDamagedItem,
  GetTopDamagedParams,
  DeviceStatsByMonthItem,
  GetDeviceStatsParams,
  AssetDashboardSummary,
  MaintenanceOverdueItem,
  GetAlertListParams,
  MedicalDeviceDashboardSummary,
  CalibrationDueItem,
  DashboardPagination,
  OverdueApprovalItem,
} from "@/types/dashboard.types";
import type { Asset } from "@/types/asset.types";

/**
 * API layer domain Dashboard (FE-09) — response shape KHÔNG ĐỒNG NHẤT, xem
 * comment đầu `dashboard.types.ts`. Field `success` (boolean thật, không
 * phải string như Departments) — nhưng hook layer KHÔNG đọc field này (cùng
 * quy ước `unwrapResponse` toàn app: chỉ đọc `data`/`pagination`).
 */

// ================= SUMMARY (data = object đơn, không pagination) =================

export function getAdminDashboardSummary(): Promise<AxiosResponse<{ success: boolean; data: AdminDashboardSummary }>> {
  return axiosInstance.get("/dashboard/admin-summary");
}

export function getDepartmentDashboard(
  departmentId: string,
): Promise<AxiosResponse<{ success: boolean; data: DepartmentDashboardSummary }>> {
  return axiosInstance.get(`/dashboard/department/${departmentId}`);
}

export function getAssetDashboardSummary(): Promise<AxiosResponse<{ success: boolean; data: AssetDashboardSummary }>> {
  return axiosInstance.get("/dashboard/assets/summary");
}

export function getMedicalDeviceDashboardSummary(): Promise<
  AxiosResponse<{ success: boolean; data: MedicalDeviceDashboardSummary }>
> {
  return axiosInstance.get("/dashboard/medical-devices/summary");
}

// ================= KPI LIST (data = {items, pagination} LỒNG bên trong) =================

export function getProposalConversion(
  params: GetProposalConversionParams,
): Promise<AxiosResponse<{ success: boolean; data: DashboardKpiListResult<ProposalConversionItem> }>> {
  return axiosInstance.get("/dashboard/kpi/proposal-conversion", { params });
}

export function getDeviceDamageTrend(
  params: GetDeviceDamageTrendParams,
): Promise<AxiosResponse<{ success: boolean; data: DashboardKpiListResult<DeviceDamageTrendItem> }>> {
  return axiosInstance.get("/dashboard/kpi/device-damage-trend", { params });
}

export function getTopDamagedDevices(
  params: GetTopDamagedParams,
): Promise<AxiosResponse<{ success: boolean; data: DashboardKpiListResult<TopDamagedItem> }>> {
  return axiosInstance.get("/dashboard/kpi/top-damaged-devices", { params });
}

export function getTopDamagedInk(
  params: GetTopDamagedParams,
): Promise<AxiosResponse<{ success: boolean; data: DashboardKpiListResult<TopDamagedItem> }>> {
  return axiosInstance.get("/dashboard/kpi/top-damaged-inks", { params });
}

/** `month`/`year` BẮT BUỘC — backend throw 400 nếu thiếu (`getDashboardDeviceStats`). */
export function getDashboardDeviceStats(
  params: GetDeviceStatsParams,
): Promise<AxiosResponse<{ success: boolean; data: DashboardKpiListResult<DeviceStatsByMonthItem> }>> {
  return axiosInstance.get("/dashboard/device-stats", { params });
}

// ================= ALERT LIST (data = mảng phẳng + pagination top-level, khớp unwrapResponse) =================

export function getAssetWarrantyExpiring(
  daysAhead: number,
  params: GetAlertListParams,
): Promise<AxiosResponse<{ success: boolean; data: Asset[]; pagination: DashboardPagination }>> {
  return axiosInstance.get("/dashboard/assets/warranty-expiring", { params: { daysAhead, ...params } });
}

export function getAssetMaintenanceOverdue(
  daysThreshold: number,
  params: GetAlertListParams,
): Promise<AxiosResponse<{ success: boolean; data: MaintenanceOverdueItem[]; pagination: DashboardPagination }>> {
  return axiosInstance.get("/dashboard/assets/maintenance-overdue", { params: { daysThreshold, ...params } });
}

export function getMedicalDeviceCalibrationDue(
  daysAhead: number,
  params: GetAlertListParams & { sortBy?: "nextCalibrationDueDate" | "deviceClass"; sortOrder?: "asc" | "desc" },
): Promise<AxiosResponse<{ success: boolean; data: CalibrationDueItem[]; pagination: DashboardPagination }>> {
  return axiosInstance.get("/dashboard/medical-devices/calibration-due", { params: { daysAhead, ...params } });
}

/** Roadmap B1 (SLA & nhắc việc Workflow) — "Đề xuất trễ hạn". */
export function getWorkflowOverdueApprovals(
  params: GetAlertListParams,
): Promise<AxiosResponse<{ success: boolean; data: OverdueApprovalItem[]; pagination: DashboardPagination }>> {
  return axiosInstance.get("/dashboard/workflow/overdue-approvals", { params });
}
