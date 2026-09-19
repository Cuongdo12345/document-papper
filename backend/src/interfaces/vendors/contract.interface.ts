import type { Types } from "mongoose";

/**
 * Roadmap B4 (2026-09-16) — hợp đồng bảo trì/bảo hành ký với 1 `Vendor`, áp
 * dụng cho NHIỀU `Asset` cùng lúc (đã xác nhận với user: 1 hợp đồng ↔ nhiều
 * tài sản — khớp thực tế bệnh viện thường ký 1 hợp đồng bảo trì cho cả lô
 * thiết bị, không phải từng thiết bị 1 hợp đồng riêng). `assets` là mảng ref
 * nhúng trực tiếp (KHÔNG tạo collection trung gian riêng) — số lượng asset/
 * hợp đồng dự kiến nhỏ (vài chục), không cần phân trang riêng cho quan hệ
 * N-N này, cùng tinh thần đơn giản hoá đã áp dụng ở `WorkflowTemplate.steps[]`.
 */
export enum ContractStatus {
  ACTIVE = "active",
  CANCELLED = "cancelled",
}

export interface IContract {
  vendor: Types.ObjectId; // ref Vendor
  assets: Types.ObjectId[]; // ref Asset — nhiều tài sản cùng thuộc 1 hợp đồng

  contractNumber?: string;
  title: string;
  description?: string; // điều khoản/ghi chú hợp đồng

  startDate: Date;
  endDate: Date;

  status: ContractStatus;

  // Chỉ có giá trị khi status="cancelled". [SỬA 2026-09-16, DEV-058] Trước
  // đây BẤT BIẾN tuyệt đối — nay có thể bị xoá (unset) bởi
  // `restoreContractService` khi khôi phục hợp đồng huỷ nhầm về "active"
  // (user yêu cầu). `updateContractService` vẫn KHÔNG cho sửa hợp đồng đã huỷ.
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancelReason?: string;

  // Đánh dấu ĐÃ GỬI cảnh báo sắp hết hạn — gửi ĐÚNG 1 LẦN, reset về null khi
  // `endDate` đổi (cùng pattern `warrantyAlertSentAt` ở `assetAlerts.service.ts`).
  expiryAlertSentAt?: Date | null;

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}
