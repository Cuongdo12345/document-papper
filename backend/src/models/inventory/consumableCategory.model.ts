// models/inventory/consumableCategory.model.ts
//
// Xem giải thích đầy đủ ở `interfaces/inventory/consumableCategory.interface.ts`
// — mirror ĐÚNG `models/assets/assetCategory.model.ts`.

import { Schema, model } from "mongoose";
import type { IConsumableCategory } from "../../interfaces/inventory/consumableCategory.interface";

const ConsumableCategorySchema = new Schema<IConsumableCategory>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },

    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "ConsumableCategory",
    },

    isActive: { type: Boolean, default: true },

    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: undefined },
  },
  { timestamps: true },
);

ConsumableCategorySchema.index({ code: 1 }, { unique: true });
ConsumableCategorySchema.index({ parentCategory: 1 });

export const ConsumableCategory = model<IConsumableCategory>(
  "ConsumableCategory",
  ConsumableCategorySchema,
);
