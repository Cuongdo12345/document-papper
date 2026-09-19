/**
 * Roadmap B4 (2026-09-16) — khớp `contract.interface.ts`/`.model.ts`/
 * `contract.dto.ts` (backend), không suy đoán field.
 */
export const CONTRACT_STATUSES = ["active", "cancelled"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

/**
 * Giá trị lọc cho tham số query `status` — RIÊNG với `ContractStatus` (field
 * thật trên entity). "expired" KHÔNG phải enum thật của `Contract.status`
 * (raw DB chỉ có active/cancelled) — backend dịch sang `status=active` +
 * `endDate` đã qua (khớp `isExpired`). Thêm 2026-09-16 vì lọc "Còn hiệu lực"
 * trước đó trả về CẢ hợp đồng đã hết hạn (cùng field DB), không khớp badge
 * 3 trạng thái hiển thị trên `ContractsListPage`.
 */
export const CONTRACT_STATUS_FILTERS = ["active", "expired", "cancelled"] as const;
export type ContractStatusFilter = (typeof CONTRACT_STATUS_FILTERS)[number];

interface ContractUserRef {
  _id: string;
  username: string;
  fullName: string;
}

interface ContractVendorRef {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

interface ContractAssetRef {
  _id: string;
  assetCode: string;
  name: string;
  department?: { _id: string; code: string; name: string };
}

export interface Contract {
  _id: string;
  vendor: string | ContractVendorRef;
  assets: (string | ContractAssetRef)[];
  contractNumber?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  /** TÍNH THÊM ở backend (không lưu DB) — status=active VÀ endDate đã qua. */
  isExpired: boolean;
  cancelledAt?: string;
  cancelledBy?: ContractUserRef | string;
  cancelReason?: string;
  createdBy: ContractUserRef | string;
  createdAt: string;
  updatedAt: string;
}

/** Khớp `CreateContractDTO`. */
export interface CreateContractRequest {
  vendor: string;
  assets: string[];
  contractNumber?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
}

/** Khớp `UpdateContractDTO` — CHỦ Ý KHÔNG có `vendor`/`status`. */
export interface UpdateContractRequest {
  assets?: string[];
  contractNumber?: string;
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

/** Khớp `CancelContractDTO`. */
export interface CancelContractRequest {
  cancelReason?: string;
}

export interface GetContractsParams {
  page?: number;
  limit?: number;
  vendor?: string;
  asset?: string;
  status?: ContractStatusFilter;
  expiringWithinDays?: number;
}
