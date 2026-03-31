import { z } from "zod";

// Nếu bạn có role enum → nên convert sang const array
export const UserRoles = ["ADMIN", "STAFF", "USER"] as const;
export type UserRole = typeof UserRoles[number];

export const CreateUserDTO = z.object({
  username: z.string().min(6, "Tên tối thiểu 6 ký tự").regex(/^[a-zA-Z0-9_]+$/, "Username chỉ chứa chữ, số, _"),
  password: z.string().min(6, "Password tối thiểu 6 ký tự"),
  fullName: z.string().min(1, "Tên không được để trống"),
  role: z.enum(UserRoles).optional(),
});

export const UpdateUserDTO = z.object({
  fullName: z.string().min(1).optional(),
  username: z.string().min(6).optional(),
  role: z.enum(UserRoles).optional(),
  isActive: z.boolean().optional(),
  
});

// export const ChangePasswordDTO = z.object({
//   oldPassword: z.string().min(6),
//   newPassword: z.string().min(6),
// });

export const ChangePasswordDTO = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Password không khớp",
  path: ["confirmPassword"],
});

export const QueryUserDTO = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
  keyword: z.string().optional(),
  role: z.enum(UserRoles).optional(),
});