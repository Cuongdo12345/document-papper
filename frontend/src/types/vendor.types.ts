/**
 * Roadmap B4 (Quản lý nhà cung cấp & hợp đồng bảo trì, 2026-09-16) — khớp
 * `vendor.interface.ts`/`.model.ts`/`vendor.dto.ts` (backend), không suy
 * đoán field.
 */
export interface Vendor {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Khớp `CreateVendorDTO`. */
export interface CreateVendorRequest {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  notes?: string;
}

/** Khớp `UpdateVendorDTO`. */
export interface UpdateVendorRequest {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  notes?: string;
  isActive?: boolean;
}

export interface GetVendorsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}
