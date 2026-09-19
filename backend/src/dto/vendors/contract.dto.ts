// dto/vendors/contract.dto.ts
//
// Roadmap B4 (2026-09-16).
import { z } from "zod";
import { objectId } from "../common.dto";

const dateRangeRefine = (data: { startDate: Date; endDate: Date }) => data.endDate > data.startDate;

export const CreateContractDTO = z
  .object({
    vendor: objectId("Vendor id không hợp lệ"),
    assets: z.array(objectId("Asset id không hợp lệ")).min(1, "Chọn ít nhất 1 tài sản"),
    contractNumber: z.string().trim().optional(),
    title: z.string().trim().min(1, "Tên hợp đồng không được để trống"),
    description: z.string().trim().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine(dateRangeRefine, { message: "Ngày kết thúc phải sau ngày bắt đầu", path: ["endDate"] });

/**
 * CHỦ Ý KHÔNG có `status` — chỉ đổi qua đúng hành động nghiệp vụ (`cancel`),
 * cùng nguyên tắc `UpdateMaintenancePlanDTO`. Không cho sửa `vendor` (đổi
 * NCC là "ký lại hợp đồng khác", nghiệp vụ khác — tạo hợp đồng mới thay vì
 * sửa).
 */
export const UpdateContractDTO = z
  .object({
    assets: z.array(objectId("Asset id không hợp lệ")).min(1, "Chọn ít nhất 1 tài sản").optional(),
    contractNumber: z.string().trim().optional(),
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate > data.startDate, {
    message: "Ngày kết thúc phải sau ngày bắt đầu",
    path: ["endDate"],
  });

export const CancelContractDTO = z.object({
  cancelReason: z.string().trim().optional(),
});

export const QueryContractsDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  vendor: objectId("Vendor id không hợp lệ").optional(),
  asset: objectId("Asset id không hợp lệ").optional(),
  // ⚠️ SỬA (2026-09-16, user báo lọc trạng thái không có "Đã hết hạn"): `status`
  // raw DB chỉ có "active"/"cancelled" — hợp đồng "còn hiệu lực" VÀ "đã hết
  // hạn nhưng chưa gia hạn" đều cùng lưu `status="active"` (chỉ khác nhau ở
  // `isExpired`, field TÍNH THÊM không lưu DB — xem `withIsExpired`). Thêm
  // "expired" làm giá trị lọc RIÊNG (không phải giá trị enum thật của
  // `Contract.status`) để khớp đúng 3 trạng thái hiển thị trên UI
  // (`contractStatusBadge`: Còn hiệu lực / Đã hết hạn / Đã huỷ) — xử lý dịch
  // sang filter DB thật ở `getAllContractsService`.
  status: z.enum(["active", "cancelled", "expired"]).optional(),
  expiringWithinDays: z.coerce.number().int().min(1).optional(),
});
