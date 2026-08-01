import type { Types } from "mongoose";

/**
 * AssetCategory — danh mục loại thiết bị IT (PC, LAPTOP, PRINTER, SWITCH,
 * UPS, CAMERA...). Thiết kế dạng COLLECTION thay vì enum cứng (khác cách
 * `DocumentCategory`/`DocumentSubType` đang làm), vì danh mục thiết bị IT
 * của bệnh viện thay đổi thường xuyên hơn loại giấy tờ — thêm 1 loại thiết
 * bị mới không nên cần deploy lại code.
 */

export interface IAssetCategory {
  code: string; // PC, LAPTOP, PRINTER, SWITCH, UPS, CAMERA...
  name: string; // "Máy tính để bàn"
  parentCategory?: Types.ObjectId; // hỗ trợ cây phân cấp nếu cần mở rộng sau
  defaultWarrantyMonths?: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedBy?: Types.ObjectId;
  deletedAt?: Date;
}
