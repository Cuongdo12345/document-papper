/**
 * Roadmap B2 (Lịch bảo trì chủ động, 2026-09-15) — khớp
 * `assetMaintenancePlan.interface.ts`/`.model.ts`/`.dto.ts` (backend),
 * không suy đoán field.
 */
export const MAINTENANCE_PLAN_STATUSES = ["planned", "completed", "cancelled"] as const;
export type MaintenancePlanStatus = (typeof MAINTENANCE_PLAN_STATUSES)[number];

interface MaintenancePlanUserRef {
  _id: string;
  username: string;
  fullName: string;
}

interface MaintenancePlanAssetRef {
  _id: string;
  assetCode: string;
  name: string;
  department?: { _id: string; code: string; name: string };
}

export interface AssetMaintenancePlan {
  _id: string;
  /** string (ObjectId thô) ở hầu hết response — object (populate đầy đủ) chỉ ở GET .../calendar. */
  asset: string | MaintenancePlanAssetRef;
  title: string;
  description?: string;
  scheduledDate: string;
  status: MaintenancePlanStatus;
  /** TÍNH THÊM ở backend (không lưu DB) — status=planned VÀ scheduledDate đã qua. */
  isOverdue: boolean;
  completedAt?: string;
  completedBy?: MaintenancePlanUserRef | string;
  cancelledAt?: string;
  cancelledBy?: MaintenancePlanUserRef | string;
  resolutionNote?: string;
  createdBy: MaintenancePlanUserRef | string;
  createdAt: string;
  updatedAt: string;
}

/** Khớp `CreateMaintenancePlanDTO`. */
export interface CreateMaintenancePlanRequest {
  title: string;
  description?: string;
  scheduledDate: string;
}

/** Khớp `UpdateMaintenancePlanDTO` — CHỦ Ý KHÔNG có `status` (chỉ đổi qua complete/cancel). */
export interface UpdateMaintenancePlanRequest {
  title?: string;
  description?: string;
  scheduledDate?: string;
}

/** Khớp `ResolveMaintenancePlanDTO` — dùng chung cho cả complete/cancel. */
export interface ResolveMaintenancePlanRequest {
  resolutionNote?: string;
}

export interface GetMaintenancePlanHistoryParams {
  page?: number;
  limit?: number;
}

export interface GetMaintenanceCalendarParams {
  month: number;
  year: number;
  department?: string;
}
