import { z } from "zod";
import { objectId } from "../common.dto";

/**
 * ⚠️ LƯU Ý MERGE: file `rbac.dto.ts` trước đây ĐÃ TỒN TẠI (route import
 * `GetPermissionsQueryDTO`/`GetRolesQueryDTO`/`GetPoliciesQueryDTO` từ đây),
 * nhưng nội dung gốc KHÔNG được cung cấp ở các lượt trước — 3 Query DTO dưới
 * đây được TÁI DỰNG dựa theo đúng field mà `rbac.service.ts` đang xử lý
 * (page, limit, sortBy, order, keyword, resource, action). Nếu file gốc đã
 * có sẵn 3 DTO này với nội dung khác, hãy GIỮ BẢN GỐC cho phần Query và chỉ
 * thêm phần "BODY DTO — MỚI" ở dưới vào file thật.
 */

const paginationBase = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  order: z.enum(["asc", "desc"]).default("desc"),
};

export const GetPermissionsQueryDTO = z.object({
  ...paginationBase,
  sortBy: z
    .enum(["createdAt", "name", "resource", "action"])
    .default("createdAt"),
  keyword: z.string().max(100).optional(),
  resource: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
});

export const GetRolesQueryDTO = z.object({
  ...paginationBase,
  sortBy: z.enum(["createdAt", "name"]).default("createdAt"),
  keyword: z.string().max(100).optional(),
});

export const GetPoliciesQueryDTO = z.object({
  ...paginationBase,
  sortBy: z
    .enum(["createdAt", "name", "resource", "action"])
    .default("createdAt"),
  keyword: z.string().max(100).optional(),
  resource: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
});

/* =====================================================================
   BODY DTO — MỚI
   =====================================================================
   Trước đây KHÔNG có DTO nào cho body của các route POST/PUT (Permission/
   Role/Policy) — đây chính là nguyên nhân gốc cho phép mass assignment
   (B13): `Object.assign(role, req.body)` nhận thẳng bất kỳ field nào,
   kể cả `permissions`. Các DTO dưới đây CỐ TÌNH KHÔNG cho phép field
   `permissions` ở Role — muốn đổi `permissions` của role phải qua đúng
   `AssignPermissionsDTO` + route `/roles/:id/assign-permissions` (có
   permission riêng `ROLE_ASSIGN_PERMISSIONS`).
===================================================================== */

// ---- Permission ----
export const CreatePermissionDTO = z.object({
  name: z.string().trim().min(1, "Tên permission không được để trống").max(100),
  resource: z.string().trim().min(1, "Resource không được để trống").max(100),
  action: z.string().trim().min(1, "Action không được để trống").max(100),
  description: z.string().trim().max(500).optional(),
});

export const UpdatePermissionDTO = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    resource: z.string().trim().min(1).max(100).optional(),
    action: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Cần ít nhất 1 field để cập nhật",
  });

// ---- Role ----
// CỐ TÌNH chỉ có `name` — KHÔNG có `permissions`. Đây chính là điểm vá B13.
export const CreateRoleDTO = z.object({
  name: z.string().trim().min(1, "Tên role không được để trống").max(100),
});

export const UpdateRoleDTO = z.object({
  name: z.string().trim().min(1, "Tên role không được để trống").max(100),
});

export const AssignPermissionsDTO = z.object({
  permissionIds: z
    .array(objectId("Permission ID không hợp lệ"))
    .min(1, "Cần ít nhất 1 permission"),
});

// ---- Policy ----
export const CreatePolicyDTO = z.object({
  name: z.string().trim().min(1, "Tên policy không được để trống").max(100),
  resource: z.string().trim().min(1, "Resource không được để trống").max(100),
  action: z.string().trim().min(1, "Action không được để trống").max(100),
  // Giới hạn độ dài — policy.condition được PARSE bằng evaluator tự viết
  // (không eval/Function), nhưng vẫn nên chặn input quá dài ở tầng DTO để
  // giảm tải cho tokenizer/parser với input cố tình rất lớn.
  condition: z
    .string()
    .trim()
    .min(1, "Condition không được để trống")
    .max(1000),
});

export const UpdatePolicyDTO = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    resource: z.string().trim().min(1).max(100).optional(),
    action: z.string().trim().min(1).max(100).optional(),
    condition: z.string().trim().min(1).max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Cần ít nhất 1 field để cập nhật",
  });
