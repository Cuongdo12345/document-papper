import { Schema, model, models, Types, Document as MongooseDocument } from "mongoose";

/**
 * MedicalEquipmentRelocationHistory
 *
 * Append-only — copy pattern AssetAssignmentHistory (05_DATABASE.md), nhưng KHÔNG có
 * fromUser/toUser (nhất quán với D-MED §5: thiết bị y tế không assign cá nhân).
 *
 * QUYẾT ĐỊNH D-MED-007 (đảo ngược quyết định ban đầu ở §2.5 cũ — user xác nhận thực
 * tế thiết bị y tế CÓ bị chuyển khoa/phòng, cần audit trail):
 *   - relocate là action RIÊNG, KHÔNG đi qua generic update
 *   - BỊ CHẶN khi MedicalEquipment.status thuộc {QUARANTINED, UNDER_MAINTENANCE}
 *   - PHẢI ghi history + cập nhật MedicalEquipment.department/location CÙNG transaction
 *     (copy pattern Asset assign/transfer/return — 04_ARCHITECTURE.md §5)
 *
 * Nguồn thiết kế: 18_MEDICAL_EQUIPMENT_DESIGN.md §2.5, §6 (D-MED-007)
 */

export interface IMedicalEquipmentRelocationHistory extends MongooseDocument {
  equipment: Types.ObjectId;
  fromDepartment: Types.ObjectId;
  toDepartment: Types.ObjectId;
  fromLocation?: string | null;
  toLocation?: string | null;
  reason?: string | null;
  handedOverBy?: Types.ObjectId | null;
  effectiveAt: Date;

  createdAt: Date;
}

const medicalEquipmentRelocationHistorySchema = new Schema<IMedicalEquipmentRelocationHistory>(
  {
    equipment: {
      type: Schema.Types.ObjectId,
      ref: "MedicalEquipment",
      required: true,
    },
    fromDepartment: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    toDepartment: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    fromLocation: { type: String, trim: true, default: null },
    toLocation: { type: String, trim: true, default: null },
    reason: { type: String, trim: true, default: null },
    handedOverBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    effectiveAt: {
      type: Date,
      required: true,
    },
  },
  {
    // Append-only: chỉ createdAt, không updatedAt — giống tinh thần AssignmentHistory
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Index — copy tinh thần AssignmentHistory: asset/effectiveAt -> equipment/effectiveAt
medicalEquipmentRelocationHistorySchema.index({ equipment: 1, effectiveAt: -1 });
medicalEquipmentRelocationHistorySchema.index({ toDepartment: 1, effectiveAt: -1 });

export const MedicalEquipmentRelocationHistory =
  models.MedicalEquipmentRelocationHistory ||
  model<IMedicalEquipmentRelocationHistory>(
    "MedicalEquipmentRelocationHistory",
    medicalEquipmentRelocationHistorySchema
  );
