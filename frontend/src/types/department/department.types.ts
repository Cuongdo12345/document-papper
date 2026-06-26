// src/types/department.types.ts
//
// Nguồn: DEPARTMENT_MODULE_ANALYSIS.md §13 · STATE_MAPPING_v2.md §7.4
// Confirmed: Department model KHÔNG có field `isActive` (DEPARTMENT_AUDIT_REPORT.md)
// Fields xác nhận: _id, code, name, createdAt, updatedAt
// KHÔNG có: isActive, Disable/Restore, StatusBadge

// ─── Domain Model ─────────────────────────────────────────────────────────────

/**
 * Department entity — khớp trực tiếp với department.model.ts (Audit confirmed)
 * KHÔNG có field `isActive` — hard delete là cơ chế loại bỏ duy nhất
 */
export interface Department {
  _id: string;
  code: string;   // uppercase, unique — dùng làm prefix trong documentCode
  name: string;
  createdAt: string; // ISO string sau JSON serialize
  updatedAt: string;
}

// ─── Select / Dropdown ────────────────────────────────────────────────────────

/**
 * Dạng rút gọn dùng trong Select phòng ban (Dashboard Tab 2/5/6, User form, Document form)
 * Interface contract bắt buộc — useDepartmentList phải trả về data compatible với type này
 * Nguồn: FRONTEND_MEMORY_v2.md §19 — "Đảm bảo hook trả về DepartmentOption[]-compatible"
 */
export interface DepartmentOption {
  value: string; // Department._id
  label: string; // Department.name
}

// ─── List Response ─────────────────────────────────────────────────────────────

/**
 * Pagination metadata — dùng chung cho tất cả paginated response
 * Nguồn: STATE_MAPPING_v2.md §7.4 (Audit confirmed — khác với v1 "total" đơn giản)
 */
export interface DepartmentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Response shape của GET /api/departments (với pagination)
 * Nguồn: STATE_MAPPING_v2.md §7.4 Changelog #2 — đã sửa từ { data, total } → { data, pagination }
 */
export interface DepartmentListResponse {
  data: Department[];
  pagination: DepartmentPagination;
}

// ─── Detail Response ───────────────────────────────────────────────────────────

/**
 * Response shape của GET /api/departments/:id
 * Trả về Department object trực tiếp (không bọc { data: ... })
 * Nguồn: DEPARTMENT_MODULE_ANALYSIS.md §13
 */
export type DepartmentDetailResponse = Department;

// ─── Mutation Responses ────────────────────────────────────────────────────────

/**
 * Response shape của POST /api/departments (Create)
 * Nguồn: DEPARTMENT_MODULE_ANALYSIS.md §13
 */
export interface DepartmentCreateResponse {
  message: string;
  data: Department;
}

/**
 * Response shape của PUT /api/departments/:id (Update)
 * Trả về Department object trực tiếp
 * Nguồn: DEPARTMENT_MODULE_ANALYSIS.md §13
 */
export type DepartmentUpdateResponse = Department;

/**
 * Response shape của DELETE /api/departments/:id
 * Nguồn: DEPARTMENT_MODULE_ANALYSIS.md §13
 */
export interface DepartmentDeleteResponse {
  message: string;
}

// ─── Error Response ────────────────────────────────────────────────────────────

/**
 * Shape lỗi từ Department API
 * ⚠️ BUG STATUS CODE: GET detail luôn trả 404, mutation luôn trả 400 — bất kể lỗi thực chất
 * Luôn đọc error.response?.data?.message, không phân loại theo status code
 * Nguồn: STATE_MAPPING_v2.md §7.4 Changelog #10
 */
export interface DepartmentApiError {
  message: string;
}
