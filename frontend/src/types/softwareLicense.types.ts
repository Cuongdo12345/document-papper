/**
 * FE-43 (tách module Tài sản, Giai đoạn 7) — bản quyền phần mềm. Khớp `ISoftwareLicense` + `decorate()` ở
 * `softwareLicense.service.ts` (backend, DEV-116). KHÔNG có trường khoá bản quyền (quyết định Q-A2): chỉ số
 * hợp đồng/đơn hàng và file chứng từ.
 */
export const SOFTWARE_LICENSE_TYPES = ["PERPETUAL", "SUBSCRIPTION"] as const;
export type SoftwareLicenseType = (typeof SOFTWARE_LICENSE_TYPES)[number];

export interface SoftwareLicenseAssetRef {
  _id: string;
  assetCode: string;
  name: string;
  status: string;
  isActive: boolean;
  department?: string;
}

/** 1 dòng danh sách — KHÔNG có `assets` (backend chỉ trả `usedSeats`; xem chi tiết để lấy danh sách máy). */
export interface SoftwareLicenseListItem {
  _id: string;
  softwareName: string;
  edition?: string;
  version?: string;
  licenseType: SoftwareLicenseType;
  totalSeats: number;
  usedSeats: number;
  freeSeats: number;
  isExpired: boolean;
  purchaseDate?: string;
  expiresAt?: string;
  vendor?: { _id: string; name: string } | null;
  contractOrOrderNumber?: string;
  proofFileId?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SoftwareLicense extends SoftwareLicenseListItem {
  assets: SoftwareLicenseAssetRef[];
}

export interface GetSoftwareLicensesParams {
  page?: number;
  limit?: number;
  keyword?: string;
  licenseType?: SoftwareLicenseType;
  isActive?: boolean;
  /** Chỉ bản quyền đang gán cho máy này. */
  asset?: string;
  expiringWithinDays?: number;
  sortBy?: "softwareName" | "expiresAt" | "createdAt";
  order?: "asc" | "desc";
}

/** Khớp `CreateSoftwareLicenseDTO`. */
export interface CreateSoftwareLicenseRequest {
  softwareName: string;
  edition?: string;
  version?: string;
  licenseType: SoftwareLicenseType;
  totalSeats: number;
  purchaseDate?: string;
  expiresAt?: string;
  vendor?: string;
  contractOrOrderNumber?: string;
}

/** Khớp `UpdateSoftwareLicenseDTO` — chuỗi rỗng / `null` xoá trường (backend `emptyToNull`). */
export interface UpdateSoftwareLicenseRequest {
  softwareName?: string;
  edition?: string | null;
  version?: string | null;
  licenseType?: SoftwareLicenseType;
  totalSeats?: number;
  purchaseDate?: string | null;
  expiresAt?: string | null;
  vendor?: string | null;
  contractOrOrderNumber?: string | null;
}

export interface SoftwareLicenseAlertsResult {
  expiring: { checked: number; notified: number };
}
