// models/assets/medicalDeviceProfile.model.ts
//
// MODULE MỚI — Quản lý Thiết bị Y tế, Giai đoạn 1.
//
// MỞ RỘNG ĐỒNG HÀNH với `Asset` đã có (KHÔNG tách collection riêng biệt
// cho "thiết bị y tế") — quyết định thiết kế đã phân tích kỹ trong tài
// liệu `.md` đi kèm. Model này CHỈ chứa lớp thông tin tuân thủ pháp lý
// (phân loại, kiểm định) — mọi thứ khác (CRUD, assign/transfer/return,
// PROPOSE_REPAIR, Excel, QR code...) dùng NGUYÊN VẸN API của `Asset`,
// không xây lại.

import { Schema, model, Types } from "mongoose";

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

const MedicalDeviceProfileSchema = new Schema<IMedicalDeviceProfile>(
  {
    asset: {
      type: Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },

    deviceClass: {
      type: String,
      enum: Object.values(MedicalDeviceClass),
      required: true,
    },

    registrationNumber: { type: String, trim: true },
    licenseExpiredAt: { type: Date },

    requiresCalibration: { type: Boolean, default: false },
    calibrationIntervalMonths: { type: Number, min: 1 },
    lastCalibrationDate: { type: Date },
    nextCalibrationDueDate: { type: Date },
    calibrationAlertSentAt: { type: Date },

    operatorCertificateRequired: { type: Boolean, default: false },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

MedicalDeviceProfileSchema.index({ asset: 1 }, { unique: true });
// Phục vụ cron cảnh báo kiểm định (Giai đoạn 3) — quét đúng field cần thiết.
MedicalDeviceProfileSchema.index({
  requiresCalibration: 1,
  nextCalibrationDueDate: 1,
});

export const MedicalDeviceProfile = model<IMedicalDeviceProfile>(
  "MedicalDeviceProfile",
  MedicalDeviceProfileSchema,
);
