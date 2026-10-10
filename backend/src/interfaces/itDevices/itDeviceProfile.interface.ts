import { Types } from "mongoose";

/**
 * DEV-116 (tách module Tài sản, Giai đoạn 5) — hồ sơ kỹ thuật của thiết bị CNTT, quan hệ 1-1 với `Asset`
 * (loại IT), cùng mẫu `MedicalDeviceProfile`. Cấu hình phần cứng là chuỗi tự do vì dữ liệu cũ
 * (`Asset.specs`) ở dạng "64GB", "4TB SSD RAID10"...
 */
export interface IItDeviceProfile {
  asset: Types.ObjectId; // ref Asset, UNIQUE

  // Phần cứng
  cpu?: string;
  ram?: string;
  storage?: string;
  gpu?: string;

  // Mạng
  ipAddress?: string; // IPv4/IPv6 hợp lệ; trùng thiết bị đang hoạt động khác chỉ CẢNH BÁO, không chặn (Q-A3)
  macAddress?: string; // chuẩn hoá AA:BB:CC:DD:EE:FF
  hostname?: string;
  vlan?: number; // 1..4094

  // Hệ điều hành & firmware
  osName?: string;
  osVersion?: string;
  firmwareVersion?: string;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}
