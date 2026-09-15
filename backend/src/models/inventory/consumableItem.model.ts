// models/inventory/consumableItem.model.ts
//
// Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15) — xem giải thích đầy đủ ở
// `interfaces/inventory/consumableItem.interface.ts`.

import { Schema, model } from "mongoose";
import { IConsumableItem } from "../../interfaces/inventory/consumableItem.interface";

const ConsumableItemSchema = new Schema<IConsumableItem>(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", required: true },

    quantityOnHand: { type: Number, required: true, default: 0, min: 0 },
    minStockThreshold: { type: Number, required: true, default: 0, min: 0 },

    lowStockAlertSentAt: { type: Date, default: null },

    isActive: { type: Boolean, default: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Danh sách theo khoa/phòng ban (màn hình chính) + chặn trùng tên vật tư
// trong CÙNG 1 phòng ban (khác phòng ban được phép trùng tên — mỗi phòng ban
// tự quản lý danh mục của mình).
ConsumableItemSchema.index({ department: 1, name: 1 }, { unique: true });
ConsumableItemSchema.index({ department: 1, isActive: 1 });

export const ConsumableItem = model<IConsumableItem>(
  "ConsumableItem",
  ConsumableItemSchema,
);
