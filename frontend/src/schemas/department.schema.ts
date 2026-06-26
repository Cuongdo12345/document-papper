// src/schemas/department.schema.ts
//
// Nguồn: DEPARTMENT_MODULE_ANALYSIS.md §14 (Validation Rules — đã chốt)
// Nguyên tắc: Validate tối thiểu những gì xác nhận được — để backend xử lý phần còn lại
//
// ✅ Validate ở FE: required + trim() cho code và name
// ❌ Không validate ở FE: maxLength, pattern, minLength, unique
//    Lý do: Không có trong bất kỳ tài liệu nào — để server trả 400 nếu vi phạm
//           Tự đặt rule sai sẽ chặn input hợp lệ mà backend chấp nhận
//
// ⚠️ Uppercase transform: tại onChange input, KHÔNG tại schema
//    Lý do: Zod .transform() chạy lúc submit — uppercase phải hiện ngay khi gõ (UX)
//    Nguồn: PROJECT_UNDERSTANDING.md SCR-16 "code (auto uppercase)"

import { z } from 'zod';

// ─── Department Form Schema ────────────────────────────────────────────────────

export const departmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Mã phòng ban không được để trống'),

  name: z
    .string()
    .trim()
    .min(1, 'Tên phòng ban không được để trống'),
});

// ─── Inferred Type ─────────────────────────────────────────────────────────────

export type DepartmentFormValues = z.infer<typeof departmentSchema>;

// ─── Validator Helper ──────────────────────────────────────────────────────────

/**
 * AntD Form validator helper — theo đúng pattern auth.schema.ts
 * Dùng trong Form.Item rules[]:
 *
 * rules={[{ validator: createDepartmentValidator('code') }]}
 */
export const createDepartmentValidator =
  (field: keyof DepartmentFormValues) =>
  async (_: unknown, value: unknown) => {
    const result = departmentSchema.shape[field].safeParse(value);
    if (!result.success) {
      throw new Error(result.error.issues[0]?.message);
    }
  };
