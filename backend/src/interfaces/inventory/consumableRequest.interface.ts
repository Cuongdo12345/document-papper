import type { Types } from "mongoose";

/**
 * Roadmap B8 (Dự trù/đề xuất mua vật tư tiêu hao hàng tháng, DEV-067,
 * 2026-09-18) — user xác nhận qua AskUserQuestion trước khi code:
 * - KHÔNG có luồng duyệt (khác Document/Workflow) — chỉ ghi nhận nhu cầu.
 * - CÓ theo dõi ngân sách (đơn giá + tổng tiền dự trù), không chỉ số lượng.
 * - Trạng thái RIÊNG cho domain này (KHÔNG tái dùng Workflow engine — engine
 *   đó gắn khá chặt với domain Document, `WorkflowInstance.documentType`).
 * - Khi "đã mua" xong, KHÔNG tự động tạo `ConsumableTransaction` — vẫn nhập
 *   tay qua luồng nhập/xuất kho sẵn có (B3), vì số lượng/ngày mua thực tế có
 *   thể khác đề xuất ban đầu. `ConsumableRequest` và `ConsumableTransaction`
 *   là 2 domain TÁCH BIỆT, chỉ liên hệ ngữ nghĩa (không có ref DB giữa 2 bên).
 *
 * Items THAM CHIẾU `ConsumableItem` đã có (B3) thay vì text tự do — tái dùng
 * danh mục/đơn vị tính nhất quán đã có sẵn (CLAUDE.md Mục 11), validate mỗi
 * item PHẢI thuộc CÙNG `department` với chính request (service layer).
 */
export enum ConsumableRequestStatus {
  PENDING = "PENDING", // vừa ghi nhận, chưa mua
  FULFILLED = "FULFILLED", // đã mua xong thực tế (đánh dấu tay, KHÔNG tự sinh giao dịch kho)
  CANCELLED = "CANCELLED", // huỷ nhu cầu (không mua nữa)
}

export interface IConsumableRequestItem {
  consumableItem: Types.ObjectId; // ref ConsumableItem — PHẢI cùng department với request (validate ở service)
  quantity: number;
  unitPrice: number; // giá dự trù, nhập tay mỗi lần (giá thị trường biến động, không lấy tự động từ đâu)
  totalPrice: number; // = quantity * unitPrice, TÍNH SẴN lúc lưu — tránh lệch giữa FE/BE khi đọc lại
}

export interface IConsumableRequest {
  department: Types.ObjectId; // ref Department — dự trù CHO khoa/phòng nào
  requestMonth: string; // "YYYY-MM" — tháng dự trù (không dùng kiểu Date, tránh nhầm timezone cho 1 field chỉ cần tháng)
  items: IConsumableRequestItem[];
  totalAmount: number; // SUM(items[].totalPrice) — TÍNH SẴN lúc lưu
  status: ConsumableRequestStatus;
  note?: string;

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}
