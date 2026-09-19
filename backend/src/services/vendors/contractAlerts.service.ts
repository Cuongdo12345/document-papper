// services/vendors/contractAlerts.service.ts
//
// Roadmap B4 (2026-09-16) — cảnh báo hợp đồng sắp hết hạn, mirror ĐÚNG
// pattern `checkWarrantyExpiringService` (`assetAlerts.service.ts`): guard
// `hasValidRecipients` trước khi xử lý, gửi 1 lần dùng cờ `expiryAlertSentAt`
// (reset khi `endDate` đổi — xem `contract.service.ts`), cron hằng ngày +
// API trigger tay.
//
// Người nhận: role "PHONG_VAT_TU_TTB" — bộ phận trực tiếp làm việc với NCC/
// hợp đồng. KHÔNG broadcast thêm theo phòng ban sở hữu từng asset (khác
// `consumableAlerts.service.ts`) — 1 hợp đồng có thể áp dụng cho asset của
// NHIỀU phòng ban khác nhau, quản lý hợp đồng là việc TẬP TRUNG ở Phòng Vật
// tư-TTB, không phải việc riêng của từng khoa.

import { Contract } from "../../models/vendors/contract.model";
import { ContractStatus } from "../../interfaces/vendors/contract.interface";
import {
  NotificationType,
  NotificationResourceType,
  NotificationPriority,
} from "../../models/notifications/notification.model";
import { Role } from "../../models/rbac/role.model";
import { User } from "../../models/users/user.model";
import { notifyUsersByRoleName } from "../notifications/notification.service";

const ALERT_RECIPIENT_ROLE = "PHONG_VAT_TU_TTB";

/** Số ngày trước hạn hợp đồng để bắt đầu cảnh báo — cùng ngưỡng `WARRANTY_ALERT_DAYS_BEFORE` (assetAlerts.service.ts) để nhất quán trải nghiệm cảnh báo trong toàn hệ thống. */
const CONTRACT_ALERT_DAYS_BEFORE = 30;

/** Xem giải thích đầy đủ lý do bắt buộc guard này ở `assetAlerts.service.ts`. */
const hasValidRecipients = async (roleName: string): Promise<boolean> => {
  const role = await Role.findOne({ name: roleName }).select("_id");
  if (!role) {
    console.warn(
      `[contractAlerts] Không tìm thấy role "${roleName}" trong DB — bỏ qua kiểm tra cảnh báo hợp đồng để tránh đánh dấu "đã gửi" nhầm.`,
    );
    return false;
  }

  const recipientCount = await User.countDocuments({ role: role._id, isActive: true });
  if (recipientCount === 0) {
    console.warn(
      `[contractAlerts] Role "${roleName}" chưa có user nào đang active — bỏ qua kiểm tra cảnh báo hợp đồng để tránh đánh dấu "đã gửi" nhầm.`,
    );
    return false;
  }

  return true;
};

/**
 * 📌 CẢNH BÁO HỢP ĐỒNG SẮP HẾT HẠN
 *
 * Gửi ĐÚNG 1 LẦN cho mỗi hợp đồng khi bước vào cửa sổ "còn ≤30 ngày tới hạn"
 * (kể cả hợp đồng đã QUA hạn mà chưa từng được cảnh báo — vẫn gửi, cùng lý
 * do `checkWarrantyExpiringService`). Chỉ xét hợp đồng còn "active" — hợp
 * đồng đã huỷ không cần cảnh báo hết hạn.
 */
export const checkContractsExpiringService = async () => {
  if (!(await hasValidRecipients(ALERT_RECIPIENT_ROLE))) {
    return { checked: 0, notified: 0 };
  }

  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + CONTRACT_ALERT_DAYS_BEFORE);

  const contracts = await Contract.find({
    status: ContractStatus.ACTIVE,
    endDate: { $lte: threshold },
    expiryAlertSentAt: null,
  }).populate("vendor", "name");

  let notified = 0;

  for (const contract of contracts) {
    const isAlreadyExpired = contract.endDate < now;
    const vendorName = (contract.vendor as any)?.name ?? "";

    await notifyUsersByRoleName(ALERT_RECIPIENT_ROLE, {
      type: NotificationType.CONTRACT_EXPIRING,
      title: isAlreadyExpired ? "Hợp đồng đã hết hạn" : "Hợp đồng sắp hết hạn",
      message: isAlreadyExpired
        ? `Hợp đồng "${contract.title}" (NCC: ${vendorName}) đã hết hạn từ ${contract.endDate.toLocaleDateString("vi-VN")}.`
        : `Hợp đồng "${contract.title}" (NCC: ${vendorName}) sẽ hết hạn vào ${contract.endDate.toLocaleDateString("vi-VN")}.`,
      resourceType: NotificationResourceType.CONTRACT,
      resourceId: contract._id as any,
      priority: NotificationPriority.HIGH,
      sendEmail: true,
    });

    contract.expiryAlertSentAt = now;
    await contract.save();
    notified++;
  }

  return { checked: contracts.length, notified };
};

/** 📌 CHẠY CẢNH BÁO — dùng cho cron job và cho API trigger tay. */
export const runContractAlertsService = async () => {
  const expiring = await checkContractsExpiringService();
  return { expiring };
};
