// interfaces/assets/operatorCertificate.interface.ts
//
// MODULE MỚI (DEV-077) — Theo dõi chứng chỉ vận hành thiết bị y tế. Quyết
// định nghiệp vụ đã xác nhận với user qua AskUserQuestion (2026-09-24):
// (1) gắn với 1 User cụ thể trong hệ thống (KHÔNG phải text tự do như
//     `calibratedBy` ở CalibrationRecord);
// (2) phạm vi theo AssetCategory (loại thiết bị, VD "Máy chạy thận"), KHÔNG
//     theo từng Asset cụ thể — 1 chứng chỉ áp dụng cho MỌI thiết bị cùng
//     danh mục;
// (3) cảnh báo sắp hết hạn gửi CẢ role "IT" (ALERT_RECIPIENT_ROLE, cùng
//     `medicalDeviceAlerts.service.ts`) LẪN chính người có chứng chỉ;
// (4) CHẶN gán/chuyển giao thiết bị (`assignAssetService`/`transferAssetService`,
//     xem `assertOperatorCertifiedIfRequired` ở `operatorCertificate.service.ts`)
//     cho user KHÔNG có chứng chỉ hợp lệ, CHỈ khi thiết bị đó có
//     `MedicalDeviceProfile.operatorCertificateRequired = true`.
//
// Thiết kế gốc APPEND-ONLY (giống CalibrationRecord) — mỗi lần cấp/gia hạn
// chứng chỉ là 1 bản ghi MỚI. "Chứng chỉ hợp lệ hiện tại" của 1 user cho 1
// danh mục = tồn tại ÍT NHẤT 1 bản ghi có `expiresAt > now` VÀ `isActive`.
//
// [CẬP NHẬT DEV-078, 2026-09-24] User yêu cầu bổ sung sửa/xoá/thu hồi — đã
// xác nhận qua AskUserQuestion trước khi code, KHÔNG phá vỡ nguyên tắc
// append-only gốc (ngày cấp/hạn của 1 bản ghi ĐÃ TẠO không đổi được nữa —
// muốn đổi ngày phải thu hồi bản cũ + cấp bản ghi MỚI):
// (1) "Sửa" — CHỈ cho sửa `certificateNumber` (lỗi chính tả số chứng chỉ).
// (2) "Thu hồi" — cho chứng chỉ TỪNG hợp lệ nhưng bị rút giữa chừng (cơ quan
//     cấp rút/vi phạm...) — BẮT BUỘC lý do, tách riêng khỏi "Xoá".
// (3) "Xoá" — CHỈ dùng khi nhập nhầm hoàn toàn (data-entry mistake) — xoá
//     MỀM (giữ bản ghi để tra soát/thanh tra), KHÔNG bắt buộc lý do.
// Cả 2 hành động (2)/(3) đều set `isActive=false` (loại khỏi mọi truy vấn
// "đang hợp lệ") nhưng dùng field riêng để phân biệt LÝ DO xảy ra — quan
// trọng cho mục đích tuân thủ/thanh tra sau này (khác nhau về ý nghĩa pháp
// lý: 1 cái là chứng chỉ thật bị rút, 1 cái là chưa từng có giá trị).

import { Types } from "mongoose";

export interface IOperatorCertificate {
  user: Types.ObjectId; // ref User — người được cấp chứng chỉ
  deviceCategory: Types.ObjectId; // ref AssetCategory — loại thiết bị được phép vận hành
  certificateNumber?: string; // số chứng chỉ (nếu có) — field DUY NHẤT sửa được sau khi tạo
  issuedAt: Date;
  expiresAt: Date;

  /**
   * Chặn gửi trùng cảnh báo sắp hết hạn — cùng vai trò
   * `calibrationAlertSentAt`/`licenseAlertSentAt` (MedicalDeviceProfile).
   * KHÔNG có logic reset (không có endpoint sửa `expiresAt` của bản ghi cũ —
   * gia hạn = tạo bản ghi MỚI, tự nhiên có `alertSentAt` rỗng).
   */
  alertSentAt?: Date;

  recordedBy?: Types.ObjectId; // ref User — ai đã cấp/nhập bản ghi này (thường IT/Vật tư-TTB)

  /**
   * `false` = bản ghi KHÔNG còn được tính vào "đang hợp lệ" (dù `expiresAt`
   * chưa tới), do bị thu hồi HOẶC xoá mềm — xem `revokedAt`/`deletedAt` để
   * biết chính xác lý do nào. Default `true` (đa số bản ghi chỉ hết hiệu lực
   * tự nhiên qua `expiresAt`, không qua field này).
   */
  isActive?: boolean;

  /** [MỚI DEV-078] Thu hồi — chứng chỉ THẬT SỰ hợp lệ lúc cấp, bị rút giữa chừng. Luôn đi kèm lý do. */
  revokedAt?: Date;
  revokedBy?: Types.ObjectId;
  revokedReason?: string;

  /** [MỚI DEV-078] Xoá mềm — CHỈ dùng cho lỗi nhập liệu, không bắt buộc lý do. */
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}
