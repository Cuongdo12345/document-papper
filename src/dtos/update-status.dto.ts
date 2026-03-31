import { z } from "zod";
import { DOCUMENT_STATUS } from "../shared/constants/workflow-docs";

export const UpdateStatusDTO = z.object({
  status: z.enum(DOCUMENT_STATUS),
});

export const updateStatusSchema = z.object({
  body: UpdateStatusDTO,
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});