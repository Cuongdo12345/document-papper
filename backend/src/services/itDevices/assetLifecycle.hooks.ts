// services/itDevices/assetLifecycle.hooks.ts
//
// DEV-116 (tách module Tài sản, Giai đoạn 5) — việc phải làm với dữ liệu CNTT khi vòng đời tài sản kết thúc.
// Tách thành module nhỏ (chỉ phụ thuộc 2 model) để `asset.service.ts` / `assetMaintenance.service.ts` gọi mà không
// kéo theo cả service bản quyền. Cả hai hàm đều idempotent (gọi lại không hại gì).

import { Types } from "mongoose";
import { SoftwareLicense } from "../../models/itDevices/softwareLicense.model";
import { ItDeviceProfile } from "../../models/itDevices/itDeviceProfile.model";

/**
 * Trả slot: gỡ tài sản khỏi MỌI bản quyền phần mềm. Gọi khi tài sản bị thanh lý (DISPOSED), xoá mềm hoặc xoá vĩnh
 * viễn (user chốt 2026-10-08). Khôi phục tài sản xoá mềm KHÔNG tự gán lại bản quyền — phải gán tay.
 */
export const releaseAssetFromSoftwareLicenses = async (assetId: Types.ObjectId | string): Promise<number> => {
  const result = await SoftwareLicense.updateMany({ assets: assetId }, { $pull: { assets: assetId } });
  return result.modifiedCount;
};

/** Xoá vĩnh viễn tài sản thì xoá luôn hồ sơ CNTT đi kèm (không có giá trị pháp lý, tránh hồ sơ mồ côi). */
export const deleteItDeviceProfileOfAsset = async (assetId: Types.ObjectId | string): Promise<void> => {
  await ItDeviceProfile.deleteOne({ asset: assetId });
};
