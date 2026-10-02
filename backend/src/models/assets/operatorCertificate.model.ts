// models/assets/operatorCertificate.model.ts
//
// MODULE MỚI (DEV-077) — xem giải thích đầy đủ ở
// `interfaces/assets/operatorCertificate.interface.ts`.

import { Schema, model } from "mongoose";
import { IOperatorCertificate } from "../../interfaces/assets/operatorCertificate.interface";

const OperatorCertificateSchema = new Schema<IOperatorCertificate>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deviceCategory: {
      type: Schema.Types.ObjectId,
      ref: "AssetCategory",
      required: true,
    },
    certificateNumber: { type: String, trim: true },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    alertSentAt: { type: Date },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" },

    // [MỚI DEV-078] Sửa/thu hồi/xoá — xem giải thích đầy đủ ở
    // `interfaces/assets/operatorCertificate.interface.ts`.
    isActive: { type: Boolean, default: true },
    revokedAt: { type: Date },
    revokedBy: { type: Schema.Types.ObjectId, ref: "User" },
    revokedReason: { type: String, trim: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Phục vụ 2 truy vấn chính: (1) "user X có chứng chỉ hợp lệ cho danh mục Y
// không" (assign/transfer guard, `assertOperatorCertifiedIfRequired`) —
// equality user+deviceCategory+isActive rồi range expiresAt; (2) liệt kê
// người đủ điều kiện cho 1 danh mục (FE picker,
// `getCertifiedUsersForCategoryService`). `isActive` thêm vào compound index
// (DEV-078) vì nay là điều kiện BẮT BUỘC của cả 2 truy vấn "đang hợp lệ".
OperatorCertificateSchema.index({ user: 1, deviceCategory: 1, isActive: 1, expiresAt: -1 });
OperatorCertificateSchema.index({ deviceCategory: 1, isActive: 1, expiresAt: -1 });
// Phục vụ cron cảnh báo hết hạn (`checkOperatorCertificateExpiringService`).
OperatorCertificateSchema.index({ alertSentAt: 1, expiresAt: 1 });

export const OperatorCertificate = model<IOperatorCertificate>(
  "OperatorCertificate",
  OperatorCertificateSchema,
);
