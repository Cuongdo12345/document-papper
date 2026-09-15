// dto/assets/assetMaintenancePlan.dto.ts
//
// Roadmap B2 (Lịch bảo trì chủ động, 2026-09-15).
import { z } from "zod";
import { objectId } from "../common.dto";

export const CreateMaintenancePlanDTO = z.object({
  title: z.string().trim().min(1, "Tên kế hoạch không được để trống"),
  description: z.string().trim().optional(),
  scheduledDate: z.coerce.date(),
});

/**
 * CHỦ Ý KHÔNG có `status` — chỉ đổi qua đúng hành động nghiệp vụ
 * (`complete`/`cancel`), không cho PUT thường ghi đè tuỳ ý (cùng nguyên tắc
 * `DOCUMENT_UPDATE_WHITELIST`/`MEDICAL_DEVICE_PROFILE_UPDATE_WHITELIST`).
 */
export const UpdateMaintenancePlanDTO = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  scheduledDate: z.coerce.date().optional(),
});

export const ResolveMaintenancePlanDTO = z.object({
  resolutionNote: z.string().trim().optional(),
});

export const QueryMaintenancePlanHistoryDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const QueryMaintenanceCalendarDTO = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  department: objectId("Department id không hợp lệ").optional(),
});
