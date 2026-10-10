import { Types } from "mongoose";

export enum SoftwareLicenseType {
  PERPETUAL = "PERPETUAL", // vĩnh viễn, không có hạn
  SUBSCRIPTION = "SUBSCRIPTION", // thuê bao, có hạn
}

/**
 * DEV-116 — danh mục bản quyền phần mềm. KHÔNG có trường khoá bản quyền / product key (quyết định Q-A2
 * của user, 2026-10-08): chỉ lưu số hợp đồng/đơn hàng và file chứng từ. KHÔNG thêm trường lưu khoá vào đây
 * khi chưa có quyết định mới.
 */
export interface ISoftwareLicense {
  softwareName: string;
  edition?: string; // VD "Standard"
  version?: string; // VD "2021"

  licenseType: SoftwareLicenseType;
  totalSeats: number; // số máy được cài
  /** Máy đang dùng. Độ dài LUÔN ≤ totalSeats (ép bằng cập nhật có điều kiện, không đọc-rồi-ghi). */
  assets: Types.ObjectId[];

  purchaseDate?: Date;
  expiresAt?: Date; // chỉ có với SUBSCRIPTION
  expiryAlertSentAt?: Date | null;

  vendor?: Types.ObjectId;
  contractOrOrderNumber?: string;
  proofFileId?: Types.ObjectId; // ref Upload — chứng từ

  isActive: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}
