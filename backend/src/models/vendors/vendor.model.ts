// models/vendors/vendor.model.ts
//
// Roadmap B4 (Quản lý nhà cung cấp & hợp đồng bảo trì, 2026-09-16) — xem
// giải thích đầy đủ ở `interfaces/vendors/vendor.interface.ts`.

import { Schema, model } from "mongoose";
import { IVendor } from "../../interfaces/vendors/vendor.interface";

const VendorSchema = new Schema<IVendor>(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    taxCode: { type: String, trim: true },
    notes: { type: String, trim: true },

    isActive: { type: Boolean, default: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

VendorSchema.index({ name: 1 });
VendorSchema.index({ isActive: 1 });

export const Vendor = model<IVendor>("Vendor", VendorSchema);
