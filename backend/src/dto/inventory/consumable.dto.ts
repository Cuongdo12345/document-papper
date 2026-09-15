// dto/inventory/consumable.dto.ts
//
// Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15).
import { z } from "zod";
import { objectId } from "../common.dto";
import { ConsumableTransactionType } from "../../interfaces/inventory/consumableTransaction.interface";

export const CreateConsumableItemDTO = z.object({
  name: z.string().trim().min(1, "Tên vật tư không được để trống"),
  unit: z.string().trim().min(1, "Đơn vị tính không được để trống"),
  category: z.string().trim().optional(),
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
  category: z.string().trim().optional(),
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
  isActive: z.coerce.boolean().optional(),
  lowStockOnly: z.coerce.boolean().optional(),
});

export const QueryConsumableTransactionsDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
