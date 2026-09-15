// models/inventory/consumableTransaction.model.ts
//
// Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15) — xem giải thích đầy đủ ở
// `interfaces/inventory/consumableTransaction.interface.ts`.

import { Schema, model } from "mongoose";
import {
  IConsumableTransaction,
  ConsumableTransactionType,
} from "../../interfaces/inventory/consumableTransaction.interface";

const ConsumableTransactionSchema = new Schema<IConsumableTransaction>(
  {
    consumableItem: { type: Schema.Types.ObjectId, ref: "ConsumableItem", required: true },

    type: {
      type: String,
      enum: Object.values(ConsumableTransactionType),
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    balanceAfter: { type: Number, required: true, min: 0 },

    reason: { type: String, trim: true },

    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }, // bất biến, không cần updatedAt
);

// Lịch sử giao dịch theo 1 item, mới nhất trước — query chính của màn hình
// chi tiết vật tư.
ConsumableTransactionSchema.index({ consumableItem: 1, createdAt: -1 });

export const ConsumableTransaction = model<IConsumableTransaction>(
  "ConsumableTransaction",
  ConsumableTransactionSchema,
);
