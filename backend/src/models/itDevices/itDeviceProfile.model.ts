// models/itDevices/itDeviceProfile.model.ts
//
// DEV-116 (tách module Tài sản, Giai đoạn 5) — hồ sơ kỹ thuật thiết bị CNTT, 1-1 với Asset.
// Validate định dạng IP/MAC ở DTO (400 rõ ràng) và lặp lại ở schema để chặn ghi sai từ code khác.
import { Schema, model } from "mongoose";
import net from "net";
import { IItDeviceProfile } from "../../interfaces/itDevices/itDeviceProfile.interface";

export const MAC_ADDRESS_REGEX = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;

const ItDeviceProfileSchema = new Schema<IItDeviceProfile>(
  {
    asset: { type: Schema.Types.ObjectId, ref: "Asset", required: true },

    cpu: { type: String, trim: true },
    ram: { type: String, trim: true },
    storage: { type: String, trim: true },
    gpu: { type: String, trim: true },

    ipAddress: {
      type: String,
      trim: true,
      validate: { validator: (v: string) => net.isIP(v) !== 0, message: "Địa chỉ IP không hợp lệ" },
    },
    macAddress: {
      type: String,
      trim: true,
      uppercase: true,
      validate: { validator: (v: string) => MAC_ADDRESS_REGEX.test(v), message: "Địa chỉ MAC không hợp lệ (dạng AA:BB:CC:DD:EE:FF)" },
    },
    hostname: { type: String, trim: true },
    vlan: { type: Number, min: 1, max: 4094 },

    osName: { type: String, trim: true },
    osVersion: { type: String, trim: true },
    firmwareVersion: { type: String, trim: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// 1-1 với Asset; upsert đồng thời không tạo được 2 hồ sơ.
ItDeviceProfileSchema.index({ asset: 1 }, { unique: true });
// Tìm theo IP (kiểm tra trùng + tra cứu).
ItDeviceProfileSchema.index({ ipAddress: 1 });
// Rà soát máy dùng phiên bản hệ điều hành cũ.
ItDeviceProfileSchema.index({ osName: 1, osVersion: 1 });

export const ItDeviceProfile = model<IItDeviceProfile>("ItDeviceProfile", ItDeviceProfileSchema);
