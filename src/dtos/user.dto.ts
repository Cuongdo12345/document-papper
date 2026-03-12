import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(3),
  fullName: z.string().min(6),
  password: z.string().min(5),
  role: z.enum(["ADMIN", "USER", "IT"]),
  department: z.string().optional(),
});

export const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  fullName: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "USER", "IT"]).optional(),
  department: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
