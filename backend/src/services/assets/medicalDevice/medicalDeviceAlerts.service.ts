// services/assets/medicalDeviceAlerts.service.ts
//
// GIAI ĐOẠN 3 — module Quản lý Thiết bị Y tế: Notification cảnh báo sắp/đã
// quá hạn kiểm định.
//
// File này CỐ TÌNH mirror gần như 1:1 cấu trúc `assetAlerts.service.ts`
// (Giai đoạn 4 module Asset) — đúng chủ đích thiết kế đã chốt ở
// module-quan-ly-thiet-bi-y-te.md §3 ("tái dùng 100% pattern đã xây"), và
// đúng bài học rút kinh nghiệm ở §7.4 (áp dụng `hasValidRecipients` guard
// NGAY TỪ ĐẦU, không đợi phát hiện lỗi silent-failure qua thực tế như đã
// từng xảy ra với module Asset).

import { MedicalDeviceProfile } from "../../../models/assets/medicalDeviceProfile.model";
import {
  NotificationType,
  NotificationResourceType,
  NotificationPriority,
} from "../../../models/notifications/notification.model";
import { Role } from "../../../models/rbac/role.model";
import { User } from "../../../models/users/user.model";
import { notifyUsersByRoleName } from "../../notifications/notification.service";

/** Số ngày trước hạn kiểm định để bắt đầu cảnh báo — đúng §3 tài liệu thiết kế. */
const CALIBRATION_ALERT_DAYS_BEFORE = 30;

/**
 * Role nhận cảnh báo. ĐÃ CHỐT ở §9.3 tài liệu thiết kế: dùng lại role "IT"
 * hiện có, viết dạng constant để đổi sau này (nếu tách phòng ban Vật tư-
 * Trang thiết bị y tế riêng) chỉ mất 1 dòng, không phải sửa logic cron.
 */
const ALERT_RECIPIENT_ROLE = "IT";

/**
 * ⚠️ Kiểm tra có ÍT NHẤT 1 user hợp lệ để nhận cảnh báo hay không, TRƯỚC
 * KHI xử lý bất kỳ profile nào — mirror nguyên văn lý do đã giải thích ở
 * `assetAlerts.service.ts` (không lặp lại toàn bộ giải thích ở đây, xem
 * file đó): nếu không check trước, service vẫn sẽ set
 * `calibrationAlertSentAt = now` dù chưa từng gửi được cho ai, và cron sẽ
 * KHÔNG BAO GIỜ thử lại — silent failure nguy hiểm nhất.
 */
const hasValidRecipients = async (roleName: string): Promise<boolean> => {
  const role = await Role.findOne({ name: roleName }).select("_id");
  if (!role) {
    console.warn(
      `[medicalDeviceAlerts] Không tìm thấy role "${roleName}" trong DB — bỏ qua kiểm tra cảnh báo kiểm định để tránh đánh dấu "đã gửi" nhầm.`,
    );
    return false;
  }

  const recipientCount = await User.countDocuments({
    role: role._id,
    isActive: true,
  });

  if (recipientCount === 0) {
    console.warn(
      `[medicalDeviceAlerts] Role "${roleName}" chưa có user nào đang active — bỏ qua kiểm tra cảnh báo kiểm định để tránh đánh dấu "đã gửi" nhầm.`,
    );
    return false;
  }

  return true;
};

/**
 * 📌 CẢNH BÁO SẮP/ĐÃ QUÁ HẠN KIỂM ĐỊNH
 *
 * Đúng logic §3 tài liệu thiết kế: gửi ĐÚNG 1 LẦN cho mỗi profile khi bước
 * vào cửa sổ "còn ≤30 ngày tới hạn" (kể cả profile đã QUA hạn mà chưa từng
 * được cảnh báo — vẫn gửi, cùng nguyên tắc với cảnh báo bảo hành Asset:
 * "đã quá hạn" quan trọng hơn "sắp quá hạn"). Không gửi lặp lại mỗi ngày
 * cho cùng 1 profile — dùng `calibrationAlertSentAt` để đánh dấu đã gửi
 * (field này được reset về `undefined` mỗi khi ghi nhận 1 lần kiểm định
 * mới — xem `createCalibrationRecordService`, Giai đoạn 2).
 *
 * Chỉ quét profile có `requiresCalibration = true` — profile đánh dấu
 * không cần kiểm định theo lịch (VD Class A rủi ro thấp) thì không bao giờ
 * bị cron nhắc, kể cả khi vô tình có `nextCalibrationDueDate` trong quá
 * khứ do dữ liệu cũ.
 */
export const checkCalibrationDueService = async () => {
  if (!(await hasValidRecipients(ALERT_RECIPIENT_ROLE))) {
    return { checked: 0, notified: 0 };
  }

  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + CALIBRATION_ALERT_DAYS_BEFORE);

  const profiles = await MedicalDeviceProfile.find({
    requiresCalibration: true,
    nextCalibrationDueDate: { $lte: threshold },
    calibrationAlertSentAt: null,
  }).populate({
    path: "asset",
    select: "name assetCode department isActive",
    populate: { path: "department", select: "code name" },
  });

  let notified = 0;

  for (const profile of profiles) {
    const asset = profile.asset as any;

    // Asset có thể đã bị xoá mềm/DISPOSED SAU KHI profile được tạo — bỏ
    // qua, không cảnh báo cho thiết bị không còn hoạt động. Không đánh dấu
    // `calibrationAlertSentAt` trong trường hợp này (không phải "đã xử lý",
    // chỉ là "không còn liên quan" — để nếu asset được `restore` lại sau
    // này, cron vẫn xét lại bình thường ở lần chạy kế tiếp).
    if (!asset || asset.isActive === false) {
      continue;
    }

    const isAlreadyOverdue = profile.nextCalibrationDueDate! < now;
    const departmentName = asset.department?.name ?? "";

    await notifyUsersByRoleName(ALERT_RECIPIENT_ROLE, {
      type: NotificationType.MEDICAL_DEVICE_CALIBRATION_DUE,
      title: isAlreadyOverdue
        ? "Thiết bị y tế đã quá hạn kiểm định"
        : "Thiết bị y tế sắp tới hạn kiểm định",
      message: isAlreadyOverdue
        ? `Thiết bị "${asset.name}" (${asset.assetCode}, ${departmentName}) đã quá hạn kiểm định từ ${profile.nextCalibrationDueDate!.toLocaleDateString("vi-VN")}.`
        : `Thiết bị "${asset.name}" (${asset.assetCode}, ${departmentName}) sẽ tới hạn kiểm định vào ${profile.nextCalibrationDueDate!.toLocaleDateString("vi-VN")}.`,
      // Dùng chung resourceType ASSET (trỏ tới asset, không phải profile) —
      // MedicalDeviceProfile không có màn hình chi tiết riêng ở FE, mọi
      // thao tác đều thực hiện qua màn hình chi tiết Asset (đúng API design
      // §5: mọi endpoint đều theo :assetId).
      resourceType: NotificationResourceType.ASSET,
      resourceId: asset._id,
      priority: NotificationPriority.HIGH,
      sendEmail: true,
    });

    profile.calibrationAlertSentAt = now;
    await profile.save();
    notified++;
  }

  return { checked: profiles.length, notified };
};

/**
 * 📌 CHẠY CẢNH BÁO — dùng cho cron job và cho API trigger tay
 * (`POST /api/medical-devices/alerts/run`).
 *
 * Đặt tên `run...Service` (không phải gọi thẳng `checkCalibrationDueService`
 * ở nơi dùng) để khớp naming convention với `runAssetAlertsService` — và để
 * dễ mở rộng thêm loại cảnh báo khác cho module này sau này (VD cảnh báo
 * hết hạn giấy phép lưu hành — `licenseExpiredAt` — nếu có nhu cầu) mà
 * không phải đổi chữ ký hàm ở cron/controller.
 */
export const runMedicalDeviceAlertsService = async () => {
  const calibration = await checkCalibrationDueService();
  return { calibration };
};
