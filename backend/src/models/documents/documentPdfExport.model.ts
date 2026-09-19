import mongoose, { Schema } from "mongoose";
import type { IDocumentPdfExport } from "../../interfaces/documents/documentPdfExport.interface";

const DocumentPdfExportSchema = new Schema<IDocumentPdfExport>(
  {
    document: { type: Schema.Types.ObjectId, ref: "Document", required: true },
    exportedBy: { type: Schema.Types.ObjectId, ref: "User" },
    contentHash: { type: String, required: true },
    signature: { type: String, required: true },
    algorithm: { type: String, required: true },
  },
  // CHỈ `createdAt` (thời điểm xuất) — không có khái niệm "sửa" 1 bản ghi audit.
  { timestamps: { createdAt: true, updatedAt: false } },
);

/** Phục vụ "danh sách các lần đã xuất PDF" của 1 document, mới nhất trước. */
DocumentPdfExportSchema.index({ document: 1, createdAt: -1 });

export default mongoose.model<IDocumentPdfExport>("DocumentPdfExport", DocumentPdfExportSchema);
