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
import { OperatorCertificate } from "../../../models/assets/operatorCertificate.model";
import {
  NotificationType,
  NotificationResourceType,
  NotificationPriority,
} from "../../../models/notifications/notification.model";
import { Role } from "../../../models/rbac/role.model";
import { User } from "../../../models/users/user.model";
import {
  notifyUsersByRoleName,
  createNotification,
} from "../../notifications/notification.service";

/** Số ngày trước hạn kiểm định để bắt đầu cảnh báo — đúng §3 tài liệu thiết kế. */
const CALIBRATION_ALERT_DAYS_BEFORE = 30;

/**
 * [MỚI] Số ngày trước hạn giấy phép lưu hành để bắt đầu cảnh báo — tách
 * constant RIÊNG (không dùng chung `CALIBRATION_ALERT_DAYS_BEFORE`) dù cùng
 * giá trị 30 hiện tại, để có thể tinh chỉnh độc lập sau này mà không ảnh
 * hưởng cảnh báo kiểm định (2 loại hạn khác bản chất pháp lý).
 */
const LICENSE_ALERT_DAYS_BEFORE = 30;

/**
 * [MỚI, DEV-077] Số ngày trước hạn chứng chỉ vận hành để bắt đầu cảnh báo —
 * tách constant riêng, cùng lý do `LICENSE_ALERT_DAYS_BEFORE`.
 */
const OPERATOR_CERTIFICATE_ALERT_DAYS_BEFORE = 30;

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
 * 📌 CẢNH BÁO SẮP/ĐÃ HẾT HẠN GIẤY PHÉP LƯU HÀNH
 *
 * [MỚI] Đóng gap đã ghi nhận: `licenseExpiredAt` được lưu trên profile
 * nhưng trước đây KHÔNG có cron nào theo dõi. Mirror ĐÚNG logic
 * `checkCalibrationDueService` ở trên (gửi 1 lần khi còn ≤30 ngày, kể cả đã
 * quá hạn; dùng `licenseAlertSentAt` chống gửi trùng) — chỉ khác điều kiện
 * quét: KHÔNG có cờ `requiresCalibration`-tương-đương, chỉ cần
 * `licenseExpiredAt` có giá trị (không phải mọi thiết bị đều có giấy phép
 * lưu hành cần theo dõi — field này optional ở model).
 */
export const checkLicenseExpiringService = async () => {
  if (!(await hasValidRecipients(ALERT_RECIPIENT_ROLE))) {
    return { checked: 0, notified: 0 };
  }

  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + LICENSE_ALERT_DAYS_BEFORE);

  const profiles = await MedicalDeviceProfile.find({
    licenseExpiredAt: { $ne: null, $lte: threshold },
    licenseAlertSentAt: null,
  }).populate({
    path: "asset",
    select: "name assetCode department isActive",
    populate: { path: "department", select: "code name" },
  });

  let notified = 0;

  for (const profile of profiles) {
    const asset = profile.asset as any;

    // Cùng lý do bỏ qua asset inactive như `checkCalibrationDueService` —
    // KHÔNG đánh dấu `licenseAlertSentAt` (không phải "đã xử lý", chỉ là
    // "không còn liên quan"), để cron xét lại nếu asset được restore.
    if (!asset || asset.isActive === false) {
      continue;
    }

    const isAlreadyExpired = profile.licenseExpiredAt! < now;
    const departmentName = asset.department?.name ?? "";

    await notifyUsersByRoleName(ALERT_RECIPIENT_ROLE, {
      type: NotificationType.MEDICAL_DEVICE_LICENSE_EXPIRING,
      title: isAlreadyExpired
        ? "Thiết bị y tế đã hết hạn giấy phép lưu hành"
        : "Thiết bị y tế sắp hết hạn giấy phép lưu hành",
      message: isAlreadyExpired
        ? `Thiết bị "${asset.name}" (${asset.assetCode}, ${departmentName}) đã hết hạn giấy phép lưu hành từ ${profile.licenseExpiredAt!.toLocaleDateString("vi-VN")}.`
        : `Thiết bị "${asset.name}" (${asset.assetCode}, ${departmentName}) sẽ hết hạn giấy phép lưu hành vào ${profile.licenseExpiredAt!.toLocaleDateString("vi-VN")}.`,
      resourceType: NotificationResourceType.ASSET,
      resourceId: asset._id,
      priority: NotificationPriority.HIGH,
      sendEmail: true,
    });

    profile.licenseAlertSentAt = now;
    await profile.save();
    notified++;
  }

  return { checked: profiles.length, notified };
};

/**
 * 📌 CẢNH BÁO SẮP/ĐÃ HẾT HẠN CHỨNG CHỈ VẬN HÀNH (DEV-077)
 *
 * KHÁC 2 hàm trên: gửi CẢ role "IT" (`notifyUsersByRoleName`, giữ đúng kênh
 * hiện có) LẪN chính người có chứng chỉ (`createNotification` trực tiếp
 * theo `cert.user._id`) — quyết định đã xác nhận với user qua
 * AskUserQuestion ("Cả IT/Vật tư-TTB VÀ chính người có chứng chỉ"). Bỏ qua
 * (không gửi, không đánh dấu) nếu user liên kết đã bị vô hiệu hoá — cùng lý
 * do bỏ qua asset inactive ở 2 hàm trên.
 */
export const checkOperatorCertificateExpiringService = async () => {
  if (!(await hasValidRecipients(ALERT_RECIPIENT_ROLE))) {
    return { checked: 0, notified: 0 };
  }

  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + OPERATOR_CERTIFICATE_ALERT_DAYS_BEFORE);

  const certificates = await OperatorCertificate.find({
    expiresAt: { $lte: threshold },
    alertSentAt: null,
    isActive: true, // [MỚI DEV-078] bỏ qua bản ghi đã bị thu hồi/xoá — không còn liên quan để cảnh báo
  }).populate([
    { path: "user", select: "username fullName isActive" },
    { path: "deviceCategory", select: "name" },
  ]);

  let notified = 0;

  for (const cert of certificates) {
    const user = cert.user as any;
    const category = cert.deviceCategory as any;

    // Cùng lý do bỏ qua asset inactive ở checkCalibrationDueService/
    // checkLicenseExpiringService — KHÔNG đánh dấu `alertSentAt` (không
    // phải "đã xử lý", chỉ là "không còn liên quan").
    if (!user || user.isActive === false || !category) {
      continue;
    }

    const isAlreadyExpired = cert.expiresAt < now;
    const categoryName = category.name ?? "";

    const title = isAlreadyExpired
      ? "Chứng chỉ vận hành đã hết hạn"
      : "Chứng chỉ vận hành sắp hết hạn";
    const message = isAlreadyExpired
      ? `Chứng chỉ vận hành thiết bị "${categoryName}" của ${user.fullName} (${user.username}) đã hết hạn từ ${cert.expiresAt.toLocaleDateString("vi-VN")}.`
      : `Chứng chỉ vận hành thiết bị "${categoryName}" của ${user.fullName} (${user.username}) sẽ hết hạn vào ${cert.expiresAt.toLocaleDateString("vi-VN")}.`;

    await Promise.allSettled([
      notifyUsersByRoleName(ALERT_RECIPIENT_ROLE, {
        type: NotificationType.OPERATOR_CERTIFICATE_EXPIRING,
        title,
        message,
        priority: NotificationPriority.HIGH,
        sendEmail: true,
      }),
      createNotification({
        recipient: user._id,
        type: NotificationType.OPERATOR_CERTIFICATE_EXPIRING,
        title,
        message: isAlreadyExpired
          ? `Chứng chỉ vận hành thiết bị "${categoryName}" của bạn đã hết hạn từ ${cert.expiresAt.toLocaleDateString("vi-VN")} — liên hệ IT/Vật tư-TTB để được cấp lại.`
          : `Chứng chỉ vận hành thiết bị "${categoryName}" của bạn sẽ hết hạn vào ${cert.expiresAt.toLocaleDateString("vi-VN")} — liên hệ IT/Vật tư-TTB để được gia hạn.`,
        priority: NotificationPriority.HIGH,
        sendEmail: true,
      }),
    ]);

    cert.alertSentAt = now;
    await cert.save();
    notified++;
  }

  return { checked: certificates.length, notified };
};

/**
 * 📌 CHẠY CẢNH BÁO — dùng cho cron job và cho API trigger tay
 * (`POST /api/medical-devices/alerts/run`).
 *
 * Đặt tên `run...Service` (không phải gọi thẳng `checkCalibrationDueService`
 * ở nơi dùng) để khớp naming convention với `runAssetAlertsService`. [CẬP
 * NHẬT DEV-077] Nay chạy SONG SONG cả 3 loại cảnh báo (`Promise.all`, cùng
 * pattern `runAssetAlertsService`) — kiểm định, giấy phép lưu hành, và
 * chứng chỉ vận hành là 3 việc độc lập, không phụ thuộc nhau.
 */
export const runMedicalDeviceAlertsService = async () => {
  const [calibration, license, operatorCertificate] = await Promise.all([
    checkCalibrationDueService(),
    checkLicenseExpiringService(),
    checkOperatorCertificateExpiringService(),
  ]);
  return { calibration, license, operatorCertificate };
};
