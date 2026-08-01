import { Schema, model, Types } from "mongoose";
import type {
  IImportHistory,
  ImportHistoryMode,
  ImportHistoryStatus,
} from "../../interfaces/importAudit/importHistory.interface";
export type { IImportHistory, ImportHistoryMode, ImportHistoryStatus };


const ImportHistorySchema = new Schema<IImportHistory>(
  {
    importedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileName: { type: String, required: true },
    mode: { type: String, enum: ["dryRun", "commit"], required: true },
    status: { type: String, enum: ["success", "partial", "failed"], required: true },
    totalRows: { type: Number, default: 0 },
    created: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    reportsCreated: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    errors: [
      {
        _id: false,
        row: Number,
        message: String,
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

/** LIST theo user (tự tra cứu lịch sử của mình) hoặc ADMIN xem toàn bộ, mới nhất trước. */
ImportHistorySchema.index({ importedBy: 1, createdAt: -1 });
ImportHistorySchema.index({ createdAt: -1 });

export const ImportHistory = model<IImportHistory>("ImportHistory", ImportHistorySchema);

