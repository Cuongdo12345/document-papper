import { AssetCategory } from "../../models/assets/assetCategory.model";
import { Asset } from "../../models/assets/asset.model";
import { AssetType } from "../../interfaces/assets/asset.interface";
import ApiError from "../../shared/errors/ApiError";
import type { Permission } from "../../shared/constants/permission.constant";

/**
 * DEV-112 (tách module Tài sản, Giai đoạn 1 — docs/development/ASSET_MODULE_SPLIT_PLAN.md
 * mục 4.2). Loại tài sản (CNTT / Thiết bị y tế) lấy từ `assetType` của DANH MỤC
 * GỐC; danh mục con kế thừa. Các hàm dưới đây là nơi DUY NHẤT tính loại từ cây
 * danh mục, để mọi chỗ ghi (tạo/sửa tài sản, nhập Excel, hồ sơ y tế, chứng chỉ
 * vận hành, danh mục) cùng một quy tắc.
 */

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.IT]: "Thiết bị CNTT",
  [AssetType.MEDICAL]: "Thiết bị y tế",
};

export const UNTYPED_BRANCH_MESSAGE =
  "Danh mục không thuộc nhánh Thiết bị CNTT hay Thiết bị y tế (danh mục gốc chưa có loại)";

/**
 * Loại của gốc chứa `categoryId` (tính cả danh mục đã xoá mềm trên đường đi).
 * `undefined` nếu danh mục không tồn tại hoặc gốc chưa có loại. Cây chỉ vài cấp,
 * có chặn vòng lặp phòng dữ liệu hỏng.
 */
export const getCategoryRootType = async (categoryId: any): Promise<AssetType | undefined> => {
  const visited = new Set<string>();
  let cursor: any = categoryId;
  while (cursor && !visited.has(String(cursor))) {
    visited.add(String(cursor));
    const node = await AssetCategory.findById(cursor).select("parentCategory assetType").lean();
    if (!node) return undefined;
    if (!node.parentCategory) return node.assetType ?? undefined;
    cursor = node.parentCategory;
  }
  return undefined;
};

/** Như `getCategoryRootType` nhưng ném 400 nếu danh mục không thuộc nhánh nào. */
export const requireCategoryRootType = async (categoryId: any): Promise<AssetType> => {
  const type = await getCategoryRootType(categoryId);
  if (!type) throw ApiError.badRequest(UNTYPED_BRANCH_MESSAGE);
  return type;
};

/**
 * Loại của 1 tài sản. Sau migrate mọi tài sản đều có `assetType`; nhánh dự
 * phòng tính lại từ danh mục chỉ để bản code này không gãy nếu chạy trước khi
 * migrate.
 */
export const resolveAssetType = async (asset: { assetType?: AssetType; category?: any }) =>
  asset.assetType ?? (await getCategoryRootType(asset.category));

/** Toàn bộ id danh mục con cháu (GỒM cả danh mục đã xoá mềm) và chính nó. */
export const getAllDescendantCategoryIds = async (categoryId: any): Promise<any[]> => {
  const all = await AssetCategory.find({}).select("_id parentCategory").lean();
  const childrenOf = new Map<string, any[]>();
  for (const c of all) {
    if (!c.parentCategory) continue;
    const key = String(c.parentCategory);
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), c._id]);
  }
  const root = all.find((c) => String(c._id) === String(categoryId));
  const result: any[] = [root ? root._id : categoryId];
  const visited = new Set<string>([String(categoryId)]);
  for (let i = 0; i < result.length; i++) {
    for (const childId of childrenOf.get(String(result[i])) ?? []) {
      if (visited.has(String(childId))) continue;
      visited.add(String(childId));
      result.push(childId);
    }
  }
  return result;
};

/* =========================================================================
   DEV-115 (Giai đoạn 4) — cô lập theo loại cho 2 module `/api/it-assets` và
   `/api/medical-assets`. Truy cập tài sản/danh mục KHÁC loại bị coi là không
   tồn tại (404), không lộ sự tồn tại của dữ liệu thuộc module kia.
========================================================================= */


/** 404 nếu tài sản không tồn tại HOẶC thuộc loại khác (kể cả đã xoá mềm — để khôi phục/xoá vĩnh viễn vẫn đúng phạm vi). */
export const assertAssetOfType = async (assetId: any, assetType: AssetType): Promise<void> => {
  const found = await Asset.exists({ _id: assetId, assetType });
  if (!found) throw ApiError.notFound("Không tìm thấy tài sản");
};

/** 404 nếu danh mục không tồn tại HOẶC không thuộc nhánh của `assetType` (kể cả danh mục đã xoá mềm). */
export const assertCategoryOfType = async (categoryId: any, assetType: AssetType): Promise<void> => {
  const type = await getCategoryRootType(categoryId);
  if (type !== assetType) throw ApiError.notFound("Không tìm thấy danh mục tài sản");
};

/** Toàn bộ id danh mục (gồm đã xoá mềm) thuộc các nhánh gốc có `assetType` này. */
export const getBranchCategoryIds = async (assetType: AssetType): Promise<any[]> => {
  const all = await AssetCategory.find({}).select("_id parentCategory assetType").lean();
  const childrenOf = new Map<string, any[]>();
  for (const c of all) {
    if (!c.parentCategory) continue;
    const key = String(c.parentCategory);
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), c._id]);
  }
  const result: any[] = all.filter((c) => !c.parentCategory && c.assetType === assetType).map((c) => c._id);
  const visited = new Set<string>(result.map(String));
  for (let i = 0; i < result.length; i++) {
    for (const childId of childrenOf.get(String(result[i])) ?? []) {
      if (visited.has(String(childId))) continue;
      visited.add(String(childId));
      result.push(childId);
    }
  }
  return result;
};

/**
 * Quyền XEM danh sách tài sản của từng loại (GĐ 6). Dùng cho dashboard theo loại và tra cứu chung
 * (`/api/assets/lookup-options`): người gọi chỉ thấy loại mà họ có quyền xem.
 */
export const ASSET_VIEW_PERMISSION_BY_TYPE: Record<AssetType, Permission> = {
  [AssetType.IT]: "IT_ASSET_VIEW",
  [AssetType.MEDICAL]: "MEDICAL_ASSET_VIEW",
};
