// models/assets/calibrationRecord.model.ts
//
// GIAI ĐOẠN 2 — Quản lý Thiết bị Y tế: lịch sử các lần kiểm định/hiệu chuẩn,
// dùng làm bằng chứng khi thanh tra. Thiết kế đầy đủ ở
// module-quan-ly-thiet-bi-y-te.md §2.2, §4.

import { Schema, model, Types } from "mongoose";

export enum CalibrationResult {
  PASS = "PASS",
  FAIL = "FAIL",
  CONDITIONAL_PASS = "CONDITIONAL_PASS",
}

export interface ICalibrationRecord {
  deviceProfile: Types.ObjectId; // ref MedicalDeviceProfile

  calibratedAt: Date;
  // Tên đơn vị kiểm định BÊN NGOÀI hệ thống (VD: "Trung tâm Kiểm định Y tế
  // khu vực") — CỐ Ý dùng string tự do, KHÔNG ref User, vì đơn vị kiểm định
  // không phải tài khoản trong hệ thống.
  calibratedBy: string;
  result: CalibrationResult;
  // Link file giấy chứng nhận kiểm định (PDF scan). Giai đoạn 2 chỉ nhận
  // string (nhập tay dạng link/URL) — endpoint upload thật là Giai đoạn 5
  // (tuỳ chọn), dùng `uploadFiles` middleware sẵn có, không đổi field này.
  certificateFileUrl?: string;
  nextDueDate: Date; // hạn kiểm định lần kế tiếp — do đơn vị kiểm định xác định, KHÔNG tự suy ra từ calibrationIntervalMonths (kết quả FAIL/CONDITIONAL_PASS có thể rút ngắn hạn)

  // User HỆ THỐNG đã nhập bản ghi này — KHÁC `calibratedBy` (đơn vị kiểm
  // định thực hiện việc kiểm định, không phải người nhập liệu).
  recordedBy: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

const CalibrationRecordSchema = new Schema<ICalibrationRecord>(
  {
    deviceProfile: {
      type: Schema.Types.ObjectId,
      ref: "MedicalDeviceProfile",
      required: true,
    },

    calibratedAt: { type: Date, required: true },
    calibratedBy: { type: String, required: true, trim: true },
    result: {
      type: String,
      enum: Object.values(CalibrationResult),
      required: true,
    },
    certificateFileUrl: { type: String, trim: true },
    nextDueDate: { type: Date, required: true },

    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// Phục vụ GET lịch sử kiểm định theo thiết bị, mới nhất trước — đúng đề
// xuất ở module-quan-ly-thiet-bi-y-te.md §2.2. KHÔNG khai unique/index
// trùng lặp ở field-level — bài học đã rút ra từ các model khác trong
// codebase (Mongoose "Duplicate schema index" warning).
CalibrationRecordSchema.index({ deviceProfile: 1, calibratedAt: -1 });

export const CalibrationRecord = model<ICalibrationRecord>(
  "CalibrationRecord",
  CalibrationRecordSchema,
);
