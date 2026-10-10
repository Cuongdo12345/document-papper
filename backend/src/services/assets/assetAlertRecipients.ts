// services/assets/assetAlertRecipients.ts
//
// Tách module Tài sản, Giai đoạn 6 (docs/development/ASSET_MODULE_SPLIT_PLAN.md mục 4.5, Q-G):
// người nhận cảnh báo tài sản tính theo LOẠI tài sản.
//   - Thiết bị CNTT        -> IT
//   - Thiết bị y tế        -> Phòng Vật tư-TTB và IT
// Là nơi DUY NHẤT khai báo bảng này để cron bảo hành/bảo trì (assetAlerts) và cron hiệu chuẩn/giấy phép/
// chứng chỉ (medicalDeviceAlerts) không lệch nhau. Gửi qua `notifyUsersByRoleNames` (mỗi user nhận 1 lần).

import { AssetType } from "../../interfaces/assets/asset.interface";
import { Role } from "../../models/rbac/role.model";
import { User } from "../../models/users/user.model";

export const IT_ROLE_NAME = "IT";
export const MATERIALS_ROLE_NAME = "PHONG_VAT_TU_TTB";

export const ALERT_RECIPIENT_ROLES: Record<AssetType, string[]> = {
  [AssetType.IT]: [IT_ROLE_NAME],
  [AssetType.MEDICAL]: [MATERIALS_ROLE_NAME, IT_ROLE_NAME],
};

/**
 * Có ÍT NHẤT 1 user đang hoạt động thuộc các role nhận cảnh báo hay không.
 *
 * BẮT BUỘC kiểm tra TRƯỚC khi xử lý/đánh dấu "đã gửi": `notifyUsersByRoleName(s)` cố ý nuốt mọi lỗi, nếu không
 * ai nhận được thì cron vẫn đánh dấu `*AlertSentAt` và sẽ KHÔNG BAO GIỜ gửi lại (silent failure).
 */
export const hasValidAlertRecipients = async (roleNames: string[], logTag: string): Promise<boolean> => {
  const roles = await Role.find({ name: { $in: roleNames } }).select("_id name");
  if (roles.length === 0) {
    console.warn(`[${logTag}] Không tìm thấy role nào trong [${roleNames.join(", ")}] — bỏ qua cảnh báo để tránh đánh dấu "đã gửi" nhầm.`);
    return false;
  }
  const count = await User.countDocuments({ role: { $in: roles.map((r) => r._id) }, isActive: true });
  if (count === 0) {
    console.warn(`[${logTag}] Các role [${roleNames.join(", ")}] chưa có user nào đang active — bỏ qua cảnh báo để tránh đánh dấu "đã gửi" nhầm.`);
    return false;
  }
  return true;
};
