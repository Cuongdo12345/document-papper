import { Schema, model, models, Types, Document as MongooseDocument } from "mongoose";
import { MEDICAL_EQUIPMENT_RISK_CLASS, MedicalEquipmentRiskClass } from "./medicalEquipmentCategory.model";

/**
 * MedicalEquipment
 *
 * Copy pattern từ Asset (05_DATABASE.md), nhưng:
 * - KHÔNG có `assignedTo -> User` (D-MED §5, INFERRED: gắn cố định theo phòng/khoa,
 *   không assign cá nhân như Asset IT). Nếu sau này cần assign cá nhân, đây là
 *   thay đổi additive — KHÔNG tự thêm field khi implement, phải quay lại design doc trước.
 * - status là enum RIÊNG, không dùng chung Asset.status — có thêm QUARANTINED.
 * - Có field lifecycle hiệu chuẩn/kiểm định (calibration/inspection) không tồn tại ở Asset.
 *
 * QUAN TRỌNG — generic update KHÔNG được đổi trực tiếp các field sau (giữ đúng
 * tinh thần "generic update không đổi lifecycle" áp dụng cho Asset — 07_BUSINESS_RULES.md):
 *   - status
 *   - department
 * Các field này chỉ được đổi qua service action riêng (VD: quarantine override service),
 * KHÔNG whitelist vào update DTO thông thường. Đây là điểm PHẢI enforce ở tầng
 * service/DTO khi implement — schema này chỉ định nghĩa cấu trúc dữ liệu, không tự
 * enforce invariant.
 *
 * Nguồn thiết kế: 18_MEDICAL_EQUIPMENT_DESIGN.md §2.2, §3, §4, §5
 */

export const MEDICAL_EQUIPMENT_STATUS = [
  "IN_STOCK",
  "IN_USE",
  "UNDER_MAINTENANCE",
  "RESERVED",
  "QUARANTINED", // MỚI so với Asset — không đạt kiểm định/hiệu chuẩn (D-MED-005)
  "DISPOSED",
  "LOST",
] as const;
export type MedicalEquipmentStatus = (typeof MEDICAL_EQUIPMENT_STATUS)[number];

export const MEDICAL_EQUIPMENT_INSPECTION_RESULT = ["PASS", "FAIL", "CONDITIONAL"] as const;
export type MedicalEquipmentInspectionResult = (typeof MEDICAL_EQUIPMENT_INSPECTION_RESULT)[number];

// Lưu ý: field `model` (tên/model thiết bị) trùng tên với method `.model()` có sẵn
// trên Mongoose Document, nên phải Omit trước khi thêm field cùng tên — giữ đúng tên
// field DB là `model` để nhất quán với Asset (05_DATABASE.md).
export interface IMedicalEquipment extends Omit<MongooseDocument, "model"> {
  equipmentCode: string;
  category: Types.ObjectId;
  name: string;
  serialNumber?: string | null;
  model?: string | null;
  manufacturer?: string | null;

  department: Types.ObjectId;
  location?: string | null; // vị trí cụ thể trong khoa/phòng — thay thế cho assignedTo

  purchaseDate?: Date | null;
  purchasePrice?: number | null;
  warrantyExpiredAt?: Date | null;
  supplier?: string | null;

  // Đặc thù y tế
  riskClass?: MedicalEquipmentRiskClass | null; // optional override category default

  lastCalibrationAt?: Date | null;
  nextCalibrationDueAt?: Date | null;
  calibrationCycleMonths?: number | null; // optional override category default

  lastInspectionAt?: Date | null;
  nextInspectionDueAt?: Date | null;
  inspectionCycleMonths?: number | null;
  inspectionResult?: MedicalEquipmentInspectionResult | null;

  status: MedicalEquipmentStatus;
  isActive: boolean;
  specs?: Record<string, unknown> | null;

  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  deletedBy?: Types.ObjectId | null;
  deletedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const medicalEquipmentSchema = new Schema<IMedicalEquipment>(
  {
    equipmentCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "MedicalEquipmentCategory",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    serialNumber: { type: String, trim: true, default: null },
    model: { type: String, trim: true, default: null },
    manufacturer: { type: String, trim: true, default: null },

    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    location: { type: String, trim: true, default: null },

    purchaseDate: { type: Date, default: null },
    purchasePrice: { type: Number, min: 0, default: null },
    warrantyExpiredAt: { type: Date, default: null },
    supplier: { type: String, trim: true, default: null },

    riskClass: {
      type: String,
      enum: MEDICAL_EQUIPMENT_RISK_CLASS,
      default: null,
    },

    lastCalibrationAt: { type: Date, default: null },
    nextCalibrationDueAt: { type: Date, default: null },
    calibrationCycleMonths: { type: Number, min: 1, default: null },

    lastInspectionAt: { type: Date, default: null },
    nextInspectionDueAt: { type: Date, default: null },
    inspectionCycleMonths: { type: Number, min: 1, default: null },
    inspectionResult: {
      type: String,
      enum: MEDICAL_EQUIPMENT_INSPECTION_RESULT,
      default: null,
    },

    status: {
      type: String,
      enum: MEDICAL_EQUIPMENT_STATUS,
      default: "IN_STOCK",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    specs: {
      type: Schema.Types.Mixed,
      default: null,
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Index — copy pattern Asset (05_DATABASE.md: department/status, category/status, text search)
medicalEquipmentSchema.index({ department: 1, status: 1 });
medicalEquipmentSchema.index({ category: 1, status: 1 });
medicalEquipmentSchema.index({ nextCalibrationDueAt: 1 });
medicalEquipmentSchema.index({ nextInspectionDueAt: 1 });
medicalEquipmentSchema.index({ name: "text", equipmentCode: "text", serialNumber: "text" });

export const MedicalEquipment =
  models.MedicalEquipment || model<IMedicalEquipment>("MedicalEquipment", medicalEquipmentSchema);
