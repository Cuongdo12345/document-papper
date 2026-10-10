// services/itDevices/itDeviceProfile.service.ts
//
// DEV-116 (tách module Tài sản, Giai đoạn 5) — hồ sơ kỹ thuật thiết bị CNTT (1-1 với Asset loại IT).

import mongoose, { Types } from "mongoose";
import { Asset, AssetStatus } from "../../models/assets/asset.model";
import { ItDeviceProfile } from "../../models/itDevices/itDeviceProfile.model";
import { AssetType } from "../../interfaces/assets/asset.interface";
import ApiError from "../../shared/errors/ApiError";
import { resolveAssetType } from "../assets/assetType.helper";

export interface ItProfileWarning {
  code: "DUPLICATE_IP";
  message: string;
  assets: { _id: string; assetCode: string; name: string }[];
}

const PROFILE_FIELDS = ["cpu", "ram", "storage", "gpu", "ipAddress", "macAddress", "hostname", "vlan", "osName", "osVersion", "firmwareVersion"] as const;

const loadItAsset = async (assetId: any) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }
  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }
  if ((await resolveAssetType(asset)) !== AssetType.IT) {
    throw ApiError.badRequest("Chỉ thiết bị CNTT mới có hồ sơ CNTT");
  }
  return asset;
};

/**
 * IP trùng với thiết bị CNTT KHÁC còn hoạt động (chưa xoá mềm, chưa thanh lý/mất) -> cảnh báo, KHÔNG chặn (Q-A3):
 * một IP có thể dùng chung hợp lệ (cluster, VIP) hoặc gán tạm.
 */
export const findDuplicateIpWarnings = async (profile: { asset: Types.ObjectId; ipAddress?: string | null }): Promise<ItProfileWarning[]> => {
  if (!profile.ipAddress) return [];
  const others = await ItDeviceProfile.find({ ipAddress: profile.ipAddress, asset: { $ne: profile.asset } }).select("asset").lean();
  if (others.length === 0) return [];

  const assets = await Asset.find({
    _id: { $in: others.map((o) => o.asset) },
    isActive: true,
    status: { $nin: [AssetStatus.DISPOSED, AssetStatus.LOST] },
  })
    .select("assetCode name")
    .lean();
  if (assets.length === 0) return [];

  return [
    {
      code: "DUPLICATE_IP",
      message: `Địa chỉ IP ${profile.ipAddress} đang trùng với ${assets.length} thiết bị khác còn hoạt động`,
      assets: assets.map((a) => ({ _id: String(a._id), assetCode: a.assetCode, name: a.name })),
    },
  ];
};

/** `null` nếu tài sản CNTT này chưa có hồ sơ (không phải lỗi). */
export const getItDeviceProfileService = async (assetId: any) => {
  const asset = await loadItAsset(assetId);
  const profile = await ItDeviceProfile.findOne({ asset: asset._id });
  const warnings = profile ? await findDuplicateIpWarnings(profile) : [];
  return { profile, warnings };
};

/**
 * Tạo hồ sơ nếu chưa có, sửa nếu đã có (upsert nguyên tử qua chỉ mục duy nhất `asset`). Chỉ trường được gửi mới đổi;
 * giá trị `null` xoá trường. Trả `warnings` (IP trùng) — không chặn lưu.
 */
export const upsertItDeviceProfileService = async (assetId: any, payload: Record<string, unknown>, userId?: any) => {
  const asset = await loadItAsset(assetId);

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ""> = {};
  for (const field of PROFILE_FIELDS) {
    const value = payload[field];
    if (value === undefined) continue;
    if (value === null) $unset[field] = "";
    else $set[field] = value;
  }
  if (userId) $set.updatedBy = userId;

  const update: Record<string, unknown> = { $setOnInsert: { createdBy: userId } };
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;

  const run = () =>
    ItDeviceProfile.findOneAndUpdate({ asset: asset._id }, update, {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
    });

  let profile;
  try {
    profile = await run();
  } catch (err: any) {
    // Hai request tạo đồng thời: một bên thua chỉ mục duy nhất -> chạy lại thành cập nhật.
    if (err?.code === 11000) profile = await run();
    else throw err;
  }

  return { profile: profile!, warnings: await findDuplicateIpWarnings(profile!) };
};
