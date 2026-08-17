// models/assets/medicalDeviceProfile.types.ts
//
// Interface + enum tách riêng khỏi schema/model (medicalDeviceProfile.model.ts),
// để dùng lại được ở DTO/service/controller mà không phải import cả Mongoose Schema.

import { Types } from "mongoose";

/**
 * ⚠️ Phân loại theo Nghị định 98/2021/NĐ-CP về quản lý trang thiết bị y tế
 * — số hiệu/nội dung nghị định lấy từ kiến thức chung, CHƯA được search
 * xác minh lại. BẮT BUỘC nhờ người có chuyên môn pháp lý/phòng vật tư y tế
 * xác nhận lại số hiệu văn bản và đúng tiêu chí phân loại A/B/C/D trước
 * khi dùng làm căn cứ tuân thủ pháp lý thật.
 */
export enum MedicalDeviceClass {
  A = "A", // rủi ro thấp
  B = "B", // rủi ro thấp-trung bình
  C = "C", // rủi ro trung bình-cao
  D = "D", // rủi ro cao
}

export interface IMedicalDeviceProfile {
  asset: Types.ObjectId; // ref Asset, UNIQUE — quan hệ 1-1

  deviceClass: MedicalDeviceClass;
  registrationNumber?: string; // số đăng ký lưu hành (Bộ Y tế cấp)
  licenseExpiredAt?: Date; // hạn giấy phép lưu hành (nếu có)

  /**
   * KHÁC HẲN "bảo trì" ở Asset (Giai đoạn 3 module Asset) — kiểm định BẮT
   * BUỘC THEO LỊCH dù thiết bị không hỏng, do luật định (khác corrective
   * maintenance chỉ xảy ra khi có sự cố).
   */
  requiresCalibration: boolean;
  calibrationIntervalMonths?: number; // chu kỳ kiểm định (VD 12 tháng/lần)
  lastCalibrationDate?: Date;
  nextCalibrationDueDate?: Date; // = lastCalibrationDate + calibrationIntervalMonths

  /**
   * Chặn gửi trùng cảnh báo — giống hệt `warrantyAlertSentAt` ở Asset
   * (Giai đoạn 4). CHỈ set qua service ghi nhận kiểm định (Giai đoạn 2) và
   * cron cảnh báo (Giai đoạn 3) — KHÔNG expose qua UpdateProfileDTO.
   */
  calibrationAlertSentAt?: Date;

  operatorCertificateRequired: boolean; // cần người vận hành có chứng chỉ riêng (VD máy chạy thận)

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}