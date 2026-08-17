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
import { IMedicalDeviceProfile, MedicalDeviceClass } from "../../interfaces/assets/medicalDevice.interface";


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
