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
  password: z.string().min(5, "Password tối thiểu 5 ký tự"),
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

export const ChangePasswordDTO = z
  .object({
    oldPassword: z.string().min(5),
    newPassword: z.string().min(5),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password không khớp",
    path: ["confirmPassword"],
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
