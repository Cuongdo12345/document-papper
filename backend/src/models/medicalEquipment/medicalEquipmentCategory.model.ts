import { Schema, model, models, Types, Document as MongooseDocument } from "mongoose";

/**
 * MedicalEquipmentCategory
 *
 * Copy pattern từ AssetCategory (05_DATABASE.md).
 * Thêm field đặc thù y tế: riskClass mặc định + chu kỳ hiệu chuẩn/kiểm định mặc định
 * cho toàn bộ thiết bị thuộc category này (có thể override ở từng MedicalEquipment).
 *
 * Nguồn thiết kế: 18_MEDICAL_EQUIPMENT_DESIGN.md §2.1, §4.1 (D-MED-004)
 */

export const MEDICAL_EQUIPMENT_RISK_CLASS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type MedicalEquipmentRiskClass = (typeof MEDICAL_EQUIPMENT_RISK_CLASS)[number];

export interface IMedicalEquipmentCategory extends MongooseDocument {
  code: string;
  name: string;
  parentCategory?: Types.ObjectId | null;

  // Đặc thù y tế — INFERRED, xem 18_MEDICAL_EQUIPMENT_DESIGN.md §4.1
  riskClass?: MedicalEquipmentRiskClass | null;
  defaultCalibrationCycleMonths?: number | null;
  defaultInspectionCycleMonths?: number | null;

  isActive: boolean;

  deletedBy?: Types.ObjectId | null;
  deletedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const medicalEquipmentCategorySchema = new Schema<IMedicalEquipmentCategory>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "MedicalEquipmentCategory",
      default: null,
    },

    riskClass: {
      type: String,
      enum: MEDICAL_EQUIPMENT_RISK_CLASS,
      default: null,
    },
    defaultCalibrationCycleMonths: {
      type: Number,
      min: 1,
      default: null,
    },
    defaultInspectionCycleMonths: {
      type: Number,
      min: 1,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index — copy pattern AssetCategory
medicalEquipmentCategorySchema.index({ parentCategory: 1 });
medicalEquipmentCategorySchema.index({ isActive: 1 });

export const MedicalEquipmentCategory =
  models.MedicalEquipmentCategory ||
  model<IMedicalEquipmentCategory>("MedicalEquipmentCategory", medicalEquipmentCategorySchema);
