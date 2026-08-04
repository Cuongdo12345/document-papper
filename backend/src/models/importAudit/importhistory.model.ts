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
{
    timestamps: { createdAt: true, updatedAt: false },
    // ⚠️ `errors` là 1 trong số ít tên field Mongoose "reserved" (Document
    // instance có sẵn thuộc tính nội bộ `.errors` dùng cho kết quả
    // validate) — Mongoose cảnh báo lúc khởi động dù vẫn chạy được.
    //
    // ĐÃ CÂN NHẮC đổi tên field (vd `importErrors`) — đây là cách sửa "sạch"
    // hơn, loại bỏ hoàn toàn rủi ro xung đột thay vì chỉ tắt cảnh báo. Tuy
    // nhiên KHÔNG đổi ở lần sửa này vì field `errors` đang được
    // `excel.controller.ts` (`GET /api/excel/import-history`) trả nguyên
    // dạng ra API — đổi tên bây giờ là breaking change cho bất kỳ frontend
    // nào đã đọc field này. Nếu xác nhận chưa có consumer nào phụ thuộc tên
    // field cũ, nên đổi sang `importErrors` và xoá option này.
    //
    // Tắt cảnh báo có chủ đích (không phải bỏ qua ngẫu nhiên) vì rủi ro
    // thực tế ở đây thấp: code không gọi `doc.errors` để đọc validation
    // error nội bộ của Mongoose ở model này, chỉ dùng field `errors` như dữ
    // liệu nghiệp vụ thuần tuý (mảng lỗi import) — không phát hiện xung đột
    // thật nào khi grep toàn bộ codebase.
    suppressReservedKeysWarning: true,
  },
  
);

/** LIST theo user (tự tra cứu lịch sử của mình) hoặc ADMIN xem toàn bộ, mới nhất trước. */
ImportHistorySchema.index({ importedBy: 1, createdAt: -1 });
ImportHistorySchema.index({ createdAt: -1 });

export const ImportHistory = model<IImportHistory>("ImportHistory", ImportHistorySchema);

