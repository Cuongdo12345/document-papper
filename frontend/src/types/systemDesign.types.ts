/**
 * DEV-073/FE-24 (2026-09-21) — khớp response THẬT của `GET /api/system-design`
 * (`backend/src/services/systemDesign/systemDesign.service.ts`), không suy đoán field.
 */

export interface SystemDesignRelatedDoc {
  /** Đường dẫn repo-relative, VD "docs/development/tasks/DEV-057.md". */
  path: string;
  /** URL GitHub blob thật — mở tab mới khi click. */
  url: string;
}

export interface SystemDesignModule {
  name: string;
  models: string[];
  /** DEV-074 — chỉ có khi module này có entry trong `moduleDescriptions.ts` (backend). */
  description?: string;
  /** DEV-074 — cùng điều kiện với `description`. */
  features?: string[];
  /** DEV-074 — luôn có (mảng rỗng nếu không tìm thấy task nào nhắc module này). */
  relatedDocs: SystemDesignRelatedDoc[];
}

export interface SystemDesignModel {
  name: string;
  module: string;
  collection: string;
  fields: string[];
}

export interface SystemDesignRelationship {
  model: string;
  /** Tên field — hậu tố "[]" nếu là mảng, có thể lồng dạng "steps[].approvedBy" nếu ref nằm trong subdocument. */
  field: string;
  /** Tên model đích. */
  ref: string;
}

export interface SystemDesignData {
  totalModels: number;
  modules: SystemDesignModule[];
  models: SystemDesignModel[];
  relationships: SystemDesignRelationship[];
}
