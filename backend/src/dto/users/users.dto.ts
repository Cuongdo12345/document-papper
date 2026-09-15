import { z } from "zod";

// Nếu bạn có role enum → nên convert sang const array
// export const UserRoles = ["ADMIN", "IT", "USER"] as const;
// export type UserRole = typeof UserRoles[number];

/**
 * Mongo ObjectId — dùng lại cho role/department id ở nhiều DTO
 */
const ObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Id không hợp lệ");

export const CreateUserDTO = z.object({
  username: z
    .string()
    .min(5, "Tên tối thiểu 5 ký tự")
    .regex(/^[a-zA-Z0-9_]+$/, "Username chỉ chứa chữ, số, _"),
  // DEV-021/SEC-02: min(5) → min(8) — đặt mật khẩu MỚI (admin tạo user),
  // không phải xác thực mật khẩu cũ nên nâng ngưỡng an toàn.
  password: z.string().min(8, "Password tối thiểu 8 ký tự"),
  fullName: z.string().min(1, "Tên không được để trống"),
  // role là object { name, ... } khi đã populate ở phía service (service hiện đọc role.name),
  // nhưng input của client chỉ cần gửi roleId — validate roleId ở đây.
  role: ObjectIdSchema,
  department: ObjectIdSchema.optional(),
});

export const UpdateUserDTO = z.object({
  fullName: z.string().min(1).optional(),
  username: z
    .string()
    .min(5)
    .regex(/^[a-zA-Z0-9_]+$/, "Username chỉ chứa chữ, số, _")
    .optional(),
  role: ObjectIdSchema.optional(),
  department: ObjectIdSchema.optional(),
  isActive: z.boolean().optional(),
});

/**
 * ASSIGN ROLE (TASK-002, Việc 2) — DTO cho endpoint riêng gán role cho user,
 * wire lại `assignRole()` (users.service.ts) vốn trước đây là dead code.
 */
export const AssignRoleDTO = z.object({
  roleId: ObjectIdSchema,
  resetPermissions: z.boolean().optional(),
});

export const ChangePasswordDTO = z
  .object({
    // `oldPassword` xác thực mật khẩu CŨ đã tồn tại — GIỮ NGUYÊN min(5) (nâng
    // ngưỡng ở đây sẽ chặn user có mật khẩu 5-7 ký tự tạo dưới policy cũ tự
    // đổi mật khẩu). DEV-021/SEC-02: chỉ nâng `newPassword` (min(5)→min(8)).
    oldPassword: z.string().min(5),
    newPassword: z.string().min(8, "Password mới tối thiểu 8 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password không khớp",
    path: ["confirmPassword"],
  });

/**
 * RESET PASSWORD BY ADMIN (DEV-021/SEC-02) — `PATCH /api/users/reset-password/:id`
 * trước đây KHÔNG có validateBody/DTO nào — controller đọc thẳng
 * `req.body.newPassword` (`any`, không giới hạn độ dài/kiểu dữ liệu). Thêm
 * DTO tối thiểu, cùng ngưỡng min(8) với các luồng đặt mật khẩu mới khác.
 */
export const ResetPasswordByAdminDTO = z.object({
  newPassword: z.string().min(8, "Password mới tối thiểu 8 ký tự"),
});

/**
 * GET USERS — Query DTO cho danh sách user (filter + pagination + sort)
 *
 * Lưu ý: req.query luôn là string (hoặc string[]) ở Express, nên các field số/boolean
 * phải dùng z.coerce hoặc z.string().transform(...) để convert đúng type trước khi
 * đưa vào service. Sau khi qua middleware validate, service không cần parseInt/check
 * lại nữa — service chỉ còn nhận giá trị đã đúng type.
 */
const SORTABLE_FIELDS = [
  "createdAt",
  "updatedAt",
  "username",
  "fullName",
] as const;

export const GetUsersQueryDTO = z
  .object({
    page: z.coerce.number().int().min(1, "page phải >= 1").default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1, "limit phải >= 1")
      .max(100, "limit tối đa 100")
      .default(10),

    role: ObjectIdSchema.optional(),

    department: ObjectIdSchema.optional(),

    isActive: z
      .enum(["true", "false"], {
        message: "isActive phải là 'true' hoặc 'false'",
      })
      .optional(),

    keyword: z
      .string()
      .trim()
      .min(1, "keyword không được rỗng")
      .max(100, "keyword tối đa 100 ký tự")
      .optional(),

    sortBy: z
      .enum(SORTABLE_FIELDS, {
        message: `sortBy phải là một trong: ${SORTABLE_FIELDS.join(", ")}`,
      })
      .default("createdAt"),

    order: z
      .enum(["asc", "desc"], { message: "order phải là 'asc' hoặc 'desc'" })
      .default("desc"),

    fromDate: z
      .string()
      .refine(
        (v) => !Number.isNaN(Date.parse(v)),
        "fromDate không đúng định dạng ngày",
      )
      .optional(),

    toDate: z
      .string()
      .refine(
        (v) => !Number.isNaN(Date.parse(v)),
        "toDate không đúng định dạng ngày",
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.fromDate && data.toDate) {
        return (
          new Date(data.fromDate).getTime() <= new Date(data.toDate).getTime()
        );
      }
      return true;
    },
    { message: "fromDate phải nhỏ hơn hoặc bằng toDate", path: ["fromDate"] },
  );

export type GetUsersQuery = z.infer<typeof GetUsersQueryDTO>;
