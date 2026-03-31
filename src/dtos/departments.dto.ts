// =========================
// 4. department.dto.ts
// =========================
import { z } from "zod";

export const CreateDepartmentDTO = z.object({
  name: z.string().trim().min(1, "Tên phòng ban không được để trống"),
  code: z.string().trim().min(1),
  description: z.string().optional(),
});

export const UpdateDepartmentDTO = z.object({
  name: z.string().trim().min(1).optional(),
  code: z.string().trim().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const QueryDepartmentDTO = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
  keyword: z.string().optional(),
});