/**
 * FE-06 (Assets Core UI) — MỞ RỘNG type domain Asset. Phần tối thiểu cho
 * `AssetPicker`/FE-04 (`AssetListItem`/`GetAssetsParams`) GIỮ NGUYÊN, không
 * đổi shape (đang được `AssetPicker.tsx`/`DocumentDetailPage.tsx` dùng) —
 * chỉ CỘNG THÊM type cho trang Assets UI đầy đủ. Khớp `asset.model.ts`/
 * `assets.dto.ts`/`ASSET_POPULATE` thật (backend), không suy đoán field.
 */
export const ASSET_STATUSES = ["IN_STOCK", "IN_USE", "UNDER_MAINTENANCE", "RESERVED", "DISPOSED", "LOST"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export interface AssetListItem {
  _id: string;
  assetCode: string;
  name: string;
  status: AssetStatus;
  department?: { _id: string; code: string; name: string } | null;
  /** DEV-035 — thêm để `AssetsListPage` hiển thị cột "Hoạt động" + action Khôi phục (field đã có sẵn trong response thật, chỉ mới khai báo type). */
  isActive?: boolean;
}

/** Khớp `QueryAssetDTO` — `status` chỉ nhận 1 giá trị đơn (không phải mảng loại trừ). */
export interface GetAssetsParams {
  page?: number;
  limit?: number;
  keyword?: string;
  department?: string;
  category?: string;
  status?: AssetStatus;
  /** DEV-035 — mới thêm ở `QueryAssetDTO` (trước đây backend hard-code `true`, không nhận query). */
  isActive?: boolean;
  sortBy?: string;
  order?: "asc" | "desc";
}

/**
 * Asset đầy đủ — khớp `ASSET_POPULATE` (`asset.service.ts`): `category`/
 * `department`/`assignedTo` populate lite, còn lại field thô từ
 * `asset.model.ts`. Dùng cho Detail/Create/Edit — `AssetListItem` (trên) VẪN
 * GIỮ RIÊNG cho `AssetPicker` (chỉ cần 4 field, không kéo theo toàn bộ type
 * này vào 1 dropdown nhỏ).
 */
export interface Asset {
  _id: string;
  assetCode: string;
  name: string;
  category: { _id: string; code: string; name: string };
  department: { _id: string; code: string; name: string };
  assignedTo?: { _id: string; username: string; fullName: string; email?: string } | null;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  location?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiredAt?: string;
  supplier?: string;
  maintenanceStartedAt?: string;
  lastInventoryCheckAt?: string;
  /** Giai đoạn 5 (roadmap A1) — KHÔNG populate (không có trong `ASSET_POPULATE`), chỉ là ObjectId thô. */
  lastInventoryCheckBy?: string;
  status: AssetStatus;
  isActive: boolean;
  specs?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Khớp `CreateAssetDTO`. */
export interface CreateAssetRequest {
  category: string;
  department: string;
  name: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  location?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiredAt?: string;
  supplier?: string;
  specs?: Record<string, unknown>;
}

/**
 * Khớp `UpdateAssetDTO` — CHỦ Ý không có `status`/`assignedTo`/`department`
 * (đổi qua endpoint assign/transfer/return riêng, xem `assets.dto.ts` comment gốc).
 */
export type UpdateAssetRequest = Omit<CreateAssetRequest, "category" | "department"> & {
  category?: string;
};

/**
 * Khớp `AssetCategory` model — `parentCategory` là OBJECT populate lite
 * (`.populate("parentCategory","code name")`, xem `assetCategory.service.ts`
 * `getAllAssetCategoriesService`/`getAssetCategoryByIdService`), KHÔNG phải
 * string ID thô. Dùng CHUNG cho dropdown chọn danh mục (Asset Create/Edit —
 * chỉ đọc `_id`/`name`) VÀ `AssetCategoriesListPage` (Asset Categories UI —
 * đọc thêm `parentCategory.name` để hiển thị cột "Danh mục cha").
 */
export interface AssetCategory {
  _id: string;
  code: string;
  name: string;
  parentCategory?: { _id: string; code: string; name: string } | null;
  defaultWarrantyMonths?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Khớp `QueryAssetCategoryDTO` — `isActive` mới thêm (trước đây backend hard-code `true`, không nhận query, cùng fix `GetAssetsParams.isActive`). */
export interface GetAssetCategoriesParams {
  page?: number;
  limit?: number;
  keyword?: string;
  isActive?: boolean;
}

/** Khớp `CreateAssetCategoryDTO`. */
export interface CreateAssetCategoryRequest {
  code: string;
  name: string;
  parentCategory?: string;
  defaultWarrantyMonths?: number;
}

/** Khớp `UpdateAssetCategoryDTO` — CHỦ Ý KHÔNG có `code` (`ASSET_CATEGORY_UPDATE_WHITELIST` không nhận field này, mã danh mục bất biến sau khi tạo) và KHÔNG có `isActive` (đổi qua action Xoá/Khôi phục riêng, không qua form sửa — tránh 2 đường đổi trạng thái cùng lúc, xem `AssetCategoryFormModal.tsx`). */
export interface UpdateAssetCategoryRequest {
  name?: string;
  parentCategory?: string;
  defaultWarrantyMonths?: number;
}

/** Khớp `AssignAssetDTO`. */
export interface AssignAssetRequest {
  toDepartment: string;
  toUser?: string;
  reason?: string;
}

/** Khớp `TransferAssetDTO` — `toUser: ""` CHỦ Ý gỡ user hiện tại (khác không truyền field này). */
export interface TransferAssetRequest {
  toDepartment?: string;
  toUser?: string;
  reason?: string;
}

/** Khớp `ReturnAssetDTO`. */
export interface ReturnAssetRequest {
  toDepartment?: string;
  reason?: string;
}

export const ASSET_ASSIGNMENT_ACTION_TYPES = ["ASSIGN", "TRANSFER", "RETURN"] as const;
export type AssetAssignmentActionType = (typeof ASSET_ASSIGNMENT_ACTION_TYPES)[number];

/** Khớp `ASSIGNMENT_HISTORY_POPULATE` (`assetAssignment.service.ts`). */
export interface AssetAssignmentHistoryItem {
  _id: string;
  actionType: AssetAssignmentActionType;
  fromDepartment?: { _id: string; code: string; name: string } | null;
  toDepartment?: { _id: string; code: string; name: string } | null;
  fromUser?: { _id: string; username: string; fullName: string } | null;
  toUser?: { _id: string; username: string; fullName: string } | null;
  handedOverBy: { _id: string; username: string; fullName: string };
  reason?: string;
  effectiveAt: string;
  createdAt: string;
}

export interface GetAssetAssignmentHistoryParams {
  page?: number;
  limit?: number;
}

/* =========================================================================
   EXCEL (FE-15, roadmap Mục 20) — xác nhận trực tiếp `assetExcel.service.ts`.
   Import CHỈ TẠO MỚI (không update qua Excel, xem comment gốc service) —
   khác Document (có cả create/update).
========================================================================= */

/** Khớp query thật của `exportAssetsExcelPRO`. */
export interface ExportAssetsExcelParams {
  department?: string;
  category?: string;
  status?: AssetStatus;
  keyword?: string;
}

/** Preview row của `importAssetsExcel` khi `dryRun:true` — `action` LUÔN `"create"` (Asset import không hỗ trợ update). */
export interface AssetImportPreviewRow {
  row: number;
  action: "create";
  category: string;
  department: string;
  name: string;
  serialNumber?: string;
}
