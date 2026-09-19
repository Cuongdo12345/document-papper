import type { Types } from "mongoose";

/**
 * Roadmap B4 (Quản lý nhà cung cấp & hợp đồng bảo trì, 2026-09-16) — module
 * MỚI hoàn toàn. `Vendor` = nhà cung cấp/đơn vị ký hợp đồng bảo trì/bảo hành
 * thiết bị — ĐỘC LẬP với `Asset`/`MedicalDeviceProfile`, liên kết qua
 * `Contract` (xem `contract.interface.ts`), KHÔNG nhồi field NCC trực tiếp
 * vào Asset (đã hỏi lại user trước khi code, chọn phương án đầy đủ 2 domain
 * riêng thay vì chỉ thêm field nhẹ).
 */
export interface IVendor {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string; // mã số thuế — thông tin phổ biến khi làm việc với NCC tại VN
  notes?: string;

  isActive: boolean; // false = ngừng hợp tác, không xoá cứng (giữ lịch sử Contract đã ký)

  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}
