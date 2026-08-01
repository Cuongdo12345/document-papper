// models/assets/asset.model.ts
import { Schema, model, Types } from "mongoose";
import type { IAsset } from "../../interfaces/assets/asset.interface";
/* ===== ENUM ===== */

export enum AssetStatus {
  IN_STOCK = "IN_STOCK", // trong kho, chưa cấp phát
  IN_USE = "IN_USE", // đang sử dụng
  UNDER_MAINTENANCE = "UNDER_MAINTENANCE", // đang sửa chữa/bảo trì
  RESERVED = "RESERVED", // đã duyệt cấp nhưng chưa bàn giao
  DISPOSED = "DISPOSED", // đã thanh lý
  LOST = "LOST", // thất lạc / mất
}


/* ===== SCHEMA ===== */

const AssetSchema = new Schema<IAsset>(
  {
    assetCode: {
      type: String,
      unique: true,
      index: true,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "AssetCategory",
      required: true,
    },

    name: { type: String, required: true, trim: true },

    serialNumber: { type: String, trim: true },
    model: { type: String, trim: true },
    manufacturer: { type: String, trim: true },

    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    location: { type: String, trim: true },

    purchaseDate: { type: Date },
    purchasePrice: { type: Number, min: 0 },
    warrantyExpiredAt: { type: Date, index: true },
    supplier: { type: String, trim: true },

    // 🔗 Giai đoạn 4 — xem giải thích ở interface IAsset phía trên.
    maintenanceStartedAt: { type: Date },
    warrantyAlertSentAt: { type: Date },

    // 🔗 Giai đoạn 5 — kiểm kê bằng QR code.
    lastInventoryCheckAt: { type: Date },
    lastInventoryCheckBy: { type: Schema.Types.ObjectId, ref: "User" },

    status: {
      type: String,
      enum: Object.values(AssetStatus),
      default: AssetStatus.IN_STOCK,
      index: true,
    },

    isActive: { type: Boolean, default: true },

    specs: {
      type: Schema.Types.Mixed,
      default: {},
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: undefined },
  },
  { timestamps: true },
);

/* ===== INDEX ===== */

AssetSchema.index({ department: 1, status: 1 });
AssetSchema.index({ category: 1, status: 1 });
AssetSchema.index({ assignedTo: 1 });
AssetSchema.index({ name: "text", assetCode: "text", serialNumber: "text" });

export const Asset = model<IAsset>("Asset", AssetSchema);
