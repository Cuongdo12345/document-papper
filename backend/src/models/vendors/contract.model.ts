// models/vendors/contract.model.ts
//
// Roadmap B4 (2026-09-16) — xem giải thích đầy đủ ở
// `interfaces/vendors/contract.interface.ts`.

import { Schema, model } from "mongoose";
import { IContract, ContractStatus } from "../../interfaces/vendors/contract.interface";

const ContractSchema = new Schema<IContract>(
  {
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    assets: [{ type: Schema.Types.ObjectId, ref: "Asset", required: true }],

    contractNumber: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    status: {
      type: String,
      enum: Object.values(ContractStatus),
      default: ContractStatus.ACTIVE,
    },

    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancelReason: { type: String, trim: true },

    expiryAlertSentAt: { type: Date, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Danh sách theo vendor (trang chi tiết NCC), mới nhất trước.
ContractSchema.index({ vendor: 1, createdAt: -1 });

// Tra cứu "hợp đồng nào áp dụng cho asset X" (section trong AssetDetailPage).
ContractSchema.index({ assets: 1 });

// Cron cảnh báo sắp hết hạn — quét theo status + endDate + cờ đã gửi.
ContractSchema.index({ status: 1, endDate: 1, expiryAlertSentAt: 1 });

export const Contract = model<IContract>("Contract", ContractSchema);
