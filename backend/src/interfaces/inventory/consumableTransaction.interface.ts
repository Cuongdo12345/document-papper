import type { Types } from "mongoose";

/**
 * Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15) — xem giải thích đầy đủ ở
 * `consumableItem.interface.ts`. Đây là 1 bản ghi giao dịch nhập/xuất kho —
 * BẤT BIẾN sau khi tạo (không có update/delete endpoint nào), cùng triết lý
 * audit-trail đã dùng xuyên suốt dự án (`CalibrationRecord`, `DocumentVersion`).
 */
export enum ConsumableTransactionType {
  IN = "IN", // nhập kho
  OUT = "OUT", // xuất kho
}

export interface IConsumableTransaction {
  consumableItem: Types.ObjectId; // ref ConsumableItem

  type: ConsumableTransactionType;
  quantity: number; // luôn > 0, dấu +/- được suy ra từ `type`
  balanceAfter: number; // quantityOnHand CỦA ITEM ngay sau giao dịch này — snapshot để đọc lịch sử không cần tính lại

  reason?: string; // lý do nhập/xuất (VD "Nhập hàng từ NCC ABC", "Cấp phát cho khoa Nội")

  performedBy: Types.ObjectId; // ref User — người thực hiện giao dịch

  createdAt?: Date;
}
