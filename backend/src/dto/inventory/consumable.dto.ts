// dto/inventory/consumable.dto.ts
//
// Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15).
import { z } from "zod";
import { objectId } from "../common.dto";
import { ConsumableTransactionType } from "../../interfaces/inventory/consumableTransaction.interface";
import { ConsumableRequestStatus } from "../../interfaces/inventory/consumableRequest.interface";

export const CreateConsumableItemDTO = z.object({
  name: z.string().trim().min(1, "Tên vật tư không được để trống"),
  unit: z.string().trim().min(1, "Đơn vị tính không được để trống"),
  // ⚠️ SỬA (2026-09-16, user yêu cầu quản lý "Nhóm vật tư" — xem
  // `consumableCategory.interface.ts`): trước là text tự do, giờ ref
  // `ConsumableCategory` — validate tồn tại/active ở service (mirror
  // `department`).
  category: objectId("Nhóm vật tư id không hợp lệ").optional(),
  department: objectId("Department id không hợp lệ"),
  minStockThreshold: z.coerce.number().min(0).default(0),
  // Số lượng tồn kho ban đầu — TUỲ CHỌN, nếu > 0 sẽ tự tạo 1 giao dịch NHẬP
  // ("Tồn kho ban đầu") để lịch sử giao dịch luôn khớp `quantityOnHand`
  // (không cho set thẳng `quantityOnHand` mà bỏ qua lịch sử).
  initialQuantity: z.coerce.number().min(0).default(0),
});

/**
 * CHỦ Ý KHÔNG có `quantityOnHand` — tồn kho CHỈ thay đổi qua giao dịch
 * nhập/xuất (`CreateConsumableTransactionDTO`), không cho PUT ghi đè trực
 * tiếp (cùng nguyên tắc bất biến lịch sử như `DocumentVersion`).
 */
export const UpdateConsumableItemDTO = z.object({
  name: z.string().trim().min(1).optional(),
  unit: z.string().trim().min(1).optional(),
  category: objectId("Nhóm vật tư id không hợp lệ").optional(),
  minStockThreshold: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const CreateConsumableTransactionDTO = z.object({
  type: z.nativeEnum(ConsumableTransactionType),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
  reason: z.string().trim().optional(),
});

export const QueryConsumableItemsDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  department: objectId("Department id không hợp lệ").optional(),
  category: objectId("Nhóm vật tư id không hợp lệ").optional(),
  // ⚠️ SỬA (2026-09-16, cùng bug đã phát hiện ở `QueryVendorsDTO`): trước
  // dùng `z.coerce.boolean()` — chỉ gọi `Boolean(value)`, nên MỌI query
  // string không rỗng (kể cả literal "false") đều coerce thành `true`. FE
  // (`ConsumablesListPage`) gửi thẳng `isActive=false` khi chọn "Đã ngừng"
  // (không lược bỏ như `lowStockOnly`), nên bị lỗi tương tự Vendor: chọn "Đã
  // ngừng" vẫn trả về vật tư đang hoạt động. Đổi đúng pattern đã dùng cho
  // `QueryAssetDTO`/`QueryAssetCategoryDTO`/`QueryVendorsDTO` (DEV-035).
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  // `lowStockOnly` KHÔNG đổi — FE chỉ gửi khi checkbox bật (`checked ||
  // undefined`), không bao giờ gửi literal "false" qua query nên không bị
  // bug này trên thực tế (giữ nguyên để không đổi behavior ngoài scope).
  lowStockOnly: z.coerce.boolean().optional(),
});

export const QueryConsumableTransactionsDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/* =====================================================================
   CONSUMABLE CATEGORY (nhóm vật tư, 2026-09-16) — mirror ĐÚNG
   `CreateAssetCategoryDTO`/`UpdateAssetCategoryDTO`/`QueryAssetCategoryDTO`.
===================================================================== */

export const CreateConsumableCategoryDTO = z.object({
  code: z.string().trim().min(1, "Mã nhóm vật tư không được để trống"),
  name: z.string().trim().min(1, "Tên nhóm vật tư không được để trống"),
  parentCategory: objectId("parentCategory không hợp lệ").optional(),
});

/** CHỦ Ý KHÔNG có `code` (bất biến sau khi tạo) và KHÔNG có `isActive` (đổi qua action Xoá/Khôi phục riêng). */
export const UpdateConsumableCategoryDTO = z.object({
  name: z.string().trim().min(1).optional(),
  parentCategory: objectId("parentCategory không hợp lệ").optional(),
});

export const QueryConsumableCategoryDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  keyword: z.string().trim().optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

/* =====================================================================
   CONSUMABLE REQUEST (Roadmap B8 — Dự trù/đề xuất mua vật tư hàng tháng,
   DEV-067, 2026-09-18). Xem giải thích thiết kế đầy đủ ở
   `interfaces/inventory/consumableRequest.interface.ts`.
===================================================================== */

const REQUEST_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const ConsumableRequestItemDTO = z.object({
  consumableItem: objectId("Vật tư id không hợp lệ"),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
  unitPrice: z.coerce.number().min(0, "Đơn giá không được âm"),
});

export const CreateConsumableRequestDTO = z.object({
  department: objectId("Department id không hợp lệ"),
  requestMonth: z.string().regex(REQUEST_MONTH_REGEX, "requestMonth phải theo định dạng YYYY-MM"),
  items: z.array(ConsumableRequestItemDTO).min(1, "Đề xuất phải có ít nhất 1 vật tư"),
  note: z.string().trim().optional(),
});

/** CHỦ Ý KHÔNG có `department`/`requestMonth` (bất biến sau khi tạo, giống `department` của ConsumableItem) — chỉ sửa được `items`/`note`, và CHỈ khi request đang `PENDING` (service check). */
export const UpdateConsumableRequestDTO = z.object({
  items: z.array(ConsumableRequestItemDTO).min(1, "Đề xuất phải có ít nhất 1 vật tư").optional(),
  note: z.string().trim().optional(),
});

export const QueryConsumableRequestsDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  department: objectId("Department id không hợp lệ").optional(),
  status: z.nativeEnum(ConsumableRequestStatus).optional(),
  requestMonth: z.string().regex(REQUEST_MONTH_REGEX, "requestMonth phải theo định dạng YYYY-MM").optional(),
});
