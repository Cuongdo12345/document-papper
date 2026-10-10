// services/itDevices/softwareLicenseAlerts.service.ts
//
// DEV-116 (tách module Tài sản, Giai đoạn 5) — cảnh báo bản quyền phần mềm thuê bao sắp / đã hết hạn.
// Mirror `contractAlerts.service.ts`: gửi 1 LẦN (đánh dấu `expiryAlertSentAt`), reset khi sửa `expiresAt`;
// người nhận là role IT (kế hoạch mục 4.5); guard `hasValidRecipients` để không đánh dấu "đã gửi" khi không ai nhận.

import { SoftwareLicense } from "../../models/itDevices/softwareLicense.model";
import { NotificationType, NotificationResourceType, NotificationPriority } from "../../models/notifications/notification.model";
import { Role } from "../../models/rbac/role.model";
import { User } from "../../models/users/user.model";
import { notifyUsersByRoleName } from "../notifications/notification.service";

const ALERT_RECIPIENT_ROLE = "IT";
/** Báo trước bao nhiêu ngày khi sắp hết hạn. */
export const SOFTWARE_LICENSE_ALERT_DAYS_BEFORE = 30;

const hasValidRecipients = async (roleName: string): Promise<boolean> => {
  const role = await Role.findOne({ name: roleName }).select("_id");
  if (!role) {
    console.warn(`[softwareLicenseAlerts] Không tìm thấy role "${roleName}" trong DB — bỏ qua cảnh báo bản quyền để tránh đánh dấu "đã gửi" nhầm.`);
    return false;
  }
  if ((await User.countDocuments({ role: role._id, isActive: true })) === 0) {
    console.warn(`[softwareLicenseAlerts] Role "${roleName}" chưa có user nào đang active — bỏ qua cảnh báo bản quyền để tránh đánh dấu "đã gửi" nhầm.`);
    return false;
  }
  return true;
};

export const checkSoftwareLicensesExpiringService = async () => {
  if (!(await hasValidRecipients(ALERT_RECIPIENT_ROLE))) {
    return { checked: 0, notified: 0 };
  }

  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + SOFTWARE_LICENSE_ALERT_DAYS_BEFORE);

  const licenses = await SoftwareLicense.find({
    isActive: true,
    expiresAt: { $lte: threshold },
    expiryAlertSentAt: null,
  });

  let notified = 0;
  for (const license of licenses) {
    const expiresAt = license.expiresAt!;
    const isAlreadyExpired = expiresAt < now;
    const label = [license.softwareName, license.edition, license.version].filter(Boolean).join(" ");

    await notifyUsersByRoleName(ALERT_RECIPIENT_ROLE, {
      type: NotificationType.SOFTWARE_LICENSE_EXPIRING,
      title: isAlreadyExpired ? "Bản quyền phần mềm đã hết hạn" : "Bản quyền phần mềm sắp hết hạn",
      message: isAlreadyExpired
        ? `Bản quyền "${label}" (${license.assets.length}/${license.totalSeats} máy) đã hết hạn từ ${expiresAt.toLocaleDateString("vi-VN")}.`
        : `Bản quyền "${label}" (${license.assets.length}/${license.totalSeats} máy) sẽ hết hạn vào ${expiresAt.toLocaleDateString("vi-VN")}.`,
      resourceType: NotificationResourceType.SOFTWARE_LICENSE,
      resourceId: license._id as any,
      priority: NotificationPriority.HIGH,
      sendEmail: true,
    });

    license.expiryAlertSentAt = now;
    await license.save();
    notified++;
  }

  return { checked: licenses.length, notified };
};

/** Dùng cho cron và API chạy tay. */
export const runSoftwareLicenseAlertsService = async () => {
  const expiring = await checkSoftwareLicensesExpiringService();
  return { expiring };
};
