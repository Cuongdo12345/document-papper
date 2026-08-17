// models/assets/calibrationRecord.model.ts
//
// GIAI ĐOẠN 2 — Quản lý Thiết bị Y tế: lịch sử các lần kiểm định/hiệu chuẩn,
// dùng làm bằng chứng khi thanh tra. Thiết kế đầy đủ ở
// module-quan-ly-thiet-bi-y-te.md §2.2, §4.

import { Schema, model, Types } from "mongoose";
import { ICalibrationRecord, CalibrationResult } from "../../interfaces/assets/calibrationRecord.interface";


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
