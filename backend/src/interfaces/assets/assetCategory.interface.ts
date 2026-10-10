import type { Types } from "mongoose";
import type { AssetType } from "./asset.interface";

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
  /**
   * CHỈ có trên danh mục GỐC (không có `parentCategory`), bắt buộc với gốc mới
   * (DEV-112). Danh mục con kế thừa loại của gốc, không lưu lặp.
   */
  assetType?: AssetType;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedBy?: Types.ObjectId;
  deletedAt?: Date;
}
