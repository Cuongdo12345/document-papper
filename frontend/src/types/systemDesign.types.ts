/**
 * DEV-073/FE-24 (2026-09-21) — khớp response THẬT của `GET /api/system-design`
 * (`backend/src/services/systemDesign/systemDesign.service.ts`), không suy đoán field.
 */

export interface SystemDesignModule {
  name: string;
  models: string[];
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
