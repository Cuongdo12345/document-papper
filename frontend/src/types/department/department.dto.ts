// src/types/department.dto.ts
//
// Nguồn: STATE_MAPPING_v2.md §7.4 · DEPARTMENT_MODULE_ANALYSIS.md §10, §11, §12, §13
// DTO = Data Transfer Object — shape của params/payload gửi lên API

// ─── Shared ───────────────────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc';

// ─── List Params (Query Params) ────────────────────────────────────────────────

/**
 * Query params cho GET /api/departments
 * Nguồn: STATE_MAPPING_v2.md §7.4 (Audit confirmed — khác hoàn toàn v1 không có params)
 *
 * Default values (từ Audit + STATE_MAPPING_v2.md):
 *   sortBy  → 'code'
 *   order   → 'asc'
 *   page    → 1
 *   limit   → preference.store.defaultPageSize (20)
 *
 * Filter behavior:
 *   keyword → search cả code + name, regex $or, case-insensitive, substring
 *   code    → filter riêng theo mã, substring case-insensitive
 *   name    → filter riêng theo tên, substring case-insensitive
 */
export interface GetDepartmentsParams {
  keyword?: string;
  code?: string;
  name?: string;
  page?: number;
  limit?: number;
  sortBy?: string;  // default 'code' — whitelist đầy đủ NEED MORE ANALYSIS
  order?: SortOrder; // default 'asc'
  [key: string]: unknown;
} 

// ─── Create Payload ────────────────────────────────────────────────────────────

/**
 * Body cho POST /api/departments
 * Nguồn: DEPARTMENT_MODULE_ANALYSIS.md §13
 * ⚠️ code nên được transform toUpperCase() trước khi gửi (tại onChange input)
 */
export interface CreateDepartmentPayload {
  code: string;
  name: string;
}

// ─── Update Payload ────────────────────────────────────────────────────────────

/**
 * Body cho PUT /api/departments/:id
 * Cả 2 field đều optional — gửi field nào muốn update
 * ⚠️ HTTP method là PUT (không phải PATCH) — xác nhận từ DEPARTMENT_AUDIT_REPORT.md
 * FRONTEND_MEMORY_v2.md §19 ghi nhầm là PATCH — không áp dụng
 */
export interface UpdateDepartmentPayload {
  code?: string;
  name?: string;
}

// ─── Form Values (Zod infer target) ───────────────────────────────────────────

/**
 * Dùng cùng shape cho cả Create Form và Edit Form
 * Được infer từ departmentSchema (xem department.schema.ts)
 * Khai báo lại ở đây để không phụ thuộc vào import schemas/ trong types/
 */
export interface DepartmentFormValues {
  code: string;
  name: string;
}
