import { z } from "zod";
import { DocumentCategory, DocumentSubType } from "../models/documents/document.model";

export const CreateDocumentDTO = z.object({
  category: z.enum(Object.values(DocumentCategory) as [string, ...string[]]),
  subType: z.enum(Object.values(DocumentSubType) as [string, ...string[]]),
  title: z.string().min(1),
  department: z.string(),
  referenceTo: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateDocumentDTO = z.object({
  title: z.string().min(1).optional(),
  department: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const QueryDocumentDTO = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  category: z.enum(Object.values(DocumentCategory) as [string, ...string[]]),
  subType: z.enum(Object.values(DocumentSubType) as [string, ...string[]]),
  keyword: z.string().optional(),
});