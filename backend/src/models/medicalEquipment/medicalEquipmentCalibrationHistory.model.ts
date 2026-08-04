import { Schema, model, models, Types, Document as MongooseDocument } from "mongoose";
import { MEDICAL_EQUIPMENT_INSPECTION_RESULT, MedicalEquipmentInspectionResult } from "./medicalEquipment.model";

/**
 * MedicalEquipmentCalibrationHistory
 *
 * Append-only — copy pattern AssetAssignmentHistory (05_DATABASE.md).
 * Ghi nhận mỗi lần hiệu chuẩn (CALIBRATION) hoặc kiểm định an toàn (INSPECTION).
 *
 * QUAN TRỌNG — invariant PHẢI enforce ở tầng service khi implement (schema không
 * tự enforce): khi tạo bản ghi với result = FAIL hoặc CONDITIONAL, PHẢI đồng thời
 * (cùng transaction) cập nhật MedicalEquipment.status -> QUARANTINED
 * (D-MED-005, 18_MEDICAL_EQUIPMENT_DESIGN.md §3, §4.2).
 *
 * CẢNH BÁO — certificateFileUrl: KHÔNG kết nối với endpoint Upload hiện tại
 * (/api/upload) cho tới khi SEC/P0-01 (khóa upload) được xử lý — xem
 * 18_MEDICAL_EQUIPMENT_DESIGN.md §8. Field vẫn tồn tại trong schema (optional),
 * có thể để trống hoặc lưu URL thủ công tạm thời.
 *
 * Nguồn thiết kế: 18_MEDICAL_EQUIPMENT_DESIGN.md §2.4
 */

export const MEDICAL_EQUIPMENT_HISTORY_TYPE = ["CALIBRATION", "INSPECTION"] as const;
export type MedicalEquipmentHistoryType = (typeof MEDICAL_EQUIPMENT_HISTORY_TYPE)[number];

export interface IMedicalEquipmentCalibrationHistory extends MongooseDocument {
  equipment: Types.ObjectId;
  type: MedicalEquipmentHistoryType;
  performedAt: Date;

  // Nếu thực hiện nội bộ -> performedBy có giá trị.
  // Nếu thực hiện bởi đơn vị bên ngoài -> để performedBy null, dùng vendorName.
  performedBy?: Types.ObjectId | null;
  vendorName?: string | null;

  result: MedicalEquipmentInspectionResult;
  nextDueAt?: Date | null;

  // XEM CẢNH BÁO §8 trong design doc — chưa gắn Upload hiện tại
  certificateFileUrl?: string | null;

  note?: string | null;

  createdAt: Date;
}

const medicalEquipmentCalibrationHistorySchema = new Schema<IMedicalEquipmentCalibrationHistory>(
  {
    equipment: {
      type: Schema.Types.ObjectId,
      ref: "MedicalEquipment",
      required: true,
    },
    type: {
      type: String,
      enum: MEDICAL_EQUIPMENT_HISTORY_TYPE,
      required: true,
    },
    performedAt: {
      type: Date,
      required: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    vendorName: {
      type: String,
      trim: true,
      default: null,
    },
    result: {
      type: String,
      enum: MEDICAL_EQUIPMENT_INSPECTION_RESULT,
      required: true,
    },
    nextDueAt: {
      type: Date,
      default: null,
    },
    certificateFileUrl: {
      type: String,
      trim: true,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    // Append-only: chỉ cần createdAt, không cần updatedAt (giống tinh thần
    // AssetAssignmentHistory — bản ghi lịch sử không được sửa sau khi tạo)
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Index — copy tinh thần AssignmentHistory: asset/effectiveAt -> equipment/performedAt
medicalEquipmentCalibrationHistorySchema.index({ equipment: 1, performedAt: -1 });
medicalEquipmentCalibrationHistorySchema.index({ equipment: 1, type: 1, performedAt: -1 });
medicalEquipmentCalibrationHistorySchema.index({ nextDueAt: 1 });

export const MedicalEquipmentCalibrationHistory =
  models.MedicalEquipmentCalibrationHistory ||
  model<IMedicalEquipmentCalibrationHistory>(
    "MedicalEquipmentCalibrationHistory",
    medicalEquipmentCalibrationHistorySchema
  );
