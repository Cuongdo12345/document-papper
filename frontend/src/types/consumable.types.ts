/**
 * Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15) — khớp
 * `consumableItem.interface.ts`/`.model.ts`, `consumableTransaction.interface.ts`/
 * `.model.ts`, `consumable.dto.ts` (backend), không suy đoán field.
 */
export const CONSUMABLE_TRANSACTION_TYPES = ["IN", "OUT"] as const;
export type ConsumableTransactionType = (typeof CONSUMABLE_TRANSACTION_TYPES)[number];

interface ConsumableUserRef {
  _id: string;
  username: string;
  fullName: string;
}

interface ConsumableDepartmentRef {
  _id: string;
  code: string;
  name: string;
}

export interface ConsumableItem {
  _id: string;
  name: string;
  unit: string;
  category?: string;
  department: string | ConsumableDepartmentRef;
  quantityOnHand: number;
  minStockThreshold: number;
  /** TÍNH THÊM ở backend (không lưu DB) — isActive VÀ quantityOnHand ≤ minStockThreshold. */
  isLowStock: boolean;
  lowStockAlertSentAt?: string;
  isActive: boolean;
  createdBy: ConsumableUserRef | string;
  updatedBy?: ConsumableUserRef | string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumableTransaction {
  _id: string;
  consumableItem: string;
  type: ConsumableTransactionType;
  quantity: number;
  balanceAfter: number;
  reason?: string;
  performedBy: ConsumableUserRef | string;
  createdAt: string;
}

/** Khớp `CreateConsumableItemDTO`. */
export interface CreateConsumableItemRequest {
  name: string;
  unit: string;
  category?: string;
  department: string;
  minStockThreshold?: number;
  initialQuantity?: number;
}

/** Khớp `UpdateConsumableItemDTO` — CHỦ Ý KHÔNG có `department`/`quantityOnHand`. */
export interface UpdateConsumableItemRequest {
  name?: string;
  unit?: string;
  category?: string;
  minStockThreshold?: number;
  isActive?: boolean;
}

/** Khớp `CreateConsumableTransactionDTO`. */
export interface CreateConsumableTransactionRequest {
  type: ConsumableTransactionType;
  quantity: number;
  reason?: string;
}

export interface GetConsumableItemsParams {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  isActive?: boolean;
  lowStockOnly?: boolean;
}

export interface GetConsumableTransactionsParams {
  page?: number;
  limit?: number;
}
