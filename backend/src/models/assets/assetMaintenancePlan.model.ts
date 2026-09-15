// models/assets/assetMaintenancePlan.model.ts
//
// Roadmap B2 (Lịch bảo trì chủ động, 2026-09-15) — xem giải thích đầy đủ ở
// `interfaces/assets/assetMaintenancePlan.interface.ts`.

import { Schema, model } from "mongoose";
import {
  IAssetMaintenancePlan,
  MaintenancePlanStatus,
} from "../../interfaces/assets/assetMaintenancePlan.interface";

const AssetMaintenancePlanSchema = new Schema<IAssetMaintenancePlan>(
  {
    asset: { type: Schema.Types.ObjectId, ref: "Asset", required: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    scheduledDate: { type: Date, required: true },

    status: {
      type: String,
      enum: Object.values(MaintenancePlanStatus),
      default: MaintenancePlanStatus.PLANNED,
    },

    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolutionNote: { type: String, trim: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Lịch sử theo 1 asset (Asset Detail — "Lịch bảo trì"), mới nhất trước.
AssetMaintenancePlanSchema.index({ asset: 1, scheduledDate: -1 });

// Calendar (dashboard/trang lịch) — quét theo khoảng ngày, không theo asset
// cụ thể. `status` ghép cùng để phục vụ luôn filter "chỉ xem còn planned"
// phổ biến trên calendar mà không cần quét thêm.
AssetMaintenancePlanSchema.index({ scheduledDate: 1, status: 1 });

export const AssetMaintenancePlan = model<IAssetMaintenancePlan>(
  "AssetMaintenancePlan",
  AssetMaintenancePlanSchema,
);
