import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(3),
  fullName: z.string().min(6),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "DEPARTMENT"]),
  department: z.string().optional(),
});

export const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  fullName: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "DEPARTMENT"]).optional(),
  department: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
