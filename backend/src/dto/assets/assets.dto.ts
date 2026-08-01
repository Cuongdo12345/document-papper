// dto/assets.dto.ts
import { z } from "zod";
import { objectId } from "../common.dto";
import { AssetStatus } from "../../models/assets/asset.model";

/* =====================================================================
   ASSET CATEGORY
===================================================================== */

export const CreateAssetCategoryDTO = z.object({
  code: z.string().trim().min(1, "Mã danh mục không được để trống"),
  name: z.string().trim().min(1, "Tên danh mục không được để trống"),
  parentCategory: objectId("parentCategory không hợp lệ").optional(),
  defaultWarrantyMonths: z.coerce.number().int().min(0).optional(),
});

export const UpdateAssetCategoryDTO = z.object({
  name: z.string().trim().min(1).optional(),
  parentCategory: objectId("parentCategory không hợp lệ").optional(),
  defaultWarrantyMonths: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const QueryAssetCategoryDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
  keyword: z.string().trim().optional(),
});

/* =====================================================================
   ASSET
===================================================================== */

export const CreateAssetDTO = z.object({
  category: objectId("category không hợp lệ"),
  department: objectId("department không hợp lệ"),

  name: z.string().trim().min(1, "Tên tài sản không được để trống"),
  serialNumber: z.string().trim().optional(),
  model: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  location: z.string().trim().optional(),

  purchaseDate: z.coerce.date().optional(),
  purchasePrice: z.coerce.number().nonnegative().optional(),
  warrantyExpiredAt: z.coerce.date().optional(),
  supplier: z.string().trim().optional(),

  specs: z.record(z.string(), z.any()).optional(),
});

/**
 * UpdateAssetDTO — CHỦ Ý KHÔNG cho sửa `status`/`assignedTo`/`department`
 * qua route update thông thường. Các trường này thay đổi trạng thái vòng
 * đời tài sản (cấp phát/thu hồi/thanh lý) nên phải đi qua endpoint/luồng
 * nghiệp vụ riêng (Giai đoạn 2 — assign/transfer) để còn ghi lại
 * `AssetAssignmentHistory` và validate điều kiện chuyển trạng thái, thay vì
 * cho phép client tự PATCH thẳng field nhạy cảm này — cùng tinh thần
 * whitelist đã áp dụng ở `documents.constants.ts` / `rbac.constants.ts`.
 */
export const UpdateAssetDTO = z.object({
  category: objectId("category không hợp lệ").optional(),
  name: z.string().trim().min(1).optional(),
  serialNumber: z.string().trim().optional(),
  model: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  location: z.string().trim().optional(),

  purchaseDate: z.coerce.date().optional(),
  purchasePrice: z.coerce.number().nonnegative().optional(),
  warrantyExpiredAt: z.coerce.date().optional(),
  supplier: z.string().trim().optional(),

  specs: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
});

export const QueryAssetDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
  keyword: z.string().trim().optional(),
  department: objectId("department không hợp lệ").optional(),
  category: objectId("category không hợp lệ").optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  sortBy: z.string().default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/* =====================================================================
   ASSET ASSIGNMENT (Giai đoạn 2 — cấp phát / luân chuyển / thu hồi)
===================================================================== */
 
/**
 * AssignAssetDTO — cấp phát tài sản từ kho (IN_STOCK/RESERVED) cho 1
 * khoa/phòng, kèm theo tuỳ chọn gán cho 1 user cụ thể trong khoa đó.
 * `toDepartment` bắt buộc vì cấp phát luôn phải xác định rõ tài sản
 * thuộc quản lý của khoa/phòng nào.
 */
export const AssignAssetDTO = z.object({
  toDepartment: objectId("toDepartment không hợp lệ"),
  toUser: objectId("toUser không hợp lệ").optional(),
  reason: z.string().trim().optional(),
});
 
/**
 * TransferAssetDTO — luân chuyển tài sản ĐANG SỬ DỤNG (IN_USE) sang
 * khoa/phòng khác và/hoặc người dùng khác.
 *
 * `toUser` cho phép truyền chuỗi rỗng `""` để CHỦ Ý gỡ user hiện tại
 * (tài sản chuyển về do khoa quản lý chung, không gắn cá nhân cụ thể) —
 * khác với KHÔNG truyền field này (giữ nguyên user đang gán). Xem thêm
 * comment trong `assetAssignment.service.ts`.
 */
export const TransferAssetDTO = z
  .object({
    toDepartment: objectId("toDepartment không hợp lệ").optional(),
    toUser: z
      .union([objectId("toUser không hợp lệ"), z.literal("")])
      .optional(),
    reason: z.string().trim().optional(),
  })
  .refine((data) => data.toDepartment !== undefined || data.toUser !== undefined, {
    message: "Phải cung cấp ít nhất toDepartment hoặc toUser để luân chuyển",
  });
 
/**
 * ReturnAssetDTO — thu hồi tài sản về kho (IN_STOCK), gỡ `assignedTo`.
 * `toDepartment` tuỳ chọn — nếu không truyền thì giữ nguyên `department`
 * hiện tại của asset (kho mặc định là chính khoa đang quản lý).
 */
export const ReturnAssetDTO = z.object({
  toDepartment: objectId("toDepartment không hợp lệ").optional(),
  reason: z.string().trim().optional(),
});

export const QueryAssetAssignmentHistoryDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(20),
});