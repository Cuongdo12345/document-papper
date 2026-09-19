/**
 * Type dùng chung toàn app — KHÔNG duplicate ở từng domain.
 * Nguồn: docs/frontend/ERROR_HANDLING.md, API_REFERENCE.md, FE_FOUNDATION_SPEC.md Mục 12.
 */

/** Shape chuẩn phổ biến nhất (đa số domain) — {success,message?,data,pagination?}. */
export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
  pagination?: Pagination;
}

/** Pagination — field `totalPages` đã thống nhất tên toàn hệ thống (DEV-025). */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Shape lỗi chuẩn qua error.middleware.ts — KHÔNG áp dụng cho domain Upload (xem parseApiError). */
export interface ApiErrorResponseStandard {
  success: false;
  message: string;
  errorCode: string;
  /** Zod (errorCode="BAD_REQUEST") -> ZodIssueLike[]; Mongoose (errorCode="VALIDATION_ERROR") -> string[]. */
  details?: ZodIssueLike[] | string[];
}

export interface ZodIssueLike {
  code: string;
  path: (string | number)[];
  message: string;
}

/**
 * [MỚI 2026-09-16, DEV-060] Kết quả `POST .../bulk-delete` — khớp
 * `BulkDeleteResult` (backend `shared/utils/bulkDelete.util.ts`). 1 vài id
 * có thể xoá thất bại (VD còn tham chiếu) trong khi các id khác vẫn xoá
 * được — KHÔNG phải tất-cả-hoặc-không-gì-cả.
 */
export interface BulkDeleteResult {
  deletedIds: string[];
  failed: { id: string; message: string }[];
}

/** Kết quả `parseApiError()` — đã chuẩn hoá, dùng thống nhất ở UI. */
export interface ParsedApiError {
  message: string;
  errorCode: string;
  /** Có giá trị CHỈ khi lỗi 400 BAD_REQUEST (Zod) — field-level error mapping. */
  fieldErrors?: { path: string; message: string }[];
  /** Có giá trị khi lỗi VALIDATION_ERROR (Mongoose) — danh sách message thuần. */
  messages?: string[];
  /** Status HTTP gốc, undefined nếu network error/timeout (không có response). */
  status?: number;
}
