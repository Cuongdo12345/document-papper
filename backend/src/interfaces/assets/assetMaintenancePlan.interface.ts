import type { Types } from "mongoose";

/**
 * Roadmap B2 (Lịch bảo trì chủ động, 2026-09-15) — kế hoạch bảo trì ĐỊNH
 * TRƯỚC cho 1 Asset, ĐỘC LẬP với `Asset.maintenanceStartedAt` (vốn chỉ set
 * khi có 1 đề xuất PROPOSE_REPAIR thật được duyệt — hoàn toàn PHẢN ỨNG,
 * xem `assetMaintenance.service.ts`). Đây là góc nhìn CHỦ ĐỘNG: Phòng Vật
 * tư-TTB tự lên lịch "sẽ bảo trì thiết bị X vào ngày Y", không phụ thuộc
 * việc thiết bị có hỏng hay không.
 *
 * CHỦ Ý KHÔNG có recurrence (lặp lại tự động theo tháng/quý) ở v1 — giữ
 * đơn giản đúng phạm vi roadmap yêu cầu (calendar xem trước, không phải hệ
 * thống lập lịch phức tạp); nhân viên tự tạo entry tiếp theo sau khi hoàn
 * tất 1 lần. Có thể bổ sung sau nếu có nhu cầu thật.
 */
export enum MaintenancePlanStatus {
  PLANNED = "planned",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface IAssetMaintenancePlan {
  asset: Types.ObjectId; // ref Asset

  title: string;
  description?: string;

  scheduledDate: Date;

  status: MaintenancePlanStatus;

  // Chỉ có giá trị khi status="completed"/"cancelled" — BẤT BIẾN sau khi
  // set (không cho sửa lại 1 plan đã đóng, giữ đúng lịch sử đã xảy ra).
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  /** Ghi chú khi hoàn tất/huỷ (lý do huỷ, kết quả bảo trì...). */
  resolutionNote?: string;

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}
