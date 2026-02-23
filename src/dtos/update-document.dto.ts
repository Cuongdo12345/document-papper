// import { z } from "zod";

// export const UpdateDocumentSchema = z.object({
//   title: z.string().min(5).optional(),
//   content: z.string().optional(),

//   meta: z.record(z.string(), z.any()).optional(),

//   items: z
//     .array(
//       z.object({
//         deviceName: z.string(),
//         quantity: z.number().min(1),
//         description: z.string().optional(),
//       })
//     )
//     .optional(),

//   participants: z
//     .object({
//       departmentRepresentative: z.string().optional(),
//       inspector: z.string().optional(),
//     })
//     .optional(),

//   checkResult: z.string().optional(),
// });

// export type UpdateDocumentDTO = z.infer<
//   typeof UpdateDocumentSchema
// >;
