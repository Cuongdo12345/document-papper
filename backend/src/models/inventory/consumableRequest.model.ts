// models/inventory/consumableRequest.model.ts
//
// Roadmap B8 (Dự trù/đề xuất mua vật tư tiêu hao hàng tháng, DEV-067,
// 2026-09-18) — xem giải thích đầy đủ ở
// `interfaces/inventory/consumableRequest.interface.ts`.

import { Schema, model } from "mongoose";
import {
  IConsumableRequest,
  IConsumableRequestItem,
  ConsumableRequestStatus,
} from "../../interfaces/inventory/consumableRequest.interface";

const ConsumableRequestItemSchema = new Schema<IConsumableRequestItem>(
  {
    consumableItem: { type: Schema.Types.ObjectId, ref: "ConsumableItem", required: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const ConsumableRequestSchema = new Schema<IConsumableRequest>(
  {
    department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    requestMonth: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    items: {
      type: [ConsumableRequestItemSchema],
      required: true,
      validate: {
        validator: (items: unknown[]) => Array.isArray(items) && items.length > 0,
        message: "Đề xuất phải có ít nhất 1 vật tư",
      },
    },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(ConsumableRequestStatus),
      default: ConsumableRequestStatus.PENDING,
    },
    note: { type: String, trim: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Danh sách theo khoa/phòng + tháng dự trù (màn hình chính, filter thường dùng nhất).
ConsumableRequestSchema.index({ department: 1, requestMonth: 1 });
// Lọc theo trạng thái (VD Phòng Vật tư-TTB xem các đề xuất còn PENDING cần xử lý).
ConsumableRequestSchema.index({ status: 1 });

export const ConsumableRequest = model<IConsumableRequest>(
  "ConsumableRequest",
  ConsumableRequestSchema,
);
