import type { Types } from "mongoose";

/**
 * ConsumableCategory — nhóm phân loại vật tư tiêu hao (Văn phòng phẩm, Dụng
 * cụ vệ sinh, Vật tư CNTT...), CÓ phân cấp cha/con (`parentCategory`) — user
 * xác nhận cần phân cấp qua AskUserQuestion (2026-09-16), khác quyết định
 * B3 gốc "category là text tự do, tránh over-engineer" — nhu cầu thật đã
 * phát sinh khi số lượng/loại vật tư tăng lên. Mirror ĐÚNG pattern
 * `AssetCategory` (model/service/route đã có, xem `assetCategory.interface.ts`)
 * để nhất quán, không tự nghĩ thiết kế mới.
 */
export interface IConsumableCategory {
  code: string; // VD "VPP", "VPP-GIAYTO", "VS", "CNTT" — bất biến sau khi tạo
  name: string; // "Văn phòng phẩm", "Giấy tờ"...
  parentCategory?: Types.ObjectId; // hỗ trợ cây phân cấp — ref chính ConsumableCategory
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
  deletedBy?: Types.ObjectId;
  deletedAt?: Date;
}
