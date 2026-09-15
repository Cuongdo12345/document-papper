// services/inventory/consumableAlerts.service.ts
//
// Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15) — cảnh báo tồn kho thấp,
// mirror ĐÚNG pattern `assetAlerts.service.ts` (guard `hasValidRecipients`
// trước khi xử lý, gửi 1 lần dùng cờ `lowStockAlertSentAt`, cron hằng ngày +
// API trigger tay).
//
// Người nhận: role "PHONG_VAT_TU_TTB" (đã sở hữu `CONSUMABLE_TRANSACTION_CREATE`
// — người trực tiếp xử lý nhập kho) là kênh CHÍNH, quyết định việc đánh dấu
// "đã gửi". Ngoài ra broadcast THÊM (best-effort, KHÔNG gate việc đánh dấu
// đã gửi) cho user của đúng phòng ban sở hữu vật tư đó — để người trong khoa
// cũng biết, đúng gợi ý từ pattern `notifyUsersByDepartment` đã dùng cho
// `DOCUMENT_SUBMITTED`.

import { ConsumableItem } from "../../models/inventory/consumableItem.model";
import {
  NotificationType,
  NotificationResourceType,
  NotificationPriority,
} from "../../models/notifications/notification.model";
import { Role } from "../../models/rbac/role.model";
import { User } from "../../models/users/user.model";
import {
  notifyUsersByRoleName,
  notifyUsersByDepartment,
} from "../notifications/notification.service";

const ALERT_RECIPIENT_ROLE = "PHONG_VAT_TU_TTB";

/** Xem giải thích đầy đủ lý do bắt buộc guard này ở `assetAlerts.service.ts`. */
const hasValidRecipients = async (roleName: string): Promise<boolean> => {
  const role = await Role.findOne({ name: roleName }).select("_id");
  if (!role) {
    console.warn(
      `[consumableAlerts] Không tìm thấy role "${roleName}" trong DB — bỏ qua kiểm tra cảnh báo tồn kho để tránh đánh dấu "đã gửi" nhầm.`,
    );
    return false;
  }

  const recipientCount = await User.countDocuments({ role: role._id, isActive: true });
  if (recipientCount === 0) {
    console.warn(
      `[consumableAlerts] Role "${roleName}" chưa có user nào đang active — bỏ qua kiểm tra cảnh báo tồn kho để tránh đánh dấu "đã gửi" nhầm.`,
    );
    return false;
  }

  return true;
};

/**
 * 📌 CẢNH BÁO TỒN KHO THẤP
 *
 * Gửi ĐÚNG 1 LẦN cho mỗi vật tư khi `quantityOnHand` xuống ≤
 * `minStockThreshold`, không lặp lại mỗi ngày trong khi đang chờ nhập hàng
 * (dùng `lowStockAlertSentAt`, reset về null khi nhập kho vượt lại ngưỡng —
 * xem `consumableItem.service.ts`).
 */
export const checkLowStockService = async () => {
  if (!(await hasValidRecipients(ALERT_RECIPIENT_ROLE))) {
    return { checked: 0, notified: 0 };
  }

  const items = await ConsumableItem.find({
    isActive: true,
    lowStockAlertSentAt: null,
    $expr: { $lte: ["$quantityOnHand", "$minStockThreshold"] },
  }).populate("department", "code name");

  let notified = 0;

  for (const item of items) {
    const departmentName = (item.department as any)?.name ?? "";

    await notifyUsersByRoleName(ALERT_RECIPIENT_ROLE, {
      type: NotificationType.CONSUMABLE_LOW_STOCK,
      title: "Vật tư sắp hết hàng",
      message: `Vật tư "${item.name}" (${departmentName}) chỉ còn ${item.quantityOnHand} ${item.unit}, đã xuống dưới/bằng ngưỡng cảnh báo ${item.minStockThreshold} ${item.unit} — cần bổ sung.`,
      resourceType: NotificationResourceType.CONSUMABLE_ITEM,
      resourceId: item._id as any,
      priority: NotificationPriority.HIGH,
      sendEmail: true,
    });

    // Best-effort, KHÔNG gate việc đánh dấu "đã gửi" — chỉ để người trong
    // khoa biết thêm, kênh PHONG_VAT_TU_TTB ở trên mới là nguồn đảm bảo.
    // `item.department` đã được `.populate()` thành document — lấy `._id`
    // tường minh thay vì truyền thẳng document (tránh `String(doc)` sai ở
    // `toOptionalObjectId`).
    await notifyUsersByDepartment((item.department as any)._id, {
      type: NotificationType.CONSUMABLE_LOW_STOCK,
      title: "Vật tư sắp hết hàng",
      message: `Vật tư "${item.name}" của khoa/phòng bạn chỉ còn ${item.quantityOnHand} ${item.unit} — đã báo phòng Vật tư-TTB bổ sung.`,
      resourceType: NotificationResourceType.CONSUMABLE_ITEM,
      resourceId: item._id as any,
      priority: NotificationPriority.NORMAL,
    });

    item.lowStockAlertSentAt = new Date();
    await item.save();
    notified++;
  }

  return { checked: items.length, notified };
};

/** 📌 CHẠY CẢNH BÁO — dùng cho cron job và cho API trigger tay. */
export const runConsumableAlertsService = async () => {
  const lowStock = await checkLowStockService();
  return { lowStock };
};
