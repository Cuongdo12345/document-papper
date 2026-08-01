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
      unique: true,
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

export const AssetCategory = model<IAssetCategory>(
  "AssetCategory",
  AssetCategorySchema,
);
