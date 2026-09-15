// models/documents/documentVersion.model.ts
//
// Roadmap A4 — lịch sử nội dung tài liệu (title/meta) TRƯỚC mỗi lần bị sửa,
// xem giải thích thiết kế đầy đủ ở `interfaces/documents/documentVersion.interface.ts`.

import { Schema, model } from "mongoose";
import type { IDocumentVersion } from "../../interfaces/documents/documentVersion.interface";

const DocumentVersionSchema = new Schema<IDocumentVersion>(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    versionNumber: { type: Number, required: true },
    title: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, required: true },
    editedBy: { type: Schema.Types.ObjectId, ref: "User" },
    editedAt: { type: Date, required: true },
  },
  // CHỈ cần `createdAt` (thời điểm version bị đóng băng/thay thế) — không có
  // "update" nào cho 1 version record sau khi tạo (bất biến, đúng bản chất
  // lịch sử).
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Phục vụ ĐÚNG 1 pattern truy vấn: liệt kê lịch sử của 1 document, mới nhất
// (versionNumber cao nhất) trước — mirror `CalibrationRecordSchema.index`.
DocumentVersionSchema.index({ document: 1, versionNumber: -1 });

export const DocumentVersion = model<IDocumentVersion>(
  "DocumentVersion",
  DocumentVersionSchema,
);
