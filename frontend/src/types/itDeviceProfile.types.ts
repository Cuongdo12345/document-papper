/**
 * FE-43 — hồ sơ thiết bị CNTT (1-1 với tài sản `IT`). Khớp `IItDeviceProfile` + `UpsertItDeviceProfileDTO`
 * (backend, DEV-116). Mọi trường đều tuỳ chọn; gửi `null` (hoặc chuỗi rỗng) để xoá trường.
 */
export interface ItDeviceProfile {
  _id: string;
  asset: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  gpu?: string;
  ipAddress?: string;
  macAddress?: string;
  hostname?: string;
  vlan?: number;
  osName?: string;
  osVersion?: string;
  firmwareVersion?: string;
  updatedAt?: string;
}

export type ItDeviceProfileField = Exclude<keyof ItDeviceProfile, "_id" | "asset" | "updatedAt">;

export type UpsertItDeviceProfileRequest = {
  [K in ItDeviceProfileField]?: K extends "vlan" ? number | null : string | null;
};

/** Cảnh báo không chặn lưu (hiện chỉ có `DUPLICATE_IP`: IP trùng với thiết bị đang hoạt động khác). */
export interface ItDeviceProfileWarning {
  code: "DUPLICATE_IP";
  message?: string;
  assets?: { _id: string; assetCode: string; name: string }[];
}

export interface ItDeviceProfileResponse {
  message: string;
  /** `null` khi tài sản chưa có hồ sơ (KHÔNG phải 404). */
  data: ItDeviceProfile | null;
  warnings?: ItDeviceProfileWarning[];
}
