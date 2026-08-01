import type { Types } from "mongoose";
import type { AssetStatus } from "../../models/assets/asset.model";

/* ===== INTERFACE ===== */

export interface IAsset {
  assetCode: string; // mã tự sinh, unique — VD: TB-CNTT-2026-0001
  category: Types.ObjectId; // ref AssetCategory
  name: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;

  department: Types.ObjectId; // khoa/phòng đang quản lý
  assignedTo?: Types.ObjectId; // user đang sử dụng (nếu có) — cập nhật qua /:id/assign, /:id/transfer, /:id/return (Giai đoạn 2), KHÔNG sửa trực tiếp qua PUT /:id
  location?: string; // vị trí vật lý cụ thể (phòng 302, khu A...)

  purchaseDate?: Date;
  purchasePrice?: number;
  warrantyExpiredAt?: Date; // dùng để cảnh báo tự động (Giai đoạn 4)
  supplier?: string;
  /**
   * 🔗 GIAI ĐOẠN 4 — thời điểm bắt đầu bảo trì (set bởi
   * `startAssetMaintenanceService`, xoá khi `resolveAssetMaintenanceService`
   * xử lý xong). Dùng làm mốc tính "đang bảo trì bao lâu rồi" cho cron cảnh
   * báo bảo trì quá hạn — KHÔNG dùng `updatedAt` vì field đó bị ghi đè bởi
   * MỌI thay đổi khác của asset (đổi tên, đổi NCC...), không chỉ riêng lúc
   * chuyển UNDER_MAINTENANCE.
   */
  maintenanceStartedAt?: Date;

  /**
   * 🔗 GIAI ĐOẠN 4 — thời điểm ĐÃ gửi cảnh báo sắp hết hạn bảo hành gần
   * nhất. Dùng để cron KHÔNG gửi trùng thông báo mỗi ngày cho cùng 1 asset
   * — chỉ gửi lại nếu `warrantyExpiredAt` bị đổi sang ngày mới (xem
   * `updateAssetService`, tự xoá field này khi `warrantyExpiredAt` thay đổi).
   */
  warrantyAlertSentAt?: Date;
  /**
   * 🔗 GIAI ĐOẠN 5 — kiểm kê bằng QR code. Mỗi lần quét mã QR dán trên thiết
   * bị và xác nhận "vẫn thấy tài sản này" (`POST /:id/check-in`), 2 field
   * này được cập nhật. KHÔNG tạo model lịch sử kiểm kê riêng — chỉ cần biết
   * LẦN GẦN NHẤT, không cần toàn bộ lịch sử kiểm kê (khác hẳn nhu cầu của
   * `AssetAssignmentHistory` — nơi MỌI lần thay đổi đều quan trọng để audit).
   */
  lastInventoryCheckAt?: Date;
  lastInventoryCheckBy?: Types.ObjectId;

  status: AssetStatus;
  isActive: boolean;

  /** Cấu hình động theo category (CPU/RAM/IP...), giống pattern `meta` của Document */
  specs?: Record<string, any>;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  deletedBy?: Types.ObjectId;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}