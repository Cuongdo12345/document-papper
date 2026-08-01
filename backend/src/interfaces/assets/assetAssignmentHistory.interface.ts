import type { Types } from "mongoose";
import type { AssetAssignmentActionType } from "../../models/assets/assetAssignmentHistory.model";

export interface IAssetAssignmentHistory {
  asset: Types.ObjectId;
  actionType: AssetAssignmentActionType;

  fromDepartment?: Types.ObjectId;
  toDepartment?: Types.ObjectId;
  fromUser?: Types.ObjectId;
  toUser?: Types.ObjectId;

  handedOverBy: Types.ObjectId; // user thực hiện thao tác (thường là nhân viên IT)
  reason?: string;

  effectiveAt: Date; // thời điểm bàn giao thực tế có hiệu lực
  createdAt?: Date;
}