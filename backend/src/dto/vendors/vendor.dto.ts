// dto/vendors/vendor.dto.ts
//
// Roadmap B4 (Quản lý nhà cung cấp & hợp đồng bảo trì, 2026-09-16).
import { z } from "zod";

export const CreateVendorDTO = z.object({
  name: z.string().trim().min(1, "Tên nhà cung cấp không được để trống"),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Email không hợp lệ").optional().or(z.literal("")),
  address: z.string().trim().optional(),
  taxCode: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const UpdateVendorDTO = z.object({
  name: z.string().trim().min(1).optional(),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Email không hợp lệ").optional().or(z.literal("")),
  address: z.string().trim().optional(),
  taxCode: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export const QueryVendorsDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  // ⚠️ SỬA (2026-09-16, user báo lọc "Đã ngừng" vẫn hiện NCC đang hoạt động):
  // `z.coerce.boolean()` chỉ gọi `Boolean(value)` — với query string, MỌI
  // chuỗi không rỗng (kể cả literal "false") đều coerce thành `true`, nên
  // `isActive=false` trên URL vẫn parse ra `true`. Đổi sang đúng pattern đã
  // sửa cho `QueryAssetDTO`/`QueryAssetCategoryDTO` (DEV-035): enum
  // "true"/"false" rồi transform thủ công.
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});
