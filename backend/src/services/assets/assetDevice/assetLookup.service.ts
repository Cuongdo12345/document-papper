// services/assets/assetDevice/assetLookup.service.ts
//
// Tách module Tài sản, Giai đoạn 6 (docs/development/ASSET_MODULE_SPLIT_PLAN.md mục 4.4 "chỗ dùng chéo"):
// tra cứu tài sản DÙNG CHUNG cho ô chọn tài sản ở Tài liệu (đề xuất sửa chữa) và Hợp đồng — nơi người dùng có
// thể chọn cả thiết bị CNTT lẫn thiết bị y tế. Thay cho `GET /api/assets` (đã gỡ ở Giai đoạn 8, DEV-120).
//
// Chỉ trả trường tối thiểu để chọn (mã, tên, loại, trạng thái, khoa, danh mục) — KHÔNG trả giá, bảo hành, người
// dùng, thông số… Người gọi chỉ thấy các loại mà họ có quyền xem (IT_ASSET_VIEW / MEDICAL_ASSET_VIEW).

import { Asset } from "../../../models/assets/asset.model";
import { AssetType } from "../../../interfaces/assets/asset.interface";
import { getCachedPermissions } from "../../rbac/permission.cache";
import { escapeRegex } from "../../../shared/utils/regex.util";
import ApiError from "../../../shared/errors/ApiError";
import { ASSET_VIEW_PERMISSION_BY_TYPE } from "../assetType.helper";

/** Các loại tài sản mà người dùng được xem (Super-Admin xem cả hai). */
export const getViewableAssetTypes = async (user: { _id: any; role?: { isSystemRole?: boolean } }): Promise<AssetType[]> => {
  if (user.role?.isSystemRole === true) return Object.values(AssetType);
  const permissions = await getCachedPermissions(String(user._id));
  return Object.values(AssetType).filter((type) => permissions.includes(ASSET_VIEW_PERMISSION_BY_TYPE[type]));
};

export interface AssetLookupQuery {
  page: number;
  limit: number;
  keyword?: string;
  assetType?: AssetType;
  department?: string;
}

export const getAssetLookupOptionsService = async (query: AssetLookupQuery, viewableTypes: AssetType[]) => {
  const { page, limit, keyword, assetType, department } = query;

  // Loại được yêu cầu mà người gọi không có quyền xem -> 403 (khác 404 theo id: ở đây là yêu cầu danh sách rõ ràng).
  if (assetType && !viewableTypes.includes(assetType)) {
    throw ApiError.forbidden("Không có quyền xem loại tài sản này");
  }
  const types = assetType ? [assetType] : viewableTypes;
  if (types.length === 0) throw ApiError.forbidden("Không có quyền xem tài sản");

  const filter: Record<string, unknown> = { isActive: true, assetType: { $in: types } };
  if (department) filter.department = department;
  if (keyword) {
    const safe = escapeRegex(keyword);
    filter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { assetCode: { $regex: safe, $options: "i" } },
    ];
  }

  const [data, total] = await Promise.all([
    Asset.find(filter)
      .select("assetCode name assetType status department category")
      .populate("department", "code name")
      .populate("category", "code name")
      .sort({ assetCode: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Asset.countDocuments(filter),
  ]);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

/**
 * Tra cứu MỘT tài sản theo id để biết loại (dẫn tới đúng trang chi tiết CNTT / y tế từ link thông báo, tài liệu,
 * hợp đồng). Tài sản thuộc loại người gọi KHÔNG xem được -> 404 (không lộ sự tồn tại). Khác danh sách: trả cả
 * tài sản đã xoá mềm (kèm `isActive`) vì tài liệu/hợp đồng có thể còn tham chiếu tới nó.
 */
export const getAssetLookupOptionByIdService = async (id: string, viewableTypes: AssetType[]) => {
  const asset = await Asset.findOne({ _id: id, assetType: { $in: viewableTypes } })
    .select("assetCode name assetType status isActive department category")
    .populate("department", "code name")
    .populate("category", "code name")
    .lean();
  if (!asset) throw ApiError.notFound("Không tìm thấy tài sản");
  return asset;
};
