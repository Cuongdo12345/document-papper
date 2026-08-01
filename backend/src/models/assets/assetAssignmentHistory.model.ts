// models/assets/assetAssignmentHistory.model.ts
import { Schema, model, Types } from "mongoose";
import type { IAssetAssignmentHistory } from "../../interfaces/assets/assetAssignmentHistory.interface";
/**
 * AssetAssignmentHistory — nhật ký BẤT BIẾN (append-only, không update/delete)
 * ghi lại mọi lần cấp phát/luân chuyển/thu hồi 1 Asset. Tách riêng khỏi
 * `UserAudit` chung của project vì cần query theo `asset` rất thường xuyên
 * (asset này ai từng dùng, khi nào) — để chung với audit log tổng sẽ phải
 * lọc theo resourceType mỗi lần, chậm hơn so với có collection + index
 * riêng cho đúng use-case này.
 */

export enum AssetAssignmentActionType {
  ASSIGN = "ASSIGN", // cấp phát lần đầu từ kho: IN_STOCK/RESERVED -> IN_USE
  TRANSFER = "TRANSFER", // luân chuyển giữa khoa/phòng hoặc người dùng: IN_USE -> IN_USE
  RETURN = "RETURN", // thu hồi về kho: IN_USE/RESERVED -> IN_STOCK
}

/**
 * Shema
 */
const AssetAssignmentHistorySchema = new Schema<IAssetAssignmentHistory>(
  {
    asset: {
      type: Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },

    actionType: {
      type: String,
      enum: Object.values(AssetAssignmentActionType),
      required: true,
    },

    fromDepartment: { type: Schema.Types.ObjectId, ref: "Department" },
    toDepartment: { type: Schema.Types.ObjectId, ref: "Department" },
    fromUser: { type: Schema.Types.ObjectId, ref: "User" },
    toUser: { type: Schema.Types.ObjectId, ref: "User" },

    handedOverBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reason: { type: String, trim: true },

    effectiveAt: { type: Date, required: true, default: Date.now },
  },
  {
    // Chỉ cần createdAt (thời điểm ghi log), không cần updatedAt vì record
    // này KHÔNG BAO GIỜ được sửa sau khi tạo.
    timestamps: { createdAt: true, updatedAt: false },
  },
);

AssetAssignmentHistorySchema.index({ asset: 1, effectiveAt: -1 });
AssetAssignmentHistorySchema.index({ toUser: 1 });
AssetAssignmentHistorySchema.index({ toDepartment: 1 });

export const AssetAssignmentHistory = model<IAssetAssignmentHistory>(
  "AssetAssignmentHistory",
  AssetAssignmentHistorySchema,
);
