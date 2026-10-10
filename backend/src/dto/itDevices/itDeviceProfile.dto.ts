import { z } from "zod";
import net from "net";

// "" và null đều nghĩa là XOÁ giá trị (PUT ghi đè từng trường được gửi); không gửi = giữ nguyên.
const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const clearableText = (max = 200) => z.preprocess(emptyToNull, z.string().trim().max(max, `Tối đa ${max} ký tự`).nullable().optional());

const MAC_INPUT_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

/**
 * DEV-116 — PUT /api/it-assets/:assetId/profile (tạo nếu chưa có, sửa nếu đã có). Chỉ các trường được gửi
 * mới đổi. IP trùng thiết bị khác KHÔNG bị chặn (Q-A3) — service trả `warnings`.
 */
export const UpsertItDeviceProfileDTO = z
  .object({
    cpu: clearableText(),
    ram: clearableText(),
    storage: clearableText(),
    gpu: clearableText(),

    ipAddress: z.preprocess(
      emptyToNull,
      z
        .string()
        .trim()
        .refine((v) => net.isIP(v) !== 0, "Địa chỉ IP không hợp lệ")
        .nullable()
        .optional(),
    ),
    macAddress: z.preprocess(
      emptyToNull,
      z
        .string()
        .trim()
        .regex(MAC_INPUT_REGEX, "Địa chỉ MAC không hợp lệ (dạng AA:BB:CC:DD:EE:FF)")
        .transform((v) => v.replace(/-/g, ":").toUpperCase())
        .nullable()
        .optional(),
    ),
    hostname: clearableText(100),
    vlan: z.preprocess(emptyToNull, z.coerce.number().int("VLAN phải là số nguyên").min(1, "VLAN từ 1 đến 4094").max(4094, "VLAN từ 1 đến 4094").nullable().optional()),

    osName: clearableText(100),
    osVersion: clearableText(100),
    firmwareVersion: clearableText(100),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "Cần gửi ít nhất một trường của hồ sơ" });
