import { Schema, model, models, Types, Document as MongooseDocument } from "mongoose";

/**
 * MedicalEquipmentComponent
 *
 * KHÔNG có tương đương ở Asset — bắt buộc tách bảng vì quan hệ 1-nhiều
 * (vật tư/linh kiện đi kèm một thiết bị, mỗi cái có hạn dùng/lô riêng).
 *
 * Nguồn thiết kế: 18_MEDICAL_EQUIPMENT_DESIGN.md §2.3
 */

export interface IMedicalEquipmentComponent extends MongooseDocument {
  equipment: Types.ObjectId;
  name: string; // VD: pin, cảm biến, dây dẫn dùng 1 lần...
  lotNumber?: string | null;
  quantity: number;
  unit?: string | null;
  expiredAt?: Date | null;
  receivedAt?: Date | null;
  isActive: boolean;
  createdBy?: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const medicalEquipmentComponentSchema = new Schema<IMedicalEquipmentComponent>(
  {
    equipment: {
      type: Schema.Types.ObjectId,
      ref: "MedicalEquipment",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    lotNumber: { type: String, trim: true, default: null },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unit: { type: String, trim: true, default: null },
    expiredAt: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
  }
);

// Index gợi ý theo 18_MEDICAL_EQUIPMENT_DESIGN.md §2.3:
// - equipment + expiredAt: query "vật tư sắp hết hạn theo thiết bị"
// - expiredAt: dùng cho cron toàn hệ thống (component expiry alert)
medicalEquipmentComponentSchema.index({ equipment: 1, expiredAt: 1 });
medicalEquipmentComponentSchema.index({ expiredAt: 1 });

export const MedicalEquipmentComponent =
  models.MedicalEquipmentComponent ||
  model<IMedicalEquipmentComponent>("MedicalEquipmentComponent", medicalEquipmentComponentSchema);
