import { z } from "zod";

export const LoginDTO = z.object({
  username: z.string().trim().min(3, "Username tối thiểu 3 ký tự").max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6, "Password tối thiểu 6 ký tự"),
});

export const RegisterDTO = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(6),
  confirmPassword: z.string(),
  fullName: z.string().trim().min(1),
}).refine(data => data.password === data.confirmPassword, {
message: "Password không khớp",
  path: ["confirmPassword"],
});

export const RefreshTokenDTO = z.object({
  refreshToken: z.string().min(1),
});