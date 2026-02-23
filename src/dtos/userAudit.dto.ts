// import { z } from "zod";

// export const getAuditLogsQuerySchema = z.object({
//   action: z.string().optional(),
//   performedBy: z.string().optional(),
//   user: z.string().optional(),

//   fromDate: z.string().optional(),
//   toDate: z.string().optional(),

//   page: z
//     .string()
//     .optional()
//     .transform((v) => (v ? parseInt(v) : 1))
//     .refine((v) => v > 0, "page phải > 0"),

//   limit: z
//     .string()
//     .optional()
//     .transform((v) => (v ? parseInt(v) : 10))
//     .refine((v) => v > 0 && v <= 100, "limit từ 1 - 100"),
// });

// export type GetAuditLogsQueryDTO = z.infer<
//   typeof getAuditLogsQuerySchema
// >;
