// models/itDevices/softwareLicense.model.ts
//
// DEV-116 (tách module Tài sản, Giai đoạn 5) — danh mục bản quyền phần mềm + máy đang dùng.
// KHÔNG có trường khoá bản quyền (Q-A2) — xem interface.
import { Schema, model } from "mongoose";
import { ISoftwareLicense, SoftwareLicenseType } from "../../interfaces/itDevices/softwareLicense.interface";

const SoftwareLicenseSchema = new Schema<ISoftwareLicense>(
  {
    softwareName: { type: String, required: true, trim: true },
    edition: { type: String, trim: true },
    version: { type: String, trim: true },

    licenseType: { type: String, enum: Object.values(SoftwareLicenseType), required: true },
    totalSeats: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: "Số máy phải là số nguyên" } },
    assets: [{ type: Schema.Types.ObjectId, ref: "Asset" }],

    purchaseDate: { type: Date },
    expiresAt: { type: Date },
    expiryAlertSentAt: { type: Date, default: null },

    vendor: { type: Schema.Types.ObjectId, ref: "Vendor" },
    contractOrOrderNumber: { type: String, trim: true },
    proofFileId: { type: Schema.Types.ObjectId, ref: "Upload" },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Danh sách theo tên phần mềm / lọc đang dùng.
SoftwareLicenseSchema.index({ isActive: 1, softwareName: 1 });
// Cron cảnh báo hết hạn.
SoftwareLicenseSchema.index({ isActive: 1, expiresAt: 1, expiryAlertSentAt: 1 });
// Tra "máy này đang dùng bản quyền nào" và gỡ máy khi thanh lý/xoá.
SoftwareLicenseSchema.index({ assets: 1 });

export const SoftwareLicense = model<ISoftwareLicense>("SoftwareLicense", SoftwareLicenseSchema);
