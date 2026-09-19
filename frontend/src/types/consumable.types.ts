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

interface ConsumableCategoryRef {
  _id: string;
  code: string;
  name: string;
}

export interface ConsumableItem {
  _id: string;
  name: string;
  unit: string;
  /** [SỬA 2026-09-16] Trước là text tự do — giờ ref `ConsumableCategory`, populate lite khi đọc (`GET /items`/`GET /items/:id`). */
  category?: ConsumableCategoryRef | null;
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

/** Khớp `CreateConsumableItemDTO` — `category` là ID (ObjectId) khi gửi lên, KHÁC shape populate lite ở `ConsumableItem.category`. */
export interface CreateConsumableItemRequest {
  name: string;
  unit: string;
  category?: string;
  department: string;
  minStockThreshold?: number;
  initialQuantity?: number;
}

/** Khớp `UpdateConsumableItemDTO` — CHỦ Ý KHÔNG có `department`/`quantityOnHand`. `category` là ID khi gửi lên. */
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
  category?: string;
  isActive?: boolean;
  lowStockOnly?: boolean;
}

export interface GetConsumableTransactionsParams {
  page?: number;
  limit?: number;
}

/* =====================================================================
   ĐỀ XUẤT/DỰ TRÙ VẬT TƯ (ConsumableRequest, Roadmap B8, DEV-067, 2026-09-18)
   — khớp `consumableRequest.interface.ts`/`.model.ts`, `consumable.dto.ts`
   (backend), không suy đoán field. Domain TÁCH BIỆT với ConsumableItem/
   ConsumableTransaction ở trên.
===================================================================== */

export const CONSUMABLE_REQUEST_STATUSES = ["PENDING", "FULFILLED", "CANCELLED"] as const;
export type ConsumableRequestStatus = (typeof CONSUMABLE_REQUEST_STATUSES)[number];

interface ConsumableRequestItemRef {
  _id: string;
  name: string;
  unit: string;
}

/** `consumableItem` populate lite khi ĐỌC (`GET /requests`/`GET /requests/:id`) — ID thô khi GỬI. */
export interface ConsumableRequestItem {
  consumableItem: ConsumableRequestItemRef | string;
  quantity: number;
  unitPrice: number;
  /** TÍNH SẴN ở backend = quantity * unitPrice. */
  totalPrice: number;
}

export interface ConsumableRequest {
  _id: string;
  department: string | ConsumableDepartmentRef;
  /** Định dạng "YYYY-MM". */
  requestMonth: string;
  items: ConsumableRequestItem[];
  /** TÍNH SẴN ở backend = SUM(items[].totalPrice). */
  totalAmount: number;
  status: ConsumableRequestStatus;
  note?: string;
  createdBy: ConsumableUserRef | string;
  updatedBy?: ConsumableUserRef | string;
  createdAt: string;
  updatedAt: string;
}

/** Khớp `ConsumableRequestItemDTO` — item gửi lên, không có `totalPrice` (backend tự tính). */
export interface ConsumableRequestItemInput {
  consumableItem: string;
  quantity: number;
  unitPrice: number;
}

/** Khớp `CreateConsumableRequestDTO`. */
export interface CreateConsumableRequestRequest {
  department: string;
  requestMonth: string;
  items: ConsumableRequestItemInput[];
  note?: string;
}

/** Khớp `UpdateConsumableRequestDTO` — CHỦ Ý KHÔNG có `department`/`requestMonth` (bất biến). Chỉ áp dụng khi request đang PENDING (backend check). */
export interface UpdateConsumableRequestRequest {
  items?: ConsumableRequestItemInput[];
  note?: string;
}

export interface GetConsumableRequestsParams {
  page?: number;
  limit?: number;
  department?: string;
  status?: ConsumableRequestStatus;
  requestMonth?: string;
}
