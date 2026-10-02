// models/assets/assetCategory.model.ts
import { Schema, model, Types } from "mongoose";
import type { IAssetCategory } from "../../interfaces/assets/assetCategory.interface";

/**
 * Schema
 */
const AssetCategorySchema = new Schema<IAssetCategory>(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    name: { type: String, required: true, trim: true },

    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "AssetCategory",
    },

    defaultWarrantyMonths: {
      type: Number,
      min: 0,
    },

    isActive: { type: Boolean, default: true },

    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: undefined },
  },
  { timestamps: true },
);

AssetCategorySchema.index({ code: 1 }, { unique: true });
AssetCategorySchema.index({ name: "text" });
// DEV-080: cây danh mục — tra con (`assertLeafCategory`, chặn xoá cha còn con).
// Cùng index đã có ở `ConsumableCategory`.
AssetCategorySchema.index({ parentCategory: 1 });

export const AssetCategory = model<IAssetCategory>(
  "AssetCategory",
  AssetCategorySchema,
);
