import type { Document } from "@/types/document.types";
import type { Asset, AssetStatus } from "@/types/asset.types";
import type { MedicalDeviceClass } from "@/types/medicalDevice.types";
import type { Department } from "@/types/department.types";

/**
 * FE-09 (Dashboard UI, roadmap Mục 15) — `dashboard.route.ts` (12 endpoint)
 * KHÔNG có `validateQuery`/Zod DTO (FRONTEND_MEMORY.md Mục 6.4) — type ở
 * đây suy trực tiếp từ ĐỌC SOURCE `dashboard.controller.ts` +
 * `dashboard.service.ts`/`assetDashboard.service.ts`/
 * `medicalDeviceDashboard.service.ts`, KHÔNG suy đoán từ OpenAPI (không có
 * Zod DTO thì OpenAPI domain này cũng không đáng tin).
 *
 * ⚠️ Response shape KHÔNG ĐỒNG NHẤT giữa các endpoint (đã xác nhận qua đọc
 * controller, không phải giả định):
 *  - "Summary" (admin-summary/department/assets-summary/medical-devices-summary):
 *    `{success, data: <object>}` — data là 1 object đơn, KHÔNG có pagination.
 *  - "KPI list" (proposal-conversion/device-damage-trend/top-damaged-devices/
 *    top-damaged-inks/device-stats) — `res.json({success, data})` với `data` CHÍNH LÀ
 *    `{items, pagination}` — nghĩa là response thật `{success, data:{items,
 *    pagination}}`, KHÁC shape `{success,data:[...],pagination}` phổ biến ở
 *    domain khác — KHÔNG dùng `unwrapResponse()` cho 4 endpoint này.
 *  - "Alert list" (warranty-expiring/maintenance-overdue/calibration-due) —
 *    controller `res.json({success, ...data})` (SPREAD) với `data` service
 *    trả `{data, pagination}` → response thật `{success, data:[...],
 *    pagination}` — ĐÚNG shape `unwrapResponse()` mong đợi.
 */

// ================= ADMIN / DEPARTMENT SUMMARY =================

export interface MonthCount {
  _id: number; // 1-12
  count: number;
}

export interface DepartmentDocumentCount {
  departmentId: string;
  departmentName: string;
  count: number;
}

export interface AdminDashboardSummary {
  totalDocuments: number;
  totalProposals: number;
  totalReports: number;
  totalDepartments: number;
  totalUsers: number;
  proposalsByMonth: MonthCount[];
  reportsByMonth: MonthCount[];
  documentsByDepartment: DepartmentDocumentCount[];
  recentDocuments: Document[];
}

export interface DepartmentDashboardSummary {
  department: Department;
  totalDocuments: number;
  totalProposals: number;
  totalReports: number;
  totalUsers: number;
  proposalsByMonth: MonthCount[];
  reportsByMonth: MonthCount[];
  recentDocuments: Document[];
}

// ================= KPI LIST (shape lồng {items,pagination} trong `data`) =================

export interface DashboardPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardKpiListResult<T> {
  items: T[];
  pagination: DashboardPagination;
}

export interface ProposalConversionItem {
  departmentId: string;
  departmentName: string;
  totalProposals: number;
  converted: number;
  conversionRate: number; // %, đã làm tròn 1 chữ số thập phân
}

export interface DeviceDamageTrendItem {
  year: number;
  month: number;
  totalReports: number;
  monthLabel: string; // "YYYY-MM"
}

export interface TopDamagedItem {
  deviceName: string;
  totalBroken: number;
  totalReports: number;
}

export interface DeviceStatsByMonthItem {
  deviceName: string;
  totalQuantity: number;
}

export interface GetTopDamagedParams {
  department?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: "totalBroken" | "totalReports" | "deviceName";
  sortOrder?: "asc" | "desc";
}

export interface GetProposalConversionParams {
  page?: number;
  limit?: number;
  sortBy?: "conversionRate" | "totalProposals" | "converted" | "departmentName";
  sortOrder?: "asc" | "desc";
}

export interface GetDeviceDamageTrendParams {
  page?: number;
  limit?: number;
  sortBy?: "monthLabel" | "year" | "month" | "totalReports";
  sortOrder?: "asc" | "desc";
}

/** Khớp check bắt buộc `getDashboardDeviceStats` — thiếu `month`/`year` → 400. */
export interface GetDeviceStatsParams {
  month: number;
  year: number;
  page?: number;
  limit?: number;
  sortBy?: "totalQuantity" | "deviceName";
  sortOrder?: "asc" | "desc";
}

// ================= ASSET DASHBOARD =================

export interface AssetStatusCount {
  status: AssetStatus;
  count: number;
}

export interface AssetCategoryCount {
  categoryId: string;
  categoryCode?: string;
  categoryName?: string;
  count: number;
}

export interface AssetDepartmentCount {
  departmentId: string;
  departmentCode?: string;
  departmentName?: string;
  count: number;
}

export interface AssetDashboardSummary {
  byStatus: AssetStatusCount[];
  byCategory: AssetCategoryCount[];
  byDepartment: AssetDepartmentCount[];
  totalAssets: number;
  totalPurchaseValue: number;
}

/** `daysInMaintenance` là field TÍNH THÊM (không có trong `asset.model.ts`) — chỉ xuất hiện ở response endpoint này. */
export type MaintenanceOverdueItem = Asset & { daysInMaintenance: number | null };

export interface GetAlertListParams {
  page?: number;
  limit?: number;
}

// ================= MEDICAL DEVICE DASHBOARD =================

export interface MedicalDeviceClassCount {
  deviceClass: MedicalDeviceClass;
  count: number;
}

export interface CalibrationCompliance {
  totalRequiresCalibration: number;
  onTime: number;
  overdue: number;
  /** `null` (KHÔNG phải 0) khi không có thiết bị nào cần kiểm định — xem comment gốc backend. */
  complianceRate: number | null;
}

export interface MedicalDeviceDashboardSummary {
  byClass: MedicalDeviceClassCount[];
  totalProfiles: number;
  calibrationCompliance: CalibrationCompliance;
}

export interface CalibrationDueItem {
  deviceClass: MedicalDeviceClass;
  registrationNumber?: string;
  requiresCalibration: boolean;
  calibrationIntervalMonths?: number;
  lastCalibrationDate?: string;
  nextCalibrationDueDate?: string;
  isOverdue: boolean;
  asset: {
    _id: string;
    name: string;
    assetCode: string;
    department: { _id: string; code: string; name: string };
  };
}

// ================= WORKFLOW DASHBOARD (Roadmap B1) =================

/** Khớp `OverdueApprovalInfo` (backend `workflowSlaAlerts.service.ts`). */
export interface OverdueApprovalItem {
  workflowInstanceId: string;
  documentId: string;
  documentTitle: string;
  documentCode: string;
  stepName: string;
  stepRole: string;
  slaDays: number;
  daysPending: number;
  daysOverdue: number;
  stepStartedAt: string;
  reminderSentAt?: string;
  escalatedAt?: string;
}
