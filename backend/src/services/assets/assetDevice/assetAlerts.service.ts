// services/assets/assetAlerts.service.ts
//
// GIAI ĐOẠN 4 — Notification cảnh báo bảo hành/bảo trì.
//
// 2 hàm ở đây được gọi từ cron job hằng ngày (`shared/cron/assetAlerts.cron.ts`)
// và cũng expose qua 1 API trigger tay để test/chạy thủ công (xem
// `assetModule.routes.ts` — POST /api/it-assets|medical-assets/alerts/run).
//
// CHỦ Ý tách 2 hàm riêng biệt (không gộp 1 hàm "checkAll") — vì 2 loại cảnh
// báo có ngữ nghĩa gửi lặp lại KHÁC NHAU (xem giải thích ở từng hàm), gộp
// chung dễ nhầm lẫn khi đọc lại sau này.

import { Asset, AssetStatus } from "../../../models/assets/asset.model";
import { AssetType } from "../../../interfaces/assets/asset.interface";
import {
  NotificationType,
  NotificationResourceType,
  NotificationPriority,
} from "../../../models/notifications/notification.model";
import { notifyUsersByRoleNames } from "../../notifications/notification.service";
import { ALERT_RECIPIENT_ROLES, hasValidAlertRecipients } from "../assetAlertRecipients";

/** Số ngày trước hạn bảo hành để bắt đầu cảnh báo — chỉnh ở đây nếu cần đổi. */
const WARRANTY_ALERT_DAYS_BEFORE = 30;

/** Số ngày bảo trì tối đa trước khi coi là "quá hạn" — chỉnh ở đây nếu cần đổi. */
const MAINTENANCE_OVERDUE_DAYS = 7;

/**
 * Người nhận cảnh báo theo LOẠI tài sản (tách module Tài sản, GĐ 6 — xem `assetAlertRecipients.ts`):
 * thiết bị CNTT gửi IT; thiết bị y tế gửi Phòng Vật tư-TTB và IT (mỗi user nhận 1 lần).
 *
 * ⚠️ Kiểm tra có người nhận hợp lệ TRƯỚC khi xử lý bất kỳ tài sản nào (lý do ở `hasValidAlertRecipients`: service
 * gửi nuốt lỗi, thiếu người nhận mà vẫn đánh dấu "đã gửi" thì cron không bao giờ gửi lại). Kiểm theo TỪNG loại:
 * loại không có người nhận bị bỏ qua, loại còn lại vẫn chạy bình thường.
 */
const getDeliverableAssetTypes = async (assetType?: AssetType): Promise<AssetType[]> => {
  const candidates = assetType ? [assetType] : [AssetType.IT, AssetType.MEDICAL];
  const deliverable: AssetType[] = [];
  for (const type of candidates) {
    if (await hasValidAlertRecipients(ALERT_RECIPIENT_ROLES[type], "assetAlerts")) deliverable.push(type);
  }
  return deliverable;
};

/**
 * 📌 CẢNH BÁO SẮP HẾT HẠN BẢO HÀNH
 *
 * Gửi ĐÚNG 1 LẦN cho mỗi asset khi bước vào cửa sổ "còn ≤30 ngày tới hạn"
 * (kể cả asset đã QUA hạn mà chưa từng được cảnh báo — vẫn gửi, vì thông
 * tin "đã hết hạn bảo hành" còn quan trọng hơn "sắp hết hạn"). Không gửi
 * lặp lại mỗi ngày cho cùng 1 asset — dùng `warrantyAlertSentAt` để đánh
 * dấu đã gửi (xem field này reset về `null` khi `warrantyExpiredAt` đổi
 * sang ngày mới, ở `updateAssetService`).
 *
 * Đây là "cảnh báo 1 lần cho biết trước" — khác hẳn cảnh báo bảo trì quá
 * hạn bên dưới (nhắc LẶP LẠI mỗi ngày cho tới khi xử lý xong).
 */
export const checkWarrantyExpiringService = async (assetType?: AssetType) => {
  const types = await getDeliverableAssetTypes(assetType);
  if (types.length === 0) {
    return { checked: 0, notified: 0 };
  }

  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + WARRANTY_ALERT_DAYS_BEFORE);

  const assets = await Asset.find({
    isActive: true,
    warrantyExpiredAt: { $lte: threshold },
    warrantyAlertSentAt: null,
    status: { $nin: [AssetStatus.DISPOSED, AssetStatus.LOST] }, // đã thanh lý/mất thì không cần lo bảo hành nữa
    assetType: { $in: types }, // DEV-115: chạy tay theo module chỉ quét loại đó; GĐ 6: chỉ loại có người nhận
  }).populate("department", "code name");

  let notified = 0;

  for (const asset of assets) {
    const isAlreadyExpired = asset.warrantyExpiredAt! < now;
    const departmentName = (asset.department as any)?.name ?? "";

    await notifyUsersByRoleNames(ALERT_RECIPIENT_ROLES[asset.assetType], {
      type: NotificationType.ASSET_WARRANTY_EXPIRING,
      title: isAlreadyExpired
        ? "Tài sản đã hết hạn bảo hành"
        : "Tài sản sắp hết hạn bảo hành",
      message: isAlreadyExpired
        ? `Tài sản "${asset.name}" (${asset.assetCode}, ${departmentName}) đã hết hạn bảo hành từ ${asset.warrantyExpiredAt!.toLocaleDateString("vi-VN")}.`
        : `Tài sản "${asset.name}" (${asset.assetCode}, ${departmentName}) sẽ hết hạn bảo hành vào ${asset.warrantyExpiredAt!.toLocaleDateString("vi-VN")}.`,
      resourceType: NotificationResourceType.ASSET,
      resourceId: asset._id as any,
      priority: NotificationPriority.HIGH,
      sendEmail: true,
    });
    asset.warrantyAlertSentAt = now;
    await asset.save();
    notified++;
  }

  return { checked: assets.length, notified };
};

/**
 * 📌 CẢNH BÁO BẢO TRÌ QUÁ HẠN
 *
 * Gửi LẶP LẠI MỖI NGÀY cho asset đang `UNDER_MAINTENANCE` quá
 * `MAINTENANCE_OVERDUE_DAYS` ngày, KHÔNG có cờ đánh dấu "đã gửi" như cảnh
 * báo bảo hành — vì đây là 1 vấn đề ĐANG CÒN TỒN TẠI (thiết bị vẫn chưa
 * được sửa xong), cần tiếp tục nhắc cho tới khi có `CONFIRM_STATUS`
 * duyệt xong (`resolveAssetMaintenanceService` xoá `maintenanceStartedAt`,
 * asset không còn khớp filter `status: UNDER_MAINTENANCE` nữa, cảnh báo
 * tự động dừng — không cần thêm field cờ nào để "tắt" cảnh báo này).
 */
export const checkMaintenanceOverdueService = async (assetType?: AssetType) => {
  const types = await getDeliverableAssetTypes(assetType);
  if (types.length === 0) {
    return { checked: 0, notified: 0 };
  }

  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - MAINTENANCE_OVERDUE_DAYS);

  const assets = await Asset.find({
    isActive: true,
    status: AssetStatus.UNDER_MAINTENANCE,
    maintenanceStartedAt: { $lte: threshold },
    assetType: { $in: types },
  }).populate("department", "code name");

  for (const asset of assets) {
    const daysInMaintenance = Math.floor(
      (now.getTime() - asset.maintenanceStartedAt!.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const departmentName = (asset.department as any)?.name ?? "";

    await notifyUsersByRoleNames(ALERT_RECIPIENT_ROLES[asset.assetType], {
      type: NotificationType.ASSET_MAINTENANCE_OVERDUE,
      title: "Tài sản bảo trì quá hạn",
      message: `Tài sản "${asset.name}" (${asset.assetCode}, ${departmentName}) đã bảo trì ${daysInMaintenance} ngày, vượt quá ${MAINTENANCE_OVERDUE_DAYS} ngày cho phép — cần kiểm tra tiến độ sửa chữa.`,
      resourceType: NotificationResourceType.ASSET,
      resourceId: asset._id as any,
      priority: NotificationPriority.HIGH,
      sendEmail: true,
    });
  }

  return { checked: assets.length, notified: assets.length };
};

/**
 * 📌 CHẠY CẢ 2 CẢNH BÁO — dùng cho cron job và cho API trigger tay.
 */
export const runAssetAlertsService = async (assetType?: AssetType) => {
  const [warranty, maintenance] = await Promise.all([
    checkWarrantyExpiringService(assetType),
    checkMaintenanceOverdueService(assetType),
  ]);

  return { warranty, maintenance };
};