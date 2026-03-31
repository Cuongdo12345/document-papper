// =========================
// 1. constants/workflow.ts
// =========================

export const DOCUMENT_STATUS = [
  "PENDING",
  "IN_PROGRESS",
  "DONE",
] as const;

export type DocumentStatus = typeof DOCUMENT_STATUS[number];

export const DOCUMENT_WORKFLOW: Record<DocumentStatus, DocumentStatus[]> = {
  PENDING: ["IN_PROGRESS"],
  IN_PROGRESS: ["DONE"],
  DONE: [],
};

export const STATUS_PERMISSION: Record<DocumentStatus, string[]> = {
  PENDING: ["ADMIN", "USER"],
  IN_PROGRESS: ["USER", "ADMIN"],
  DONE: ["ADMIN"],
};