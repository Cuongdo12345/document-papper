import { z } from "zod";
import { objectId } from "../common.dto";
import { SoftwareLicenseType } from "../../interfaces/itDevices/softwareLicense.interface";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const clearableText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max, `Tối đa ${max} ký tự`).nullable().optional());
const clearableDate = z.preprocess(emptyToNull, z.coerce.date().nullable().optional());
const clearableObjectId = (msg: string) => z.preprocess(emptyToNull, objectId(msg).nullable().optional());

/**
 * DEV-116 — KHÔNG có trường khoá bản quyền / product key (Q-A2). Thêm trường như vậy cần quyết định mới của user.
 * Quy tắc loại bản quyền: THUÊ BAO phải có `expiresAt`; VĨNH VIỄN không có `expiresAt` — kiểm ở DTO (tạo) và ở
 * service (sửa, trên trạng thái sau khi gộp).
 */
export const CreateSoftwareLicenseDTO = z
  .object({
    softwareName: z.string().trim().min(1, "Tên phần mềm không được để trống").max(200),
    edition: clearableText(100),
    version: clearableText(100),
    licenseType: z.nativeEnum(SoftwareLicenseType),
    totalSeats: z.coerce.number().int("Số máy phải là số nguyên").min(1, "Số máy tối thiểu là 1").max(1_000_000),
    purchaseDate: z.preprocess(emptyToNull, z.coerce.date().optional()),
    expiresAt: z.preprocess(emptyToNull, z.coerce.date().optional()),
    vendor: z.preprocess(emptyToNull, objectId("vendor không hợp lệ").optional()),
    contractOrOrderNumber: clearableText(100),
  })
  .superRefine((d, ctx) => {
    if (d.licenseType === SoftwareLicenseType.SUBSCRIPTION && !d.expiresAt) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Bản quyền thuê bao phải có ngày hết hạn" });
    }
    if (d.licenseType === SoftwareLicenseType.PERPETUAL && d.expiresAt) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Bản quyền vĩnh viễn không có ngày hết hạn" });
    }
    if (d.purchaseDate && d.expiresAt && d.expiresAt <= d.purchaseDate) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Ngày hết hạn phải sau ngày mua" });
    }
  });

export const UpdateSoftwareLicenseDTO = z
  .object({
    softwareName: z.string().trim().min(1).max(200).optional(),
    edition: clearableText(100),
    version: clearableText(100),
    licenseType: z.nativeEnum(SoftwareLicenseType).optional(),
    totalSeats: z.coerce.number().int().min(1).max(1_000_000).optional(),
    purchaseDate: clearableDate,
    expiresAt: clearableDate,
    vendor: clearableObjectId("vendor không hợp lệ"),
    contractOrOrderNumber: clearableText(100),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "Cần gửi ít nhất một trường để cập nhật" });

export const QuerySoftwareLicenseDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  keyword: z.string().trim().optional(),
  licenseType: z.nativeEnum(SoftwareLicenseType).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  /** Chỉ bản quyền đang gán cho máy này (trang chi tiết thiết bị CNTT). */
  asset: objectId("asset không hợp lệ").optional(),
  /** Thuê bao đã hết hạn hoặc hết hạn trong N ngày tới. */
  expiringWithinDays: z.coerce.number().int().min(1).max(3650).optional(),
  sortBy: z.enum(["softwareName", "expiresAt", "createdAt"]).default("softwareName"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export const AssignSoftwareLicenseDTO = z.object({
  asset: objectId("asset không hợp lệ"),
});
